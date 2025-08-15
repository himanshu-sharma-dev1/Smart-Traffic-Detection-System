import os
from celery import Celery
from google.cloud import vision
import numpy as np
import cv2

# Get the broker and backend URLs from environment variables
celery_broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery_result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Initialize Celery
worker = Celery(
    "tasks",
    broker=celery_broker_url,
    backend=celery_result_backend
)

# Initialize Google Cloud Vision client
try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    print(f"Error initializing Google Cloud Vision client in worker: {e}")
    vision_client = None

@worker.task(name="process_image_task")
def process_image_task(image_contents: bytes):
    """
    Celery task to process an image and detect objects using Google Cloud Vision.
    """
    if vision_client is None:
        return {"error": "Google Cloud Vision client not initialized."}

    # Decode the image with OpenCV
    nparr = np.frombuffer(image_contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return {"error": "Could not decode image."}

    # Prepare image for Google Cloud Vision API
    image = vision.Image(content=image_contents)

    try:
        # Perform object localization
        response = vision_client.object_localization(image=image)
        localized_objects = response.localized_object_annotations

        detected_signs = []
        for obj in localized_objects:
            # Convert normalized vertices to pixel coordinates
            h, w, _ = frame.shape
            box = [
                int(obj.bounding_poly.normalized_vertices[0].x * w),
                int(obj.bounding_poly.normalized_vertices[0].y * h),
                int(obj.bounding_poly.normalized_vertices[2].x * w),
                int(obj.bounding_poly.normalized_vertices[2].y * h)
            ]

            detected_signs.append({
                "label": obj.name,
                "confidence": float(obj.score),
                "box": box
            })

        # The task result is the list of detections and the original image
        return {"detections": detected_signs}

    except Exception as e:
        print(f"Error calling Google Cloud Vision API: {e}")
        return {"error": f"Error processing image with Vision API: {e}"}
