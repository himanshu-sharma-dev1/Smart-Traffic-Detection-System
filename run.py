from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import numpy as np
import cv2
import base64
import io
import os
import json
from google.cloud import vision
from database import init_db, get_db, DetectionLog
from ultralytics import YOLO

app = FastAPI()

# Initialize Database
init_db()

# Load Local Model (YOLOv8 Nano - small & fast)
# It will download 'yolov8n.pt' automatically on first run if not present
local_model = YOLO("yolov8n.pt")
CONFIDENCE_THRESHOLD = 0.5  # If local confidence is below this, check Cloud

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

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_detections = db.query(DetectionLog).count()
    # Group by label (simplified for now, ideally use GROUP BY)
    detections = db.query(DetectionLog).all()
    label_counts = {}
    for d in detections:
        label_counts[d.label] = label_counts.get(d.label, 0) + 1

    return {
        "total_detections": total_detections,
        "label_counts": label_counts
    }

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Expecting base64 image data
                if "," in data:
                    header, encoded = data.split(",", 1)
                else:
                    encoded = data

                nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # --- HYBRID INFERENCE LOGIC (Step 3) ---
                # 1. Run Local YOLO Model
                results = local_model(frame, verbose=False)
                detections = []
                best_confidence = 0.0

                # Process local results
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        # bounding box
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        name = local_model.names[cls]

                        detections.append({
                            "label": name,
                            "confidence": conf,
                            "box": [int(x1), int(y1), int(x2), int(y2)],
                            "source": "local"
                        })

                        if conf > best_confidence:
                            best_confidence = conf

                        # Draw box on frame
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        cv2.putText(frame, f"{name} {conf:.2f}", (int(x1), int(y1) - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                # 2. Check if we need Cloud Fallback
                # Logic: If we found something but confidence is low, OR if we found nothing, check Cloud?
                # For "Real-time", checking Cloud when nothing is found is too expensive (every frame).
                # So we only check Cloud if we found *something* but are unsure.

                source_used = "local"
                if len(detections) > 0 and best_confidence < CONFIDENCE_THRESHOLD:
                    print(f"Low confidence ({best_confidence:.2f}). Fallback to Cloud Vision API.")

                    if vision_client:
                        try:
                            # Prepare image for Cloud Vision
                            success, encoded_jpg = cv2.imencode('.jpg', frame)
                            if success:
                                content = encoded_jpg.tobytes()
                                image = vision.Image(content=content)
                                response = vision_client.object_localization(image=image)

                                # Overwrite local detections with high-quality cloud ones
                                detections = []
                                source_used = "cloud"

                                for obj in response.localized_object_annotations:
                                    h, w, _ = frame.shape
                                    box = [
                                        int(obj.bounding_poly.normalized_vertices[0].x * w),
                                        int(obj.bounding_poly.normalized_vertices[0].y * h),
                                        int(obj.bounding_poly.normalized_vertices[2].x * w),
                                        int(obj.bounding_poly.normalized_vertices[2].y * h)
                                    ]

                                    detections.append({
                                        "label": obj.name,
                                        "confidence": obj.score,
                                        "box": box,
                                        "source": "cloud"
                                    })

                                    # Redraw with different color (Blue for Cloud)
                                    cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (255, 0, 0), 2)
                                    cv2.putText(frame, f"{obj.name} (Cloud)", (box[0], box[1] - 10),
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

                        except Exception as cloud_err:
                            print(f"Cloud API Failed: {cloud_err}")

                # --- LOGGING TO DB ---
                # Log the primary detection if any
                if detections:
                    # Just log the highest confidence one to avoid spam
                    best_det = max(detections, key=lambda x: x['confidence'])
                    try:
                        new_log = DetectionLog(
                            label=best_det['label'],
                            confidence=best_det['confidence'],
                            source=best_det['source']
                        )
                        db.add(new_log)
                        db.commit()
                    except Exception as db_err:
                        print(f"DB Error: {db_err}")

                # Encode back to send to frontend
                _, buffer = cv2.imencode('.jpg', frame)
                encoded_response = base64.b64encode(buffer).decode('utf-8')

                await websocket.send_text(json.dumps({
                    "image": encoded_response,
                    "detections": detections
                }))

            except Exception as e:
                print(f"Error processing frame: {e}")
                await websocket.send_text(json.dumps({"error": str(e)}))

    except WebSocketDisconnect:
        print("Client disconnected")

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
