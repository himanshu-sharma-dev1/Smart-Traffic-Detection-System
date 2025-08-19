import io
from google.cloud import vision
import numpy as np
import cv2

def get_vision_client():
    """Initializes and returns a Google Cloud Vision client."""
    try:
        return vision.ImageAnnotatorClient()
    except Exception as e:
        print(f"Error initializing Google Cloud Vision client: {e}")
        print("Please ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.")
        return None

def detect_traffic_signs(client, contents):
    """
    Detects traffic signs in an image using the Google Cloud Vision API.

    Args:
        client: The Google Cloud Vision client.
        contents: The byte content of the image.

    Returns:
        A list of dictionaries, where each dictionary represents a detected sign
        and contains the label, confidence score, and bounding box.
    """
    image = vision.Image(content=contents)
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return None, "Could not decode image."

    try:
        response = client.object_localization(image=image)
        localized_objects = response.localized_object_annotations

        detected_signs = []
        h, w, _ = frame.shape
        for obj in localized_objects:
            label = obj.name
            confidence = obj.score

            box = [
                int(obj.bounding_poly.normalized_vertices[0].x * w), # x_min
                int(obj.bounding_poly.normalized_vertices[0].y * h), # y_min
                int(obj.bounding_poly.normalized_vertices[2].x * w), # x_max
                int(obj.bounding_poly.normalized_vertices[2].y * h)  # y_max
            ]

            detected_signs.append({"label": label, "confidence": float(confidence), "box": box})

        return detected_signs, None

    except Exception as e:
        print(f"Error calling Google Cloud Vision API: {e}")
        return None, f"Error processing image with Vision API: {e}"
