import asyncio
import os
import time
from concurrent.futures import ThreadPoolExecutor
from tempfile import NamedTemporaryFile
from typing import List, Optional, Dict, Any

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl

# Import both standard and enhanced processors
from app.core.processors import get_processor
# Import enhanced processors for better web page extraction
from app.core.enhanced_processors import EnhancedWebPageProcessor, get_processor as get_enhanced_processor
from app.core.vectorstore import vectorstore, DocumentChunk
from app.core.config import settings
from app.core.events import log_rag_event, EventType, ProcessPhase
from app.deps import verify_api_key, get_error_response


router = APIRouter()


class IngestRequest(BaseModel):
    urls: List[str] = []


class IngestResponse(BaseModel):
    success: bool
    message: str
    document_count: int

@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    background_tasks: BackgroundTasks,
    urls: List[str] = Form([]),
    files: List[UploadFile] = File([]),
    new_session: bool = Form(True),
    _: None = Depends(verify_api_key)
):
    """
    Ingest documents from URLs and files.
    
    Args:
        urls: List of URLs to ingest
        files: List of files to ingest
        new_session: Whether to start a new session (clear previous data)
        
    Returns:
        IngestResponse object with success status and document count
    """
    if not urls and not files:
        return IngestResponse(
            success=False,
            message="No documents provided. Please provide at least one URL or file.",
            document_count=0
        )
    
    # Start a new session if requested (default behavior)
    if new_session:
        print("Starting new RAG session")
        session_id = vectorstore.start_new_session()
        print(f"New session started with ID: {session_id}")
        await log_rag_event(
            message=f"Started new RAG session with ID: {session_id}",
            phase=ProcessPhase.SESSION,
            event_type=EventType.INFO,
            explanation_level="detail"
        )
    
    document_chunks = []
    processing_errors = []
    
    # Start processing timer
    start_time = time.time()
    print(f"Starting document ingestion: {len(urls)} URLs and {len(files)} files")
    
    try:
        # Process URLs concurrently with async
        if urls:
            async def process_url(url):
                try:
                    print(f"Processing URL: {url}")
                    # Log URL processing
                    await log_rag_event(
                        message=f"Processing URL: {url}",
                        phase=ProcessPhase.INGESTION,
                        event_type=EventType.INFO
                    )
                    
                    # Validate URL format
                    if not url.startswith(('http://', 'https://')):
                        error_msg = f"Invalid URL format: {url}. Must start with http:// or https://"
                        await log_rag_event(
                            message=error_msg,
                            phase=ProcessPhase.INGESTION,
                            event_type=EventType.ERROR
                        )
                        raise ValueError(error_msg)
                    
                    url_start = time.time()
                    
                    # Determine processor type
                    processor_type = "YouTube" if ('youtube.com' in url or 'youtu.be' in url) else "Web Page"
                    await log_rag_event(
                        message=f"Detected {processor_type} content type",
                        phase=ProcessPhase.EXTRACTION,
                        event_type=EventType.INFO
                    )
                    
                    # Use enhanced processor for URLs
                    if 'youtube.com' in url or 'youtu.be' in url:
                        # For YouTube, use standard processor
                        processor = get_processor(url)
                    else:
                        # For web pages, use enhanced processor for better extraction
                        processor = EnhancedWebPageProcessor()
                    
                    # Log extraction starting with animation
                    await log_rag_event(
                        message=f"Extracting content from {processor_type.lower()}...",
                        phase=ProcessPhase.EXTRACTION,
                        event_type=EventType.INFO,
                        animation="pulse"
                    )
                    
                    # Run processor in a thread pool because it's CPU-bound
                    loop = asyncio.get_event_loop()
                    chunks = await loop.run_in_executor(None, processor.process, url)
                    
                    # Check if we got any chunks
                    if not chunks:
                        print(f"Warning: No chunks extracted from URL: {url}")
                        await log_rag_event(
                            message=f"No content extracted from URL with primary processor",
                            phase=ProcessPhase.EXTRACTION,
                            event_type=EventType.WARNING
                        )
                        
                        # Try standard processor as fallback if enhanced fails
                        if not isinstance(processor, get_processor(url).__class__):
                            await log_rag_event(
                                message=f"Trying fallback processor...",
                                phase=ProcessPhase.EXTRACTION,
                                event_type=EventType.INFO
                            )
                            fallback_processor = get_processor(url)
                            chunks = await loop.run_in_executor(None, fallback_processor.process, url)
                            
                            if not chunks:
                                await log_rag_event(
                                    message=f"Failed to extract content with fallback processor",
                                    phase=ProcessPhase.EXTRACTION,
                                    event_type=EventType.ERROR
                                )
                                return [], f"No content extracted from URL: {url}"
                        else:
                            return [], f"No content extracted from URL: {url}"
                    
                    # Log successful extraction
                    await log_rag_event(
                        message=f"Successfully extracted content from URL",
                        phase=ProcessPhase.EXTRACTION,
                        event_type=EventType.SUCCESS
                    )
                    
                    # Convert chunks
                    url_chunks = [
                        DocumentChunk(text=chunk["text"], metadata=chunk["metadata"])
                        for chunk in chunks
                    ]
                    url_time = time.time() - url_start
                    print(f"Successfully processed URL: {url}, extracted {len(chunks)} chunks in {url_time:.2f}s")
                    
                    # Log chunking with animation
                    await log_rag_event(
                        message=f"Created {len(chunks)} text chunks for embedding",
                        phase=ProcessPhase.CHUNKING,
                        event_type=EventType.SUCCESS,
                        animation="flash"
                    )
                    
                    return url_chunks, None
                except Exception as e:
                    error_msg = f"Error processing URL {url}: {str(e)}"
                    print(error_msg)
                    import traceback
                    traceback.print_exc()
                    
                    # Log error
                    await log_rag_event(
                        message=f"Error processing URL: {str(e)}",
                        phase=ProcessPhase.INGESTION,
                        event_type=EventType.ERROR
                    )
                    
                    return [], error_msg
            
            # Process URLs with limited concurrency
            # Use semaphore to limit concurrent URL processing based on config
            sem = asyncio.Semaphore(settings.max_concurrent_tasks)  # Configurable concurrency
            
            async def limited_process_url(url):
                async with sem:  # Acquire semaphore before processing
                    return await process_url(url)
            
            # Create tasks for each URL
            url_tasks = []
            for url in urls:
                # Validate URL format before creating task
                if url and (url.startswith('http://') or url.startswith('https://')):
                    url_tasks.append(limited_process_url(url))
                else:
                    print(f"Skipping invalid URL format: {url}")
                    processing_errors.append(f"Invalid URL format: {url}")
            
            # Process all URLs with proper error handling
            if url_tasks:
                try:
                    # Wait for all URL processing to complete with timeout
                    try:
                        # Add timeout to prevent hanging on slow URLs
                        url_results = await asyncio.wait_for(
                            asyncio.gather(*url_tasks, return_exceptions=True),
                            timeout=settings.request_timeout * len(url_tasks)  # Scale timeout by number of URLs
                        )
                    except asyncio.TimeoutError:
                        error_msg = f"URL processing timed out after {settings.request_timeout * len(url_tasks)} seconds"
                        print(error_msg)
                        processing_errors.append(error_msg)
                        # Get results from completed tasks
                        url_results = [task.result() if task.done() and not task.exception() else 
                                      Exception("Task timed out") for task in url_tasks]
                    
                    # Collect results, handling any exceptions
                    for result in url_results:
                        if isinstance(result, Exception):
                            # Handle task exception
                            error_msg = f"Task failed with exception: {str(result)}"
                            print(error_msg)
                            processing_errors.append(error_msg)
                        else:
                            # Process normal result
                            chunks, error = result
                            if chunks:
                                document_chunks.extend(chunks)
                            if error:
                                processing_errors.append(error)
                except Exception as e:
                    error_msg = f"Error gathering URL processing results: {str(e)}"
                    print(error_msg)
                    processing_errors.append(error_msg)
        
        # Process uploaded files
        if files:
            for file in files:
                temp_file = NamedTemporaryFile(delete=False)
                try:
                    print(f"Processing file: {file.filename}")
                    file_start = time.time()
                    
                    # Save uploaded file to temp file
                    content = await file.read()
                    async with aiofiles.open(temp_file.name, 'wb') as f:
                        await f.write(content)
                    
                    # Get the appropriate processor based on file extension but use temp_file path for processing
                    file_extension = file.filename.split('.')[-1].lower() if file.filename and '.' in file.filename else 'txt'
                    temp_file_with_extension = temp_file.name
                    
                    # For debugging
                    print(f"File extension detected: {file_extension}")
                    print(f"Using temp file path: {temp_file_with_extension}")
                    
                    # Get processor with original filename for extension detection
                    processor = get_processor(file.filename or "unknown.txt")
                    
                    # Run processor in a thread pool because it's CPU-bound
                    loop = asyncio.get_event_loop()
                    chunks = await loop.run_in_executor(None, processor.process, temp_file_with_extension)
                    
                    file_chunks = [
                        DocumentChunk(text=chunk["text"], metadata=chunk["metadata"])
                        for chunk in chunks
                    ]
                    document_chunks.extend(file_chunks)
                    
                    file_time = time.time() - file_start
                    print(f"Successfully processed file: {file.filename}, extracted {len(chunks)} chunks in {file_time:.2f}s")
                    
                except Exception as e:
                    error_msg = f"Error processing file {file.filename}: {str(e)}"
                    print(error_msg)
                    processing_errors.append(error_msg)
                finally:
                    # Close the file handle first, then delete
                    try:
                        temp_file.close()
                        os.unlink(temp_file.name)
                    except Exception as e:
                        print(f"Warning: Could not delete temporary file: {str(e)}")
                        # Try again with a delay if the file is being used
                        try:
                            time.sleep(1)
                            os.unlink(temp_file.name)
                            print("Successfully deleted temporary file after delay")
                        except Exception:
                            pass  # Ignore if still can't delete
                            
        # Add documents to vector store (this is CPU-bound, so run in a thread)
        if document_chunks:
            try:
                # Get embedding model details for explanation
                from app.core.embeddings import embeddings as embedding_provider
                
                # Log embedding creation with progress animation and detailed explanation
                await log_rag_event(
                    message=f"Creating embeddings for {len(document_chunks)} chunks...",
                    phase=ProcessPhase.EMBEDDING,
                    event_type=EventType.INFO,
                    animation="progress",
                    progress=0.0,
                    explanation_level="detail",
                    explanation_vars={
                        "model_name": embedding_provider.model_name,
                        "dimension": embedding_provider.embedding_dim
                    }
                )
                
                # Simulate progress updates for embeddings
                total_chunks = len(document_chunks)
                for i in range(1, 5):  # Show 4 progress updates
                    # Schedule progress updates in background
                    background_tasks.add_task(
                        log_rag_event,
                        message=f"Embedding chunks... ({i*20}%)",
                        phase=ProcessPhase.EMBEDDING,
                        event_type=EventType.INFO,
                        animation="progress",
                        progress=i*0.2
                    )
                
                # Run in thread pool because it's CPU-bound
                loop = asyncio.get_event_loop()
                ids = await loop.run_in_executor(
                    None, vectorstore.add_documents, document_chunks
                )
                print(f"Added {len(ids)} document chunks to vector store")
                
                # Final embedding progress update
                await log_rag_event(
                    message=f"Embeddings complete for {len(document_chunks)} chunks!",
                    phase=ProcessPhase.EMBEDDING,
                    event_type=EventType.SUCCESS,
                    animation="progress",
                    progress=1.0
                )
                
                # Log storage with animation
                await log_rag_event(
                    message=f"Added {len(ids)} document chunks to vector store",
                    phase=ProcessPhase.STORAGE,
                    event_type=EventType.SUCCESS,
                    animation="flash"
                )
            except Exception as e:
                error_msg = f"Error adding documents to vector store: {str(e)}"
                print(error_msg)
                processing_errors.append(error_msg)
                
                # Log error
                await log_rag_event(
                    message=f"Error storing vectors: {str(e)}",
                    phase=ProcessPhase.STORAGE,
                    event_type=EventType.ERROR
                )
                
                raise
        
        # Calculate total processing time
        total_time = time.time() - start_time
        
        # Determine overall success
        success = len(document_chunks) > 0
        message = f"Successfully ingested {len(document_chunks)} document chunks in {total_time:.2f} seconds"
        
        if processing_errors:
            message += f". Encountered {len(processing_errors)} errors during processing."
        
        # Log completion with celebration animation
        await log_rag_event(
            message=f"Ingestion completed in {total_time:.2f}s with {len(document_chunks)} chunks",
            phase=ProcessPhase.COMPLETE,
            event_type=EventType.SUCCESS if success else EventType.WARNING,
            animation="celebrate" if success else "none"
        )
        
        return IngestResponse(
            success=success,
            message=message,
            document_count=len(document_chunks)
        )
    
    except Exception as e:
        error_message = f"Error ingesting documents: {str(e)}"
        print(error_message)
        if processing_errors:
            error_message += f". Additional errors: {'; '.join(processing_errors)}"
        
        # Log critical error
        await log_rag_event(
            message=error_message,
            phase=ProcessPhase.SYSTEM,
            event_type=EventType.ERROR
        )
        
        raise HTTPException(
            status_code=500,
            detail=error_message
        )
