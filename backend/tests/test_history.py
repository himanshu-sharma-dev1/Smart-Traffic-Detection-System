import os

# The test_client fixture is now defined in conftest.py

def test_history_endpoint(test_client):
    # Set APP_ENV to development to use mock data
    os.environ["APP_ENV"] = "development"

    # 1. Call /detect to populate the database
    response_detect = test_client.post("/detect", files={"file": ("test.jpg", b"")})
    assert response_detect.status_code == 200
    detections = response_detect.json()["detections"]
    assert len(detections) == 1
    assert detections[0]["label"] == "Speed limit 60"

    # 2. Call /history to get the data
    response_history = test_client.get("/history")
    assert response_history.status_code == 200
    history = response_history.json()

    # 3. Assert the history contains the new detection
    assert len(history) > 0
    assert history[0]["label"] == "Speed limit 60"
    assert "timestamp" in history[0]

    # Clean up the environment variable
    del os.environ["APP_ENV"]
