"""
Test configuration and fixtures for pytest
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


# Mock MongoDB for testing
@pytest.fixture(autouse=True)
def mock_mongodb():
    """Mock MongoDB connection for all tests"""
    with patch('config.database.get_database') as mock_db:
        mock_database = MagicMock()
        mock_db.return_value = mock_database
        yield mock_database


@pytest_asyncio.fixture
async def client():
    """Create async test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_user():
    """Sample user data for testing"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123"
    }


@pytest.fixture
def sample_detection():
    """Sample detection data for testing"""
    return {
        "detections": [
            {"label": "car", "confidence": 0.95, "box": [10, 20, 100, 150]},
            {"label": "person", "confidence": 0.87, "box": [50, 30, 80, 200]}
        ],
        "source": "upload"
    }


@pytest.fixture
def auth_headers():
    """Generate mock auth headers"""
    # This would be replaced with actual token in integration tests
    return {"Authorization": "Bearer test_token_123"}
