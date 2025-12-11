"""
WebSocket Routes for Real-time Detection Updates
Replaces polling for live stats and detection notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import List, Dict
import json
import asyncio
from datetime import datetime

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # All active connections
        self.active_connections: List[WebSocket] = []
        # User-specific connections (keyed by user_id)
        self.user_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.append(connection)
        
        # Clean up dead connections
        for dc in dead_connections:
            if dc in self.active_connections:
                self.active_connections.remove(dc)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_connections:
            dead_connections = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.append(connection)
            
            # Clean up
            for dc in dead_connections:
                self.user_connections[user_id].remove(dc)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/detections")
async def websocket_detections(websocket: WebSocket):
    """
    WebSocket endpoint for real-time detection updates
    
    Messages sent:
    - {"type": "connected", "message": "Connected to detection stream"}
    - {"type": "detection", "data": {...}}
    - {"type": "stats", "data": {...}}
    
    Messages received:
    - {"type": "subscribe", "channel": "stats"}
    - {"type": "ping"}
    """
    await manager.connect(websocket)
    
    # Send welcome message
    await websocket.send_json({
        "type": "connected",
        "message": "Connected to detection stream",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif data.get("type") == "subscribe":
                channel = data.get("channel", "all")
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)


@router.websocket("/ws/live/{session_id}")
async def websocket_live_detection(websocket: WebSocket, session_id: str):
    """
    WebSocket for live detection streaming
    
    Used by frontend LiveDetection component for real-time updates
    """
    await manager.connect(websocket)
    
    await websocket.send_json({
        "type": "session_started",
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        while True:
            # Receive detection results from frontend
            data = await websocket.receive_json()
            
            if data.get("type") == "detection_result":
                # Broadcast to other viewers (if implementing monitoring)
                await manager.broadcast({
                    "type": "live_detection",
                    "session_id": session_id,
                    "detections": data.get("detections", []),
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Helper function to broadcast detection events (call from other routes)
async def broadcast_detection_event(detection_data: dict):
    """Broadcast new detection to all connected clients"""
    await manager.broadcast({
        "type": "new_detection",
        "data": detection_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_stats_update(stats: dict):
    """Broadcast stats update to all connected clients"""
    await manager.broadcast({
        "type": "stats_update",
        "data": stats,
        "timestamp": datetime.utcnow().isoformat()
    })


# Export for use in other modules
def get_connection_manager():
    return manager
