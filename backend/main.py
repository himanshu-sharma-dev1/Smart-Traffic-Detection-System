from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import vision_service
import database
import schemas
import json

app = FastAPI()

database.Base.metadata.create_all(bind=database.engine)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

from google.cloud import vision

# Dependency to get the Google Cloud Vision client
def get_vision_client_dep():
    return vision_service.get_vision_client()

@app.get("/ping")
async def ping():
    return {"message": "pong"}

import os

@app.post("/detect")
async def detect_image(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    vision_client: vision.ImageAnnotatorClient = Depends(get_vision_client_dep)
):
    # Check for development mode to return a mock response
    if os.getenv("APP_ENV") == "development":
        mock_signs = [
            {"label": "Speed limit 60", "confidence": 0.95, "box": [50, 50, 200, 200]}
        ]
        # Save mock detections to the database
        for sign in mock_signs:
            new_detection = database.Detection(
                label=sign["label"],
                confidence=sign["confidence"],
                box=json.dumps(sign["box"])
            )
            db.add(new_detection)
        db.commit()
        return {"detections": mock_signs}

    if vision_client is None:
        raise HTTPException(status_code=500, detail="Google Cloud Vision client not initialized. Check server logs.")

    contents = await file.read()

    detected_signs, error = vision_service.detect_traffic_signs(vision_client, contents)

    if error:
        if "Could not decode image" in error:
            raise HTTPException(status_code=400, detail=error)
        else:
            raise HTTPException(status_code=500, detail=error)

    # Save detections to the database
    for sign in detected_signs:
        new_detection = database.Detection(
            label=sign["label"],
            confidence=sign["confidence"],
            box=json.dumps(sign["box"])
        )
        db.add(new_detection)
    db.commit()

    return {"detections": detected_signs}


@app.get("/history", response_model=List[schemas.Detection])
def get_history(db: Session = Depends(database.get_db)):
    detections = db.query(database.Detection).order_by(database.Detection.timestamp.desc()).all()
    return detections


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
