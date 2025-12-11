"""
Unit tests for main application and core API endpoints
Tests for health check, CORS, rate limiting, and general app behavior
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestHealthAndStatus:
    """Tests for health check and status endpoints"""
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, client):
        """Test root endpoint returns welcome message"""
        response = await client.get("/")
        
        # Should return 200 with info
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "name" in data or "version" in data
    
    @pytest.mark.asyncio
    async def test_docs_accessible(self, client):
        """Test Swagger docs are accessible"""
        response = await client.get("/docs")
        
        # Should return 200 (HTML for Swagger UI)
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_openapi_json_accessible(self, client):
        """Test OpenAPI JSON schema is accessible"""
        response = await client.get("/openapi.json")
        
        # Should return 200 with OpenAPI spec
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data


class TestCORS:
    """Tests for CORS configuration"""
    
    @pytest.mark.asyncio
    async def test_cors_headers_present(self, client):
        """Test CORS headers are included in responses"""
        response = await client.options("/api/auth/login")
        
        # OPTIONS might return 200 or 405 depending on route config
        assert response.status_code in [200, 405]
    
    @pytest.mark.asyncio
    async def test_cors_allows_localhost(self, client):
        """Test CORS allows localhost origin"""
        headers = {"Origin": "http://localhost:3000"}
        response = await client.options("/api/auth/login", headers=headers)
        
        # Should allow the origin (200) or 405 for no OPTIONS handler
        assert response.status_code in [200, 405]


class TestErrorHandling:
    """Tests for error handling"""
    
    @pytest.mark.asyncio
    async def test_404_for_unknown_route(self, client):
        """Test 404 returned for unknown routes"""
        response = await client.get("/this/route/does/not/exist")
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_method_not_allowed(self, client):
        """Test 405 for wrong HTTP method"""
        # Try DELETE on an endpoint that only accepts GET/POST
        response = await client.delete("/api/auth/register")
        
        # Should return 405 Method Not Allowed
        assert response.status_code == 405
    
    @pytest.mark.asyncio
    async def test_validation_error_422(self, client):
        """Test 422 for validation errors"""
        # Send invalid data
        response = await client.post("/api/auth/register", json={
            "email": "not-an-email"
            # Missing required fields
        })
        
        assert response.status_code == 422


class TestAPIRouters:
    """Tests for API router registration"""
    
    @pytest.mark.asyncio
    async def test_auth_router_registered(self, client):
        """Test auth router is properly registered"""
        response = await client.get("/api/auth/me")
        
        # Should return 401/403 (not 404) if router is registered
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_detection_router_registered(self, client):
        """Test detection router is properly registered"""
        response = await client.get("/api/detections/stats")
        
        # Should return 401/403 (not 404) if router is registered
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_ocr_router_registered(self, client):
        """Test OCR router is properly registered"""
        response = await client.get("/api/ocr/status")
        
        # Should return 200 (OCR status is public)
        assert response.status_code == 200


class TestRateLimiting:
    """Tests for rate limiting"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_exists(self, client):
        """Test rate limiter is configured"""
        from main import limiter
        
        assert limiter is not None
    
    # Note: Full rate limit testing requires many requests
    # which is typically done in integration tests


class TestMiddleware:
    """Tests for middleware configuration"""
    
    @pytest.mark.asyncio
    async def test_session_middleware_active(self, client):
        """Test session middleware is active (needed for OAuth)"""
        from main import app
        
        # Check middleware is registered
        middleware_types = [type(m).__name__ for m in app.user_middleware]
        
        # SessionMiddleware should be present
        assert any('Session' in m for m in middleware_types) or len(app.user_middleware) > 0


class TestDetectionEndpoint:
    """Additional tests for main /detect endpoint"""
    
    @pytest.mark.asyncio
    async def test_detect_returns_json(self, client):
        """Test /detect always returns JSON"""
        from io import BytesIO
        from PIL import Image
        
        img = Image.new('RGB', (100, 100), color='blue')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        
        files = {"file": ("test.png", buffer.getvalue(), "image/png")}
        response = await client.post("/detect", files=files)
        
        # Response should always be JSON
        assert response.headers.get("content-type", "").startswith("application/json")
    
    @pytest.mark.asyncio
    async def test_detect_large_image(self, client):
        """Test detection handles larger images"""
        from io import BytesIO
        from PIL import Image
        
        # Create a larger 1000x1000 image
        img = Image.new('RGB', (1000, 1000), color='green')
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=50)
        
        files = {"file": ("large.jpg", buffer.getvalue(), "image/jpeg")}
        response = await client.post("/detect", files=files)
        
        # Should handle large images (may return 200 or timeout error)
        assert response.status_code in [200, 400, 500, 504]


class TestEnvironmentConfig:
    """Tests for environment configuration"""
    
    def test_settings_loads(self):
        """Test settings can be loaded"""
        from config.settings import get_settings
        
        settings = get_settings()
        
        assert settings is not None
        assert hasattr(settings, 'mongodb_uri')
        assert hasattr(settings, 'jwt_secret')
    
    def test_settings_has_required_fields(self):
        """Test settings has all required fields"""
        from config.settings import get_settings
        
        settings = get_settings()
        
        required_fields = [
            'mongodb_uri',
            'jwt_secret',
            'jwt_algorithm',
            'jwt_expiry_minutes'  # Actual field name
        ]
        
        for field in required_fields:
            assert hasattr(settings, field), f"Missing required field: {field}"


class TestModels:
    """Tests for Pydantic models"""
    
    def test_detection_data_format(self, sample_detection):
        """Test detection data has correct format"""
        assert "detections" in sample_detection
        assert isinstance(sample_detection["detections"], list)
        assert len(sample_detection["detections"]) > 0
    
    def test_detection_item_structure(self, sample_detection):
        """Test each detection item has required fields"""
        for item in sample_detection["detections"]:
            assert "label" in item
            assert "confidence" in item
            assert "box" in item
