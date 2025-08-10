import json
import requests
import asyncio
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.core.vectorstore import vectorstore
from app.core.events import log_rag_event, EventType, ProcessPhase


class RAGEngine:
    """
    Retrieval-Augmented Generation engine that combines vector search
    with OpenRouter API to generate grounded answers.
    """
    
    def __init__(self):
        """Initialize the RAG engine."""
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = settings.model_name
    
    async def generate_answer_async(
        self,
        question: str,
        num_chunks: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate an answer to a question using RAG with async event logging.
        
        Args:
            question: User question
            num_chunks: Number of chunks to retrieve
            
        Returns:
            Dictionary containing the answer and sources
        """
        # Log query event with detailed explanation
        await log_rag_event(
            message=f"Processing question: '{question}'",
            phase=ProcessPhase.RETRIEVAL,
            event_type=EventType.INFO,
            explanation_level="detail"
        )
        
        # Retrieve relevant chunks with search animation
        await log_rag_event(
            message=f"Searching for relevant documents (top {num_chunks})...",
            phase=ProcessPhase.RETRIEVAL,
            animation="search"
        )
        
        relevant_chunks = vectorstore.search(question, k=num_chunks)
        
        if not relevant_chunks:
            await log_rag_event(
                message="No relevant documents found",
                phase=ProcessPhase.RETRIEVAL,
                event_type=EventType.WARNING
            )
            return {
                "answer": "I don't have any information to answer that question.",
                "sources": []
            }
        
        await log_rag_event(
            message=f"Found {len(relevant_chunks)} relevant document chunks",
            phase=ProcessPhase.RETRIEVAL,
            event_type=EventType.SUCCESS
        )
        
        # Format chunks for context
        await log_rag_event(
            message="Preparing context from retrieved chunks...",
            phase=ProcessPhase.GENERATION
        )
        
        context_parts = []
        sources = []
        
        for i, chunk in enumerate(relevant_chunks):
            chunk_text = chunk.text.strip()
            metadata = chunk.metadata
            
            # Add chunk to context
            context_parts.append(f"[CHUNK {i+1}]\n{chunk_text}\n")
            
            # Extract source info
            source_info = {
                "id": i,
                "text": self._get_source_preview(chunk_text),
                "source": metadata.get("source", ""),
                "source_type": metadata.get("source_type", ""),
                "title": metadata.get("title", ""),
            }
            
            sources.append(source_info)
            
            # Log detailed source info
            source_type = metadata.get("source_type", "unknown")
            source_name = metadata.get("title", metadata.get("source", "Unknown source"))
            
            await log_rag_event(
                message=f"Using {source_type} source: {source_name}",
                phase=ProcessPhase.RETRIEVAL,
                metadata={
                    "chunk_id": i,
                    "source_type": source_type,
                    "source": metadata.get("source", ""),
                }
            )
        
        # Construct prompt for LLM
        context = "\n".join(context_parts)
        
        prompt = f"""You are an expert teacher who answers questions based only on the provided information.

CONTEXT:
{context}

QUESTION:
{question}

INSTRUCTIONS:
1. Answer the question using ONLY the information provided in the CONTEXT.
2. If you don't know the answer based on the CONTEXT, say "I don't have enough information to answer that question."
3. Do not use any knowledge outside of the provided context.
4. When quoting from the context, cite the CHUNK number (e.g., [CHUNK 1]).
5. Always be helpful, concise, accurate, and educational.
6. Make your answer easy to understand.

YOUR ANSWER:"""

        # Generate answer using OpenRouter API
        try:
            await log_rag_event(
                message="Generating answer with language model...",
                phase=ProcessPhase.GENERATION,
                animation="typing",
                explanation_level="detail",
                explanation_vars={"model_name": self.model}
            )
            
            response = self._call_openrouter_api(prompt)
            answer = self._extract_answer(response)
            
            await log_rag_event(
                message="Answer generated successfully",
                phase=ProcessPhase.GENERATION,
                event_type=EventType.SUCCESS
            )
            
            return {
                "answer": answer,
                "sources": sources
            }
        
        except Exception as e:
            error_msg = f"Error generating answer: {e}"
            print(error_msg)
            
            await log_rag_event(
                message=error_msg,
                phase=ProcessPhase.GENERATION,
                event_type=EventType.ERROR
            )
            
            return {
                "answer": "I'm sorry, I encountered an error while generating an answer.",
                "sources": sources
            }
    
    def generate_answer(
        self,
        question: str,
        num_chunks: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate an answer to a question using RAG.
        
        Args:
            question: User question
            num_chunks: Number of chunks to retrieve
            
        Returns:
            Dictionary containing the answer and sources
        """
        # Use asyncio to run the async version
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Create new event loop if one is not available
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run the async version
        return loop.run_until_complete(self.generate_answer_async(question, num_chunks))
    
    def _call_openrouter_api(self, prompt: str) -> Dict[str, Any]:
        """Call OpenRouter API to generate an answer."""
        # Check if API key is available
        if not settings.openrouter_api_key:
            print("WARNING: OpenRouter API key not configured. Using fallback response.")
            # Return a mock response format that matches what we expect
            return {
                "choices": [
                    {
                        "message": {
                            "content": "I cannot access the language model because the API key is not configured. Please provide an OpenRouter API key in your environment variables."
                        }
                    }
                ]
            }
        
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.site_url,
            "X-Title": settings.site_name,
        }
        
        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": settings.system_prompt},
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = requests.post(
                url=self.api_url,
                headers=headers,
                data=json.dumps(data)
            )
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"OpenRouter API error: {e}")
            if response := getattr(e, 'response', None):
                print(f"Status code: {response.status_code}")
                print(f"Response body: {response.text}")
            
            # Return a fallback response that matches what we expect
            return {
                "choices": [
                    {
                        "message": {
                            "content": f"I encountered an error while calling the language model API. Error: {str(e)}"
                        }
                    }
                ]
            }
    
    def _extract_answer(self, response: Dict[str, Any]) -> str:
        """Extract the answer from the API response."""
        try:
            return response.get("choices", [{}])[0].get("message", {}).get("content", "")
        except (IndexError, KeyError):
            return "I couldn't generate an answer at this time."
    
    def _get_source_preview(self, text: str, max_length: int = 200) -> str:
        """Get a preview of the source text."""
        if len(text) <= max_length:
            return text
        
        return text[:max_length] + "..."


# Create singleton instance
rag_engine = RAGEngine()
