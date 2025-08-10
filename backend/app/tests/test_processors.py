import pytest
import os
from pathlib import Path

from app.core.processors import (
    PDFProcessor,
    DocxProcessor,
    WebPageProcessor,
    YouTubeProcessor,
    get_processor
)


def test_get_processor():
    """Test the get_processor function."""
    # Test PDF processor
    processor = get_processor("file.pdf")
    assert isinstance(processor, PDFProcessor)
    
    # Test DOCX processor
    processor = get_processor("file.docx")
    assert isinstance(processor, DocxProcessor)
    
    # Test YouTube processor
    processor = get_processor("https://www.youtube.com/watch?v=123456")
    assert isinstance(processor, YouTubeProcessor)
    
    # Test web processor (default)
    processor = get_processor("https://www.example.com")
    assert isinstance(processor, WebPageProcessor)


def test_youtube_extract_video_id():
    """Test the YouTube video ID extraction."""
    processor = YouTubeProcessor()
    
    # Test various YouTube URL formats
    assert processor.extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert processor.extract_video_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert processor.extract_video_id("https://youtube.com/v/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert processor.extract_video_id("https://youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    
    # Test invalid URL
    assert processor.extract_video_id("https://www.example.com") is None


def test_chunk_text():
    """Test text chunking."""
    processor = WebPageProcessor()
    
    # Test with a short text
    text = "This is a short test text."
    metadata = {"source": "test", "source_type": "test"}
    chunks = processor.chunk_text(text, metadata)
    
    assert len(chunks) == 1
    assert chunks[0]["text"] == text
    assert chunks[0]["metadata"]["source"] == "test"
    
    # Test with a longer text that should be chunked
    long_text = " ".join(["word"] * 1000)  # Approximate 1000 words
    chunks = processor.chunk_text(long_text, metadata)
    
    assert len(chunks) > 1
    
    # Check overlap
    text1 = chunks[0]["text"]
    text2 = chunks[1]["text"]
    
    # The end of the first chunk should overlap with the start of the second
    assert text1[-20:] in text2
