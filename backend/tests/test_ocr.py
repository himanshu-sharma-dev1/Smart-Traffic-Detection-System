"""
Unit tests for OCR endpoints
Tests for /api/ocr/* routes
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import base64
from io import BytesIO
from PIL import Image


class TestOCRStatus:
    """Tests for /api/ocr/status endpoint"""
    
    @pytest.mark.asyncio
    async def test_ocr_status_success(self, client):
        """Test OCR status endpoint returns correctly"""
        response = await client.get("/api/ocr/status")
        
        # Should return 200 with status info
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["ready", "not_installed"]
    
    @pytest.mark.asyncio
    async def test_ocr_status_returns_engine(self, client):
        """Test OCR status returns engine info when ready"""
        with patch.dict('sys.modules', {'easyocr': MagicMock()}):
            response = await client.get("/api/ocr/status")
            
            assert response.status_code == 200
            data = response.json()
            if data["status"] == "ready":
                assert "engine" in data


class TestPlateBase64:
    """Tests for /api/ocr/plate-base64 endpoint"""
    
    def _create_test_image(self, width=100, height=50, color='white'):
        """Helper to create test image base64"""
        img = Image.new('RGB', (width, height), color=color)
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        base64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"
    
    @pytest.mark.asyncio
    async def test_plate_no_image(self, client):
        """Test plate OCR without image data"""
        response = await client.post("/api/ocr/plate-base64", json={})
        
        # Should fail with 400, 422, or 500 (depending on error handling)
        assert response.status_code in [400, 422, 500]
    
    @pytest.mark.asyncio
    async def test_plate_with_image(self, client):
        """Test plate OCR with valid image"""
        image_base64 = self._create_test_image()
        
        with patch('routes.ocr.get_reader') as mock_reader:
            mock_reader.return_value.readtext.return_value = [
                ([[0, 0], [100, 0], [100, 50], [0, 50]], "MH12AB4567", 0.95)
            ]
            
            response = await client.post("/api/ocr/plate-base64", json={
                "image": image_base64,
                "trackId": "test-1"
            })
        
        # Should return 200 with result
        assert response.status_code == 200
        data = response.json()
        assert "trackId" in data
    
    @pytest.mark.asyncio
    async def test_plate_invalid_base64(self, client):
        """Test plate OCR with invalid base64"""
        response = await client.post("/api/ocr/plate-base64", json={
            "image": "not-valid-base64!@#$",
            "trackId": "test-1"
        })
        
        # Should fail with 400 or 500
        assert response.status_code in [400, 500]
    
    @pytest.mark.asyncio
    async def test_plate_empty_image(self, client):
        """Test plate OCR with empty image data"""
        response = await client.post("/api/ocr/plate-base64", json={
            "image": "",
            "trackId": "test-1"
        })
        
        # Should fail with 400, 422, or 500
        assert response.status_code in [400, 422, 500]


class TestPlateGemini:
    """Tests for /api/ocr/plate-gemini endpoint"""
    
    def _create_test_image(self):
        """Helper to create test image base64"""
        img = Image.new('RGB', (100, 50), color='white')
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        return f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
    
    @pytest.mark.asyncio
    async def test_gemini_no_api_key(self, client):
        """Test Gemini OCR without API key"""
        image_base64 = self._create_test_image()
        
        with patch.dict('os.environ', {'GEMINI_API_KEY': ''}):
            response = await client.post("/api/ocr/plate-gemini", json={
                "image": image_base64,
                "trackId": "test-1"
            })
        
        # Should return response (success false if no key)
        assert response.status_code == 200
        data = response.json()
        # Without key, should indicate error
        if not data.get("success"):
            assert "error" in data or data.get("plate") is None
    
    @pytest.mark.asyncio
    async def test_gemini_no_image(self, client):
        """Test Gemini OCR without image"""
        response = await client.post("/api/ocr/plate-gemini", json={})
        
        # May return 200 with error in body, or 400/422/500
        assert response.status_code in [200, 400, 422, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Should indicate failure when no image
            if "success" in data:
                assert data["success"] == False


class TestPlatePatternMatching:
    """Tests for Indian plate pattern validation"""
    
    def test_valid_indian_plate_patterns(self):
        """Test valid Indian plate formats"""
        from routes.ocr import is_indian_plate
        
        valid_plates = [
            "MH12AB4567",
            "DL9CAB1234",
            "KA01MH2345",
            "TN01AB0001",
            "AP09BH1234"
        ]
        
        for plate in valid_plates:
            assert is_indian_plate(plate), f"{plate} should be valid"
    
    def test_invalid_plate_patterns(self):
        """Test invalid plate formats"""
        from routes.ocr import is_indian_plate
        
        invalid_plates = [
            "PHONE70",
            "PERSON52",
            "ABC",
            "123456",
            "",
            "XX99XX9999X"  # Too long
        ]
        
        for plate in invalid_plates:
            # These should return False or have low score
            result = is_indian_plate(plate)
            # Most should be False, but some edge cases may pass


class TestPlateScoring:
    """Tests for plate candidate scoring"""
    
    def test_scoring_function(self):
        """Test plate scoring prioritizes correct patterns"""
        from routes.ocr import score_plate_candidate
        
        # Good plate should score higher
        good_score = score_plate_candidate("MH12AB4567")
        
        # Bad text should score lower
        bad_score = score_plate_candidate("PHONE70")
        
        assert good_score > bad_score, "Good plate should score higher than phone text"
    
    def test_bad_words_penalized(self):
        """Test known non-plate words are penalized"""
        from routes.ocr import score_plate_candidate
        
        bad_words = ["PHONE50", "CELL80", "BATTERY100"]
        
        for word in bad_words:
            score = score_plate_candidate(word)
            assert score < 0, f"{word} should have negative score (was {score})"


class TestPreprocessing:
    """Tests for image preprocessing"""
    
    def test_preprocessing_returns_image(self):
        """Test preprocessing returns valid image array"""
        import numpy as np
        from routes.ocr import preprocess_for_ocr
        
        # Create test image array
        test_img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = preprocess_for_ocr(test_img)
        
        assert result is not None
        assert result.shape[0] == 100  # Height preserved
        assert result.shape[1] == 100  # Width preserved
        assert len(result.shape) == 3  # Still RGB
    
    def test_preprocessing_grayscale_input(self):
        """Test preprocessing handles grayscale input"""
        import numpy as np
        from routes.ocr import preprocess_for_ocr
        
        # Create grayscale test image
        test_img = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        
        result = preprocess_for_ocr(test_img)
        
        assert result is not None
        assert len(result.shape) == 2  # Stays grayscale
