from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from app.api import ask, ingest
from app.core.config import settings
from typing import Dict, List, Any

app = FastAPI(
    title="AI Tutor API",
    description="API for the AI Tutor with RAG capabilities",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create API router
api_router = APIRouter()

# Include API routes
api_router.include_router(ask.router, tags=["Questions"])
api_router.include_router(ingest.router, tags=["Document Ingestion"])


# Health check endpoint
class StatusResponse(BaseModel):
    status: str


@api_router.get("/status", response_model=StatusResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Status information
    """
    return StatusResponse(status="ok")


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        message = json.dumps({"type": event_type, "data": data})
        await self.broadcast(message)


# Initialize connection manager
manager = ConnectionManager()


# WebSocket endpoint
@app.websocket("/ws/rag_process")
async def websocket_rag_process(websocket: WebSocket):
    """WebSocket endpoint for real-time RAG process updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Parse incoming message
                message = json.loads(data)
                
                # Echo back message for testing
                await manager.send_personal_message(f"Received: {data}", websocket)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await manager.send_personal_message(json.dumps({"type": "pong"}), websocket)
            except json.JSONDecodeError:
                await manager.send_personal_message("Invalid JSON", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Add API router to app
app.include_router(api_router)


# Add root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint.
    
    Returns:
        Welcome message
    """
    return {
        "message": "Welcome to AI Tutor API",
        "documentation": "/docs",
    }
