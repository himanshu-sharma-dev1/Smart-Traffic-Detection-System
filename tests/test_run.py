import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, PropertyMock
from run import app
import io

client = TestClient(app)

def test_ping():
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}

def test_detect_image_success(mocker):
    # Mock the Google Cloud Vision client
    mock_vision_client = MagicMock()

    # Mock the response from object_localization
    mock_localized_object = MagicMock()
    mock_localized_object.name = "Stop sign"
    mock_localized_object.score = 0.95

    # Mock the bounding poly and normalized vertices
    # Create mock vertices with x and y attributes
    v1 = MagicMock()
    v1.x, v1.y = 0.1, 0.1
    v2 = MagicMock()
    v2.x, v2.y = 0.2, 0.1
    v3 = MagicMock()
    v3.x, v3.y = 0.2, 0.2
    v4 = MagicMock()
    v4.x, v4.y = 0.1, 0.2

    mock_bounding_poly = PropertyMock()
    mock_bounding_poly.normalized_vertices = [v1, v2, v3, v4]
    type(mock_localized_object).bounding_poly = mock_bounding_poly

    mock_response = MagicMock()
    mock_response.localized_object_annotations = [mock_localized_object]

    mock_vision_client.object_localization.return_value = mock_response

    mocker.patch('run.vision_client', mock_vision_client)

    # Create a dummy image file (a tiny 1x1 black GIF)
    dummy_image_bytes = (
        b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00'
        b'\x00\x00\x00\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00'
        b'\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    )
    dummy_file = io.BytesIO(dummy_image_bytes)

    # Make the request
    response = client.post(
        "/detect",
        files={"file": ("test.jpg", dummy_file, "image/jpeg")}
    )

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert "image" in data
    assert "detections" in data

    detections = data["detections"]
    assert len(detections) == 1
    detection = detections[0]
    assert detection["label"] == "Stop sign"
    assert detection["confidence"] == 0.95
    # Note: The box coordinates depend on the mocked image shape,
    # which is not easily controlled here without more extensive mocking of cv2.
    # For this test, we focus on the label and confidence.
    assert "box" in detection

def test_detect_image_no_vision_client(mocker):
    # Mock the vision_client to be None
    mocker.patch('run.vision_client', None)

    dummy_image_bytes = b"dummy image content"
    dummy_file = io.BytesIO(dummy_image_bytes)

    response = client.post(
        "/detect",
        files={"file": ("test.jpg", dummy_file, "image/jpeg")}
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Google Cloud Vision client not initialized. Check server logs."}
