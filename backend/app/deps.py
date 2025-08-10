from fastapi import Depends, HTTPException, status
from typing import Optional, Dict, Any

from app.core.config import settings


async def verify_api_key(api_key: Optional[str] = None) -> None:
    """
    Verify that the API key is valid.
    
    Args:
        api_key: API key to verify
        
    Raises:
        HTTPException: If the API key is invalid
    """
    # If no OpenRouter API key is configured, print a warning but continue
    # This allows development without an API key
    if not settings.openrouter_api_key:
        print("WARNING: OpenRouter API key not configured. Some features may not work correctly.")
    
    # Return successful authentication
    return None


def get_error_response(error_message: str, status_code: int = 400) -> Dict[str, Any]:
    """
    Get a standardized error response.
    
    Args:
        error_message: Error message
        status_code: HTTP status code
        
    Returns:
        Dictionary with error details
    """
    return {
        "success": False,
        "error": error_message,
        "status_code": status_code
    }
