import faiss
import json
import os
import pickle
import time
import numpy as np
from typing import Dict, List, Optional, Any

from app.core.config import settings
from app.core.embeddings import embeddings


class DocumentChunk:
    """Class representing a document chunk with its metadata and embedding."""
    
    def __init__(
        self,
        text: str,
        metadata: Dict[str, Any],
        embedding: Optional[List[float]] = None
    ):
        self.text = text
        self.metadata = metadata
        self.embedding = embedding or []


class VectorStore:
    """
    FAISS vector store implementation for storing and retrieving document chunks.
    Supports session-based isolation where each session has its own vector store.
    """
    
    def __init__(self, directory: str = None):
        """
        Initialize the vector store.
        
        Args:
            directory: Directory path to store the FAISS index and metadata
        """
        self.directory = directory or settings.vector_store_path
        self.session_id = str(int(time.time()))  # Default session ID based on timestamp
        self._update_paths()
        self.dimension = None
        self.index = None
        self.documents: Dict[int, DocumentChunk] = {}
        self.sources: Dict[str, Dict[str, Any]] = {}  # Track ingested source URLs
        self._initialize()
    
    def _update_paths(self):
        """Update file paths based on current session ID."""
        session_dir = os.path.join(self.directory, self.session_id)
        self.session_directory = session_dir
        self.index_path = os.path.join(session_dir, "faiss_index")
        self.metadata_path = os.path.join(session_dir, "metadata.pkl")
        self.sources_path = os.path.join(session_dir, "sources.json")
    
    def _initialize(self):
        """Initialize or load the vector store."""
        # Ensure directory exists
        try:
            os.makedirs(self.session_directory, exist_ok=True)
            print(f"Vector store session directory initialized at: {self.session_directory}")
        except Exception as e:
            print(f"WARNING: Could not create vector store session directory: {e}")
        
        # Load existing store if it exists
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            self._load()
        else:
            print(f"No existing vector store found for session {self.session_id}. Creating a new one.")
            
        # Initialize sources tracking if not loaded
        if not hasattr(self, 'sources') or self.sources is None:
            self.sources = {}
        
    def _load(self):
        """Load the index and metadata from disk."""
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, "rb") as f:
                self.documents = pickle.load(f)
                # Ensure the dimension is set if we have documents
                if self.documents and hasattr(next(iter(self.documents.values())), 'embedding'):
                    self.dimension = len(next(iter(self.documents.values())).embedding)
                    
            # Load sources if available
            if os.path.exists(self.sources_path):
                try:
                    with open(self.sources_path, "r") as f:
                        self.sources = json.load(f)
                    print(f"Loaded {len(self.sources)} source records")
                except json.JSONDecodeError:
                    print("Error loading sources file, creating new one")
                    self.sources = {}
        except (FileNotFoundError, EOFError, pickle.PickleError) as e:
            print(f"Error loading vector store: {e}")
            # Initialize empty state
            self.index = None
            self.documents = {}
    
    def _save(self):
        """Save the index and metadata to disk."""
        try:
            if self.index is not None:
                faiss.write_index(self.index, self.index_path)
                
            with open(self.metadata_path, "wb") as f:
                pickle.dump(self.documents, f)
                
            # Save sources information
            with open(self.sources_path, "w") as f:
                json.dump(self.sources, f, indent=2)
                
            print(f"Vector store saved with {len(self.documents)} documents and {len(self.sources)} sources")
        except Exception as e:
            print(f"ERROR saving vector store: {e}")
    
    def add_documents(self, chunks: List[DocumentChunk]) -> List[int]:
        """
        Add documents to the vector store.
        
        Args:
            chunks: List of DocumentChunk objects to add
            
        Returns:
            List of document IDs
        """
        if not chunks:
            return []
        
        # Track sources being added
        sources_added = {}
        for chunk in chunks:
            source = chunk.metadata.get("source")
            if source:
                if source not in self.sources:
                    # New source - add to tracking
                    self.sources[source] = {
                        "title": chunk.metadata.get("title", "Untitled"),
                        "source_type": chunk.metadata.get("source_type", "unknown"),
                        "chunk_count": 1,
                        "first_added": int(os.path.getmtime(self.directory)) if os.path.exists(self.directory) else int(time.time()),
                        "last_updated": int(time.time())
                    }
                    sources_added[source] = 1
                else:
                    # Update existing source
                    self.sources[source]["chunk_count"] = self.sources[source].get("chunk_count", 0) + 1
                    self.sources[source]["last_updated"] = int(time.time())
                    sources_added[source] = sources_added.get(source, 0) + 1
        
        print(f"Processing {len(chunks)} chunks from {len(sources_added)} sources")
        
        # Generate embeddings if not provided
        texts = []
        docs_to_embed = []
        
        for i, chunk in enumerate(chunks):
            if not chunk.embedding:
                texts.append(chunk.text)
                docs_to_embed.append(i)
        
        if texts:
            try:
                print(f"Generating embeddings for {len(texts)} chunks")
                embeddings_list = embeddings.embed_documents(texts)
                for i, idx in enumerate(docs_to_embed):
                    chunks[idx].embedding = embeddings_list[i]
                print(f"Successfully generated {len(embeddings_list)} embeddings")
            except Exception as e:
                print(f"Error generating embeddings: {e}")
                return []
        
        # Set dimension if not already set
        if self.dimension is None and chunks and chunks[0].embedding:
            self.dimension = len(chunks[0].embedding)
            self.index = faiss.IndexFlatL2(self.dimension)
            print(f"Initialized FAISS index with dimension {self.dimension}")
        
        # Add to index
        if self.index is not None:
            try:
                vectors = [chunk.embedding for chunk in chunks]
                
                # Get current count to use as starting ID
                start_id = 0
                if self.documents:
                    start_id = max(self.documents.keys()) + 1
                
                doc_ids = list(range(start_id, start_id + len(chunks)))
                
                # Convert list of vectors to numpy array for FAISS
                vectors_np = np.array(vectors).astype('float32')
                
                # Normalize vectors
                faiss.normalize_L2(vectors_np)
                
                # Add vectors to index
                self.index.add(vectors_np)
                
                # Store document chunks with metadata
                for i, chunk in enumerate(chunks):
                    self.documents[doc_ids[i]] = chunk
                
                # Save to disk
                self._save()
                
                # Log source stats
                for source, count in sources_added.items():
                    print(f"Added {count} chunks from source: {source}")
                
                return doc_ids
            except Exception as e:
                print(f"Error adding vectors to index: {e}")
        
        return []
        
        return []
    
    def search(self, query: str, k: int = 5) -> List[DocumentChunk]:
        """
        Search for similar documents given a query.
        
        Args:
            query: Query string
            k: Number of results to retrieve
            
        Returns:
            List of DocumentChunk objects
        """
        if self.index is None or not self.documents:
            print("WARNING: Vector store is empty. No documents to search.")
            return []
        
        try:
            # Generate query embedding
            query_embedding = embeddings.embed_query(query)
            
            # Convert to numpy array for FAISS
            import numpy as np
            query_np = np.array([query_embedding]).astype('float32')
            
            # Search index
            faiss.normalize_L2(query_np)
            distances, indices = self.index.search(query_np, k)
            
            # Retrieve documents
            results = []
            for idx in indices[0]:
                if idx >= 0 and idx in self.documents:  # FAISS can return -1 if not enough results
                    results.append(self.documents[idx])
            
            print(f"Found {len(results)} relevant documents for query: '{query[:30]}...'")
            return results
        except Exception as e:
            print(f"ERROR in vector search: {str(e)}")
            return []
    
    def clear(self):
        """Clear the vector store for the current session."""
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)
        if os.path.exists(self.sources_path):
            os.remove(self.sources_path)
        
        self.index = None if self.dimension is None else faiss.IndexFlatL2(self.dimension)
        self.documents = {}
        self.sources = {}
        self._save()
    
    def start_new_session(self):
        """Start a new session with a fresh vector store."""
        self.session_id = str(int(time.time()))
        self._update_paths()
        self.dimension = None  # Reset dimension for new session
        self.index = None
        self.documents = {}
        self.sources = {}
        self._initialize()
        return self.session_id
    
    def get_session_id(self):
        """Get the current session ID."""
        return self.session_id
        
    def get_all_sources(self):
        """Get information about all sources in the current session's vector store."""
        return self.sources


# Create singleton instance
vectorstore = VectorStore()
