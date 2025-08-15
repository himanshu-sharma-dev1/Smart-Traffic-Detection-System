import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, PropertyMock
from run import app
import io

client = TestClient(app)

# Mock Celery's AsyncResult for testing task endpoints
class MockAsyncResult:
    def __init__(self, task_id, status='PENDING', result=None):
        self.id = task_id
        self.status = status
        self._result = result

    def ready(self):
        return self.status in ['SUCCESS', 'FAILURE']

    def failed(self):
        return self.status == 'FAILURE'

    def get(self):
        return self._result

def test_ping():
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}

def test_detect_image_dispatches_task(mocker):
    # Mock the delay method of our celery task
    mock_task = MagicMock()
    mock_task.id = "test-task-id"
    mocker.patch('celery_worker.process_image_task.delay', return_value=mock_task)

    # Create a dummy image file
    dummy_image_bytes = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    dummy_file = io.BytesIO(dummy_image_bytes)

    response = client.post(
        "/detect",
        files={"file": ("test.jpg", dummy_file, "image/jpeg")}
    )

    # Assertions
    assert response.status_code == 202 # 202 Accepted
    data = response.json()
    assert data["task_id"] == "test-task-id"
    assert "image" in data

    # Ensure the task was called
    from celery_worker import process_image_task
    process_image_task.delay.assert_called_once()

def test_get_task_status(mocker):
    task_id = "test-task-id"

    # Mock the AsyncResult
    mock_async_result = MockAsyncResult(task_id, status='SUCCESS')
    mocker.patch('run.AsyncResult', return_value=mock_async_result)

    response = client.get(f"/tasks/{task_id}/status")

    assert response.status_code == 200
    assert response.json() == {"status": "SUCCESS"}

def test_get_task_result_success(mocker):
    task_id = "test-task-id"
    expected_result = {"detections": [{"label": "Stop Sign", "confidence": 0.95, "box": [1,2,3,4]}]}

    # Mock the AsyncResult
    mock_async_result = MockAsyncResult(task_id, status='SUCCESS', result=expected_result)
    mocker.patch('run.AsyncResult', return_value=mock_async_result)

    response = client.get(f"/tasks/{task_id}/result")

    assert response.status_code == 200
    assert response.json() == {"detections": expected_result["detections"]}

def test_get_task_result_pending(mocker):
    task_id = "test-task-id"

    # Mock the AsyncResult
    mock_async_result = MockAsyncResult(task_id, status='PENDING')
    mocker.patch('run.AsyncResult', return_value=mock_async_result)

    response = client.get(f"/tasks/{task_id}/result")

    assert response.status_code == 404 # Not Found, because it's not ready

def test_get_task_result_failed(mocker):
    task_id = "test-task-id"

    # Mock the AsyncResult
    mock_async_result = MockAsyncResult(task_id, status='FAILURE')
    mocker.patch('run.AsyncResult', return_value=mock_async_result)

    response = client.get(f"/tasks/{task_id}/result")

    assert response.status_code == 500 # Internal Server Error
