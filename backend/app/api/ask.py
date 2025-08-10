from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.core.rag import rag_engine
from app.core.vectorstore import vectorstore
from app.core.events import log_rag_event, EventType, ProcessPhase
from app.deps import verify_api_key

router = APIRouter()


class Source(BaseModel):
    id: int
    text: str
    source: str
    source_type: str
    title: Optional[str] = None


class AskRequest(BaseModel):
    question: str
    num_chunks: Optional[int] = 5


class AskResponse(BaseModel):
    answer: str
    sources: List[Source]
    
    
class SourceInfo(BaseModel):
    url: str
    title: str
    source_type: str
    chunk_count: int
    first_added: int
    last_updated: int
    

class SourcesResponse(BaseModel):
    sources: Dict[str, SourceInfo]


@router.get("/sources", response_model=SourcesResponse)
async def get_sources(_: None = Depends(verify_api_key)):
    """
    Get all sources that have been added to the knowledge base.
    
    Returns:
        SourcesResponse object with sources information
    """
    try:
        # Get all sources from vectorstore
        sources_data = vectorstore.get_all_sources()
        
        # Convert to response format
        sources_dict = {}
        for url, info in sources_data.items():
            sources_dict[url] = SourceInfo(
                url=url,
                title=info.get("title", "Untitled"),
                source_type=info.get("source_type", "unknown"),
                chunk_count=info.get("chunk_count", 0),
                first_added=info.get("first_added", 0),
                last_updated=info.get("last_updated", 0)
            )
            
        return SourcesResponse(sources=sources_dict)
    except Exception as e:
        print(f"Error retrieving sources: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving sources: {str(e)}"
        )


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_api_key)
):
    """
    Ask a question and get an AI-generated answer.
    
    Args:
        request: AskRequest object with question
        background_tasks: FastAPI background tasks
        
    Returns:
        AskResponse object with answer and sources
    """
    # Log the incoming question
    background_tasks.add_task(log_rag_event,
        message=f"Received question: '{request.question}'",
        phase=ProcessPhase.RETRIEVAL,
        event_type=EventType.INFO
    )
    try:
        # Validate question
        if not request.question or len(request.question.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty"
            )
        
        print(f"Processing question: '{request.question}'")
        print(f"Requested number of chunks: {request.num_chunks}")
        
        # Generate answer using RAG - call the async version directly
        try:
            # Use the async version since we're in an async endpoint
            result = await rag_engine.generate_answer_async(
                question=request.question,
                num_chunks=request.num_chunks
            )
            
            # Check if we got a valid result
            if not result or "answer" not in result:
                print("Warning: RAG engine returned invalid result format")
                return AskResponse(
                    answer="I'm sorry, I couldn't generate an answer at this time due to a system error.",
                    sources=[]
                )
            
            print(f"Successfully generated answer with {len(result.get('sources', []))} sources")
            return AskResponse(
                answer=result["answer"],
                sources=result["sources"]
            )
        except Exception as rag_error:
            print(f"Error in RAG engine: {str(rag_error)}")
            # Provide a fallback response
            return AskResponse(
                answer=f"I encountered a problem while generating an answer: {str(rag_error)}",
                sources=[]
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in ask endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating answer: {str(e)}"
        )
