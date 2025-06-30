from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
import base64
import io
import os
from google.cloud import vision

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize Google Cloud Vision client
# Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set
try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    print(f"Error initializing Google Cloud Vision client: {e}")
    print("Please ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.")
    vision_client = None # Set to None to handle errors gracefully

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/detect")
async def detect_image(file: UploadFile = File(...)):
    if vision_client is None:
        raise HTTPException(status_code=500, detail="Google Cloud Vision client not initialized. Check server logs.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    # Prepare image for Google Cloud Vision API
    image = vision.Image(content=contents)

    try:
        # Perform object localization (general object detection)
        response = vision_client.object_localization(image=image)
        localized_objects = response.localized_object_annotations

        detected_signs = []
        for obj in localized_objects:
            label = obj.name
            confidence = obj.score
            
            # Google Cloud Vision API returns normalized vertices (0 to 1)
            # Convert them to pixel coordinates
            h, w, _ = frame.shape
            box = [
                int(obj.bounding_poly.normalized_vertices[0].x * w), # x_min
                int(obj.bounding_poly.normalized_vertices[0].y * h), # y_min
                int(obj.bounding_poly.normalized_vertices[2].x * w), # x_max
                int(obj.bounding_poly.normalized_vertices[2].y * h)  # y_max
            ]
            
            detected_signs.append({"label": label, "confidence": float(confidence), "box": box})

    except Exception as e:
        print(f"Error calling Google Cloud Vision API: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image with Vision API: {e}")

    # Encode original image contents to base64
    encoded_image = base64.b64encode(contents).decode('utf-8')

    return {"image": encoded_image, "detections": detected_signs}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
