from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Any
import hashlib
import time
import numpy as np
import threading
import os
import asyncio

from app.core.config import settings
from app.core.events import log_rag_event, ProcessPhase, EventType


class EmbeddingsProvider:
    """
    Enhanced embeddings provider using sentence-transformers with advanced caching and normalization.
    """
    
    def __init__(self, model_name: str = None, cache_size: int = 3000, persistent_cache: bool = True):
        """
        Initialize the embeddings model with advanced features.
        
        Args:
            model_name: Name of the sentence-transformers model to use
            cache_size: Maximum number of embeddings to cache
            persistent_cache: Whether to persist the cache to disk
        """
        self.model_name = model_name or settings.embeddings_model
        print(f"Loading enhanced embeddings model: {self.model_name}")
        
        # Create cache directory if using persistent cache
        self.persistent_cache = persistent_cache
        self.cache_path = os.path.join(os.path.dirname(settings.vector_store_path), "embeddings_cache.npy")
        
        # Load model
        start_time = time.time()
        self.model = SentenceTransformer(self.model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f} seconds, dimension: {self.embedding_dim}")
        
        # Register embedding model details for explanations
        try:
            asyncio.run(log_rag_event(
                message=f"Embedding model initialized with dimension: {self.embedding_dim}",
                phase=ProcessPhase.SYSTEM,
                event_type=EventType.INFO,
                metadata={"model_name": self.model_name, "dimension": self.embedding_dim},
                include_explanation=False
            ))
        except:
            # Don't fail initialization if logging fails
            pass
        
        # Setup caching for better performance
        self.cache: Dict[str, List[float]] = {}
        self.cache_size = cache_size
        self.cache_hits = 0
        self.total_calls = 0
        self.cache_lock = threading.Lock()  # Thread-safe cache access
        
        # Try to load persistent cache if enabled
        if persistent_cache:
            self._load_cache()
    
    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for a text string"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate embeddings for a single query text with enhanced processing.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        # Preprocess text for better quality
        processed_text = self.preprocess_text(text)
        
        with self.cache_lock:
            self.total_calls += 1
            cache_key = self._get_cache_key(processed_text)
            
            # Check cache first
            if cache_key in self.cache:
                self.cache_hits += 1
                # Print cache stats periodically
                if self.total_calls % 100 == 0:
                    hit_rate = (self.cache_hits / self.total_calls) * 100
                    print(f"Embedding cache hit rate: {hit_rate:.1f}% ({self.cache_hits}/{self.total_calls})")
                return self.cache[cache_key]
        
        # Generate embedding
        start_time = time.time()
        embedding = self.model.encode(processed_text).tolist()
        embedding_time = time.time() - start_time
        
        # Normalize the embedding for better retrieval
        embedding = self.normalize_embedding(embedding)
        
        with self.cache_lock:
            # Manage cache size
            if len(self.cache) >= self.cache_size:
                # LRU-like strategy: remove oldest entries
                keys_to_remove = list(self.cache.keys())[:max(1, self.cache_size // 10)]
                for key in keys_to_remove:
                    self.cache.pop(key)
                
            self.cache[cache_key] = embedding
            
            # Periodically save the cache
            if self.persistent_cache and self.total_calls % 100 == 0:
                self._save_cache()
                
        return embedding
    
    def embed_documents(self, texts: List[str], batch_size: Optional[int] = 32) -> List[List[float]]:
        """
        Generate enhanced embeddings for a batch of documents.
        
        Args:
            texts: List of texts to embed
            batch_size: Optional batch size to use for processing (default 32)
            
        Returns:
            List of normalized embedding vectors
        """
        if not texts:
            return []
        
        # Preprocess all texts
        processed_texts = [self.preprocess_text(text) for text in texts]
        
        with self.cache_lock:
            self.total_calls += len(texts)
            
            # Try to use cache first
            results = []
            texts_to_embed = []
            indices_to_embed = []
            
            # Check which texts are in cache
            for i, text in enumerate(processed_texts):
                cache_key = self._get_cache_key(text)
                if cache_key in self.cache:
                    self.cache_hits += 1
                    results.append(self.cache[cache_key])
                else:
                    texts_to_embed.append(text)
                    indices_to_embed.append(i)
        
        # If we need to embed any texts
        if texts_to_embed:
            start_time = time.time()
            # Use batch processing for better performance
            if batch_size and batch_size < len(texts_to_embed):
                print(f"Processing {len(texts_to_embed)} embeddings in batches of {batch_size}")
                all_embeddings = []
                for i in range(0, len(texts_to_embed), batch_size):
                    batch = texts_to_embed[i:i+batch_size]
                    batch_embeddings = self.model.encode(batch).tolist()
                    # Normalize each embedding
                    batch_embeddings = [self.normalize_embedding(emb) for emb in batch_embeddings]
                    all_embeddings.extend(batch_embeddings)
                    print(f"Processed batch {i//batch_size + 1}/{(len(texts_to_embed)-1)//batch_size + 1}")
            else:
                print(f"Processing {len(texts_to_embed)} embeddings in a single batch")
                all_embeddings = self.model.encode(texts_to_embed).tolist()
                # Normalize each embedding
                all_embeddings = [self.normalize_embedding(emb) for emb in all_embeddings]
                
            embedding_time = time.time() - start_time
            print(f"Generated {len(all_embeddings)} embeddings in {embedding_time:.2f} seconds")
            
            # Build the full result list
            full_results = [None] * len(texts)
            
            # Cache the results
            with self.cache_lock:
                for idx, (i, embedding) in enumerate(zip(indices_to_embed, all_embeddings)):
                    cache_key = self._get_cache_key(processed_texts[i])
                    self.cache[cache_key] = embedding
                    full_results[i] = embedding
                
                # Fill in the cached results
                for result_idx, cached_result in zip([i for i in range(len(texts)) if i not in indices_to_embed], results):
                    full_results[result_idx] = cached_result
                    
                # Save cache periodically
                if self.persistent_cache and len(texts_to_embed) > 10:
                    self._save_cache()
                    
            return full_results
        
        # All embeddings were cached
        return results


    def _load_cache(self):
        """Load embeddings cache from disk"""
        try:
            if os.path.exists(self.cache_path):
                print(f"Loading embeddings cache from {self.cache_path}")
                cache_data = np.load(self.cache_path, allow_pickle=True).item()
                self.cache = cache_data
                print(f"Loaded {len(self.cache)} cached embeddings")
        except Exception as e:
            print(f"Error loading embeddings cache: {e}")
            self.cache = {}
    
    def _save_cache(self):
        """Save embeddings cache to disk"""
        if self.persistent_cache:
            try:
                cache_dir = os.path.dirname(self.cache_path)
                os.makedirs(cache_dir, exist_ok=True)
                np.save(self.cache_path, self.cache)
                print(f"Saved {len(self.cache)} embeddings to cache")
            except Exception as e:
                print(f"Error saving embeddings cache: {e}")
    
    def normalize_embedding(self, embedding: List[float]) -> List[float]:
        """Normalize the embedding vector to unit length"""
        vector = np.array(embedding)
        norm = np.linalg.norm(vector)
        if norm > 0:
            return (vector / norm).tolist()
        return vector.tolist()
    
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for better embedding quality"""
        # Remove excessive whitespace
        text = ' '.join(text.split())
        # Truncate very long texts to model limits (most models can handle ~512 tokens)
        max_chars = 1800  # approximate character limit
        if len(text) > max_chars:
            print(f"Truncating text from {len(text)} chars to {max_chars} chars")
            # Try to break at sentence boundary
            truncate_point = text.rfind('.', 0, max_chars)
            if truncate_point == -1:
                truncate_point = max_chars
            text = text[:truncate_point]
        return text


# Create singleton instance with increased cache size and persistence
embeddings = EmbeddingsProvider(model_name=settings.embeddings_model, cache_size=5000)
