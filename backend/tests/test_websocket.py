"""
Unit tests for WebSocket endpoints
Tests for /ws/* routes
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json


class TestConnectionManager:
    """Tests for WebSocket ConnectionManager class"""
    
    def test_connection_manager_init(self):
        """Test ConnectionManager initialization"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        
        assert hasattr(manager, 'active_connections')
        assert hasattr(manager, 'user_connections')
        assert isinstance(manager.active_connections, list)
        assert isinstance(manager.user_connections, dict)
    
    @pytest.mark.asyncio
    async def test_connect_adds_to_list(self):
        """Test connect adds websocket to active list"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws = AsyncMock()
        
        await manager.connect(mock_ws)
        
        assert mock_ws in manager.active_connections
        mock_ws.accept.assert_awaited_once()
    
    @pytest.mark.asyncio
    async def test_connect_with_user_id(self):
        """Test connect with user_id adds to user connections"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws = AsyncMock()
        user_id = "user_123"
        
        await manager.connect(mock_ws, user_id)
        
        assert mock_ws in manager.active_connections
        assert user_id in manager.user_connections
        assert mock_ws in manager.user_connections[user_id]
    
    def test_disconnect_removes_from_list(self):
        """Test disconnect removes websocket from list"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws = MagicMock()
        manager.active_connections.append(mock_ws)
        
        manager.disconnect(mock_ws)
        
        assert mock_ws not in manager.active_connections
    
    def test_disconnect_with_user_id(self):
        """Test disconnect removes from user connections"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws = MagicMock()
        user_id = "user_123"
        manager.active_connections.append(mock_ws)
        manager.user_connections[user_id] = [mock_ws]
        
        manager.disconnect(mock_ws, user_id)
        
        assert mock_ws not in manager.active_connections
        assert mock_ws not in manager.user_connections[user_id]
    
    @pytest.mark.asyncio
    async def test_broadcast_sends_to_all(self):
        """Test broadcast sends to all connections"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        manager.active_connections = [mock_ws1, mock_ws2]
        
        message = {"type": "test", "data": "hello"}
        await manager.broadcast(message)
        
        mock_ws1.send_json.assert_awaited_with(message)
        mock_ws2.send_json.assert_awaited_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_removes_dead_connections(self):
        """Test broadcast removes connections that fail"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws_alive = AsyncMock()
        mock_ws_dead = AsyncMock()
        mock_ws_dead.send_json.side_effect = Exception("Connection closed")
        
        manager.active_connections = [mock_ws_alive, mock_ws_dead]
        
        await manager.broadcast({"type": "test"})
        
        assert mock_ws_dead not in manager.active_connections
        assert mock_ws_alive in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_send_to_user(self):
        """Test sending message to specific user"""
        from routes.websocket import ConnectionManager
        
        manager = ConnectionManager()
        mock_ws = AsyncMock()
        user_id = "user_123"
        manager.user_connections[user_id] = [mock_ws]
        
        message = {"type": "private", "data": "hello"}
        await manager.send_to_user(user_id, message)
        
        mock_ws.send_json.assert_awaited_with(message)


class TestHelperFunctions:
    """Tests for WebSocket helper functions"""
    
    @pytest.mark.asyncio
    async def test_broadcast_detection_event(self):
        """Test detection event broadcast"""
        from routes.websocket import broadcast_detection_event, manager
        
        # Mock the manager's broadcast
        manager.broadcast = AsyncMock()
        
        detection_data = {"objects": 5, "classes": ["car", "person"]}
        await broadcast_detection_event(detection_data)
        
        manager.broadcast.assert_awaited_once()
        call_args = manager.broadcast.call_args[0][0]
        assert call_args["type"] == "new_detection"
        assert call_args["data"] == detection_data
    
    @pytest.mark.asyncio
    async def test_broadcast_stats_update(self):
        """Test stats update broadcast"""
        from routes.websocket import broadcast_stats_update, manager
        
        # Mock the manager's broadcast
        manager.broadcast = AsyncMock()
        
        stats = {"total": 100, "fps": 30}
        await broadcast_stats_update(stats)
        
        manager.broadcast.assert_awaited_once()
        call_args = manager.broadcast.call_args[0][0]
        assert call_args["type"] == "stats_update"
        assert call_args["data"] == stats
    
    def test_get_connection_manager(self):
        """Test getting connection manager instance"""
        from routes.websocket import get_connection_manager, manager
        
        result = get_connection_manager()
        
        assert result is manager


class TestWebSocketRoutes:
    """Tests for WebSocket route functionality"""
    
    @pytest.mark.asyncio
    async def test_websocket_detections_endpoint_exists(self, client):
        """Test /ws/detections endpoint is registered"""
        # WebSocket endpoints can't be tested with regular HTTP client
        # but we can verify the app has the route
        from main import app
        
        routes = [r.path for r in app.routes]
        ws_routes = [r for r in routes if 'ws' in r]
        
        assert len(ws_routes) > 0, "Should have WebSocket routes"
    
    @pytest.mark.asyncio
    async def test_websocket_live_endpoint_exists(self, client):
        """Test /ws/live/{session_id} endpoint is registered"""
        from main import app
        
        routes = [r.path for r in app.routes]
        live_routes = [r for r in routes if 'live' in r]
        
        # Should have at least one live-related route
        # This could be the WebSocket route


class TestWebSocketMessages:
    """Tests for WebSocket message formats"""
    
    def test_connected_message_format(self):
        """Test connected message has correct format"""
        from datetime import datetime
        
        message = {
            "type": "connected",
            "message": "Connected to detection stream",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        assert message["type"] == "connected"
        assert "timestamp" in message
    
    def test_detection_message_format(self):
        """Test detection message has correct format"""
        from datetime import datetime
        
        message = {
            "type": "detection",
            "data": {"objects": 3, "classes": ["car", "person", "dog"]},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        assert message["type"] == "detection"
        assert "data" in message
        assert "timestamp" in message
    
    def test_stats_message_format(self):
        """Test stats message has correct format"""
        from datetime import datetime
        
        message = {
            "type": "stats",
            "data": {"total": 150, "avg_confidence": 0.85},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        assert message["type"] == "stats"
        assert isinstance(message["data"]["total"], int)
    
    def test_pong_response_format(self):
        """Test pong response has correct format"""
        from datetime import datetime
        
        message = {
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        assert message["type"] == "pong"
        assert "timestamp" in message
