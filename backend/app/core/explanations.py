"""
RAG Process Explanations

This module provides educational explanations about each step of the RAG process.
These explanations will be shown to users in the terminal interface to help them
understand what's happening behind the scenes.
"""

from typing import Dict, Optional


class RAGExplanations:
    """
    Contains educational explanations for each phase of the RAG process.
    Each explanation has a brief and detailed version.
    """
    
    # Session explanations
    SESSION = {
        "brief": "Initializing a fresh RAG session",
        "detail": """A new RAG session creates an isolated environment where documents are processed
independently from previous sessions. This ensures that each query is answered
based only on the documents uploaded in the current session."""
    }
    
    # Ingestion explanations
    INGESTION = {
        "brief": "Starting the document ingestion process",
        "detail": """Document ingestion is the first stage of RAG where source documents are 
collected and prepared for processing. This includes validating file formats,
checking URL accessibility, and preparing the content extraction pipeline."""
    }
    
    # Extraction explanations
    EXTRACTION = {
        "brief": "Extracting text content from documents",
        "detail": """Extraction involves pulling raw text from various file formats (PDF, DOCX, HTML, etc.).
The system uses specialized parsers for each format to preserve text structure,
handle different encodings, and maintain relevant document metadata."""
    }
    
    # Chunking explanations
    CHUNKING = {
        "brief": "Breaking documents into manageable chunks",
        "detail": """Chunking divides long documents into smaller, semantically meaningful sections.
Effective chunking balances chunk size and overlap to preserve context while
creating pieces small enough for embedding. Good chunking strategies consider
natural document boundaries like paragraphs and sections."""
    }
    
    # Embedding explanations
    EMBEDDING = {
        "brief": "Converting text chunks to vector embeddings",
        "detail": """Embeddings transform text into dense numerical vectors that capture semantic meaning.
The embedding model ({model_name}) maps similar concepts to similar vector spaces,
allowing semantic search beyond simple keyword matching. The system generates a
{dimension}-dimensional vector for each text chunk."""
    }
    
    # Storage explanations
    STORAGE = {
        "brief": "Storing vectors in the knowledge base",
        "detail": """Vector storage organizes embeddings in an efficient index structure (FAISS)
for fast similarity search. The system maintains metadata connections between
vectors and their source documents to provide attribution in query results."""
    }
    
    # Retrieval explanations
    RETRIEVAL = {
        "brief": "Finding relevant information for the query",
        "detail": """Retrieval uses vector similarity to find content related to the user's question.
The query is embedded into the same vector space as the documents, and the system
performs k-nearest neighbor search to identify the most semantically similar chunks.
This step focuses on recall - finding all potentially relevant information."""
    }
    
    # Generation explanations
    GENERATION = {
        "brief": "Generating an answer based on retrieved context",
        "detail": """The generation phase uses a language model ({model_name}) to synthesize an answer
from the retrieved context chunks. The system constructs a prompt that includes the
question and relevant context, then asks the model to produce a coherent, accurate
response that's grounded in the provided information."""
    }
    
    # Complete explanations
    COMPLETE = {
        "brief": "Process complete",
        "detail": """The RAG pipeline has finished processing. The system has retrieved relevant information
from your documents and generated a response based on that context. This approach
ensures answers are grounded in your specific documents."""
    }
    
    # Maps process phases to explanation dictionaries
    EXPLANATIONS = {
        "session": SESSION,
        "ingestion": INGESTION,
        "extraction": EXTRACTION,
        "chunking": CHUNKING,
        "embedding": EMBEDDING,
        "storage": STORAGE,
        "retrieval": RETRIEVAL,
        "generation": GENERATION,
        "complete": COMPLETE
    }


def get_explanation(phase: str, detail_level: str = "brief", **kwargs) -> Optional[str]:
    """
    Get an educational explanation for a specific RAG phase.
    
    Args:
        phase: The RAG process phase
        detail_level: Level of detail ("brief" or "detail")
        **kwargs: Format variables to include in the explanation
        
    Returns:
        An explanation string or None if not available
    """
    if phase.lower() not in RAGExplanations.EXPLANATIONS:
        return None
        
    explanation = RAGExplanations.EXPLANATIONS[phase.lower()].get(detail_level.lower())
    
    # Format the explanation with any provided variables
    if explanation and kwargs:
        try:
            explanation = explanation.format(**kwargs)
        except KeyError:
            # If formatting fails, just return the unformatted explanation
            pass
            
    return explanation
