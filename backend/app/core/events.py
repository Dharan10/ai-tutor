"""
RAG process event logging module.
Provides centralized event logging for RAG processes.
"""

import time
from enum import Enum
from typing import Dict, Any, Optional, List, Callable

from app.core.explanations import get_explanation

# Import connection manager from main.py
# This is imported inside functions to avoid circular imports
# from app.main import manager


class EventType(str, Enum):
    """Event types for RAG process"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


class ProcessPhase(str, Enum):
    """Phases of the RAG process"""
    SESSION = "session"
    INGESTION = "ingestion"
    EXTRACTION = "extraction"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    STORAGE = "storage"
    RETRIEVAL = "retrieval"
    GENERATION = "generation"
    COMPLETE = "complete"
    CONNECTION = "connection"
    SYSTEM = "system"
    

# Store event listeners
_event_listeners: List[Callable[[Dict[str, Any]], None]] = []


def add_event_listener(listener: Callable[[Dict[str, Any]], None]) -> None:
    """Add an event listener function"""
    _event_listeners.append(listener)


def remove_event_listener(listener: Callable[[Dict[str, Any]], None]) -> None:
    """Remove an event listener function"""
    if listener in _event_listeners:
        _event_listeners.remove(listener)


async def log_rag_event(
    message: str,
    phase: ProcessPhase = ProcessPhase.SYSTEM,
    event_type: EventType = EventType.INFO,
    timestamp: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    animation: Optional[str] = None,
    progress: Optional[float] = None,
    include_explanation: bool = True,
    explanation_level: str = "brief",
    explanation_vars: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Log a RAG process event and broadcast it via WebSocket
    
    Args:
        message: Event message
        phase: Process phase
        event_type: Event type
        timestamp: Optional timestamp (defaults to current time)
        metadata: Optional additional metadata
        animation: Optional animation type (e.g., "typing", "pulse", "spin")
        progress: Optional progress value (0.0 to 1.0) for progress indicators
        include_explanation: Whether to include educational explanations
        explanation_level: Level of explanation detail ("brief" or "detail")
        explanation_vars: Variables to include in explanation formatting
        
    Returns:
        The event object
    """
    # Add animations based on the phase if not explicitly provided
    if animation is None:
        if phase == ProcessPhase.EXTRACTION:
            animation = "pulse"
        elif phase == ProcessPhase.EMBEDDING:
            animation = "progress"
        elif phase == ProcessPhase.RETRIEVAL:
            animation = "search"
        elif phase == ProcessPhase.GENERATION:
            animation = "typing"
        elif phase == ProcessPhase.STORAGE:
            animation = "flash"
        else:
            animation = "none"
    
    # Prepare the metadata
    event_metadata = metadata or {}
    
    # Add educational explanation if requested
    if include_explanation and phase != ProcessPhase.SYSTEM:
        explanation_vars = explanation_vars or {}
        
        # Get explanation for this phase
        explanation = get_explanation(
            phase=phase.value,
            detail_level=explanation_level,
            **explanation_vars
        )
        
        # Add explanation to metadata if available
        if explanation:
            event_metadata["explanation"] = explanation
    
    event = {
        "message": message,
        "phase": phase,
        "type": event_type,
        "timestamp": timestamp or int(time.time() * 1000),
        "metadata": event_metadata,
        "animation": animation,
        "progress": progress
    }
    
    # Add animated console output
    phase_emoji = {
        ProcessPhase.SESSION: "🔄",
        ProcessPhase.INGESTION: "📥",
        ProcessPhase.EXTRACTION: "🔍",
        ProcessPhase.CHUNKING: "✂️",
        ProcessPhase.EMBEDDING: "🧠",
        ProcessPhase.STORAGE: "💾",
        ProcessPhase.RETRIEVAL: "🔎",
        ProcessPhase.GENERATION: "✏️",
        ProcessPhase.COMPLETE: "✅",
        ProcessPhase.CONNECTION: "🔌",
        ProcessPhase.SYSTEM: "⚙️"
    }
    
    emoji = phase_emoji.get(phase, "•")
    
    # Print to console with emoji
    print(f"{emoji} [{phase}] {message}")
    
    # Add animation status to metadata if provided
    if progress is not None and "animation_progress" not in event["metadata"]:
        event["metadata"]["animation_progress"] = progress
    
    # Call event listeners
    for listener in _event_listeners:
        try:
            listener(event)
        except Exception as e:
            print(f"Error in event listener: {e}")
    
    # Broadcast via WebSocket if available
    try:
        # Import here to avoid circular imports
        from app.main import manager
        if manager:
            await manager.broadcast_event("rag_event", event)
    except Exception as e:
        # Fail silently, just log the error
        print(f"Could not broadcast event: {e}")
    
    return event
