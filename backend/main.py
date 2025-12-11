"""
Smart Traffic Detection System - FastAPI Backend
With MongoDB, JWT Authentication, Rate Limiting, and Error Handling
"""
import os
import io
import base64
import logging
from datetime import datetime
from contextlib import asynccontextmanager

import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config.database import connect_to_mongodb, close_mongodb_connection
from config.settings import get_settings
from routes.auth import router as auth_router
from routes.detection import router as detection_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting Smart Traffic Detection API...")
    await connect_to_mongodb()
    logger.info("✅ Application started successfully!")
    
    yield
    
    # Shutdown
    logger.info("📴 Shutting down application...")
    await close_mongodb_connection()
    logger.info("👋 Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Smart Traffic Detection API",
    description="AI-powered traffic detection with user authentication, rate limiting, and history",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware for OAuth (required by authlib)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,  # Reuse JWT secret for session
    max_age=3600,  # 1 hour session
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "error_code": "INTERNAL_ERROR"
        }
    )


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(detection_router, prefix="/api")

# WebSocket routes (no prefix needed)
from routes.websocket import router as websocket_router
app.include_router(websocket_router)

# OAuth2 routes
from routes.oauth import router as oauth_router
app.include_router(oauth_router, prefix="/api")

# OCR routes (License Plate Detection)
from routes.ocr import router as ocr_router
app.include_router(ocr_router, prefix="/api")



# ============================================
# PUBLIC ENDPOINTS (No auth required)
# ============================================

@app.get("/")
async def root():
    """API Health Check"""
    return {
        "status": "online",
        "message": "Smart Traffic Detection API v2.0",
        "docs": "/docs",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ping")
async def ping():
    """Ping endpoint for health checks"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    from config.database import get_database
    
    db = get_database()
    db_status = "connected" if db is not None else "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/detect")
@limiter.limit("20/minute")
async def detect_objects(request: Request, file: UploadFile = File(...)):
    """
    Public detection endpoint (no auth required)
    
    Process an uploaded image and detect objects using Google Gemini Vision API
    Returns annotated image and detection results
    """
    import google.generativeai as genai
    import json
    import re
    
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        height, width = image.shape[:2]
        result_image = image.copy()
        
        # Configure Gemini
        genai.configure(api_key=settings.gemini_api_key)
        
        # Create PIL Image for Gemini
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Use Gemini Vision to detect objects
        model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
        
        prompt = """Analyze this image and detect all visible objects. For each object, provide:
1. label: specific name (car, person, phone, hand, face, sign, etc.)
2. confidence: 0.7 to 0.99
3. bbox: bounding box as [x_min, y_min, x_max, y_max] in percentages (0-100) of image dimensions

Return ONLY a valid JSON array:
[{"label": "person", "confidence": 0.95, "bbox": [10, 20, 40, 80]}]

The bbox values are percentages: x_min=10 means 10% from left edge.
If no objects found, return: []"""
        
        try:
            response = model.generate_content([prompt, pil_image])
            response_text = response.text.strip()
            
            # Parse JSON from response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                detected_objects = json.loads(json_match.group())
            else:
                detected_objects = []
        except Exception as gemini_error:
            logger.warning(f"Gemini API error: {gemini_error}")
            detected_objects = []
        
        detections = []
        colors = [
            (46, 204, 113),   # Green
            (52, 152, 219),   # Blue
            (155, 89, 182),   # Purple
            (231, 76, 60),    # Red
            (241, 196, 15),   # Yellow
            (26, 188, 156),   # Teal
        ]
        
        for i, obj in enumerate(detected_objects[:15]):
            label = str(obj.get("label", "object")).title()
            confidence = min(max(float(obj.get("confidence", 0.8)), 0.5), 0.99)
            bbox = obj.get("bbox", [25, 25, 75, 75])
            
            # Convert percentage to pixel coordinates
            try:
                x1 = int(float(bbox[0]) / 100 * width)
                y1 = int(float(bbox[1]) / 100 * height)
                x2 = int(float(bbox[2]) / 100 * width)
                y2 = int(float(bbox[3]) / 100 * height)
                
                # Ensure valid bounds
                x1 = max(0, min(x1, width - 10))
                y1 = max(0, min(y1, height - 10))
                x2 = max(x1 + 10, min(x2, width))
                y2 = max(y1 + 10, min(y2, height))
            except (IndexError, TypeError, ValueError):
                # Fallback to center box
                x1, y1, x2, y2 = width//4, height//4, 3*width//4, 3*height//4
            
            color = colors[i % len(colors)]
            
            # Draw bounding box
            cv2.rectangle(result_image, (x1, y1), (x2, y2), color, 3)
            
            # Draw corners
            corner = min(25, (x2-x1)//4, (y2-y1)//4)
            for cx, cy in [(x1, y1), (x2, y1), (x1, y2), (x2, y2)]:
                dx = corner if cx == x1 else -corner
                dy = corner if cy == y1 else -corner
                cv2.line(result_image, (cx, cy), (cx + dx, cy), color, 4)
                cv2.line(result_image, (cx, cy), (cx, cy + dy), color, 4)
            
            # Draw label
            label_text = f"{label} {confidence:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (tw, th), _ = cv2.getTextSize(label_text, font, 0.7, 2)
            cv2.rectangle(result_image, (x1, y1 - th - 12), (x1 + tw + 10, y1), color, -1)
            cv2.putText(result_image, label_text, (x1 + 5, y1 - 6), font, 0.7, (255, 255, 255), 2)
            
            detections.append({
                "label": label,
                "confidence": round(confidence, 2),
                "box": [x1, y1, x2, y2]
            })
        
        # Encode result image
        _, buffer = cv2.imencode('.jpg', result_image, [cv2.IMWRITE_JPEG_QUALITY, 95])
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"Gemini Detection: {len(detections)} objects found")
        
        return {
            "success": True,
            "image": img_base64,
            "detections": detections,
            "object_count": len(detections),
            "timestamp": datetime.utcnow().isoformat(),
            "model": "gemini-2.5-flash"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
