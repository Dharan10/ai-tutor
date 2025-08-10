from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional


class DocumentMetadata(BaseModel):
    """Schema for document metadata."""
    source: str
    source_type: str
    title: Optional[str] = None
    author: Optional[str] = None
    chunk_index: Optional[int] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None


class DocumentChunk(BaseModel):
    """Schema for document chunks."""
    text: str
    metadata: DocumentMetadata


class IngestRequest(BaseModel):
    """Schema for ingest request."""
    urls: List[str] = []


class IngestResponse(BaseModel):
    """Schema for ingest response."""
    success: bool
    message: str
    document_count: int


class Source(BaseModel):
    """Schema for source information."""
    id: int
    text: str
    source: str
    source_type: str
    title: Optional[str] = None


class AskRequest(BaseModel):
    """Schema for ask request."""
    question: str
    num_chunks: Optional[int] = 5


class AskResponse(BaseModel):
    """Schema for ask response."""
    answer: str
    sources: List[Source]
