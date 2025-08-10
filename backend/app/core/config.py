import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # OpenRouter API settings
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    site_url: str = os.getenv("SITE_URL", "https://yourdomain.com")
    site_name: str = os.getenv("SITE_NAME", "AI Tutor")
    
    # LLM model settings
    # Use a more powerful model for better response quality
    model_name: str = os.getenv("MODEL_NAME", "z-ai/glm-4.5-air:free")
    
    # Vector store settings
    vector_store_path: str = os.getenv("VECTOR_STORE_PATH", "./data/vectorstore")
    # Use a more advanced embedding model for better semantic understanding
    embeddings_model: str = os.getenv("EMBEDDINGS_MODEL", "intfloat/multilingual-e5-large")
    
    # Document processing settings
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "500"))
    chunk_overlap: float = float(os.getenv("CHUNK_OVERLAP", "0.1"))
    
    # Performance settings
    max_concurrent_tasks: int = int(os.getenv("MAX_CONCURRENT_TASKS", "3"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    enable_debug_logging: bool = os.getenv("ENABLE_DEBUG_LOGGING", "True").lower() == "true"
    
    # API settings
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    cors_origins: List[str] = [
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # Common React port
    ]
    
    # Enhanced system prompt for RAG with better context understanding
    system_prompt: str = (
        "You are an expert teacher who provides comprehensive, accurate, and helpful information. "
        "Answer the user's question based on the provided context chunks. "
        "The chunks are sections from documents that have been retrieved as relevant to the query. "
        "Each chunk has a source document and page/location information when available. "
        "\n\n"
        "GUIDELINES:"
        "\n- Analyze all provided chunks thoroughly before answering"
        "\n- Provide detailed responses that synthesize information across chunks when relevant"
        "\n- Include specific references to the sources (document names, page numbers if available)"
        "\n- If chunks contain conflicting information, acknowledge this and explain the different perspectives"
        "\n- If the question cannot be answered from the provided chunks, clearly state: 'I don't have enough information in the provided context to answer that question.'"
        "\n- Never make up information that isn't in the chunks"
        "\n- If you're uncertain about information in the chunks, express your uncertainty"
        "\n\n"
        "Focus on being accurate, informative and educational in your response."
    )
    
    class Config:
        env_file = ".env"


# Create singleton settings instance
settings = Settings()

# Create directories if they don't exist
Path(settings.vector_store_path).parent.mkdir(parents=True, exist_ok=True)
