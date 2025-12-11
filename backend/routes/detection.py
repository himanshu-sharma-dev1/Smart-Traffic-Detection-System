"""
Detection Routes - Image Detection and History
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from datetime import datetime
from bson import ObjectId
from typing import Optional, List
import base64
import io
from PIL import Image

from config.database import get_database
from models.schemas import (
    DetectionCreate, DetectionResponse, DetectedObject,
    DetectionListResponse, MessageResponse, UserStats
)
from utils.auth import get_current_user, get_optional_user
from utils.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/detections", tags=["Detections"])


def compress_image(image_data: bytes, max_size: int = 200) -> str:
    """Compress image to thumbnail for storage"""
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # Calculate new size maintaining aspect ratio
        ratio = max_size / max(img.size)
        new_size = tuple(int(dim * ratio) for dim in img.size)
        
        # Resize and convert
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to JPEG
        buffer = io.BytesIO()
        img.convert("RGB").save(buffer, format="JPEG", quality=60)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception:
        return None


@router.post("/", response_model=DetectionResponse)
async def create_detection(
    detection_data: DetectionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Save a detection result to user's history
    
    Requires authentication
    """
    db = get_database()
    
    # Create thumbnail from base64 image
    thumbnail = None
    if detection_data.image_base64:
        try:
            # Remove data URL prefix if present
            img_data = detection_data.image_base64
            if ',' in img_data:
                img_data = img_data.split(',')[1]
            
            image_bytes = base64.b64decode(img_data)
            thumbnail = compress_image(image_bytes)
        except Exception:
            pass
    
    # Calculate stats
    detections = detection_data.detections
    avg_confidence = (
        sum(d.confidence for d in detections) / len(detections)
        if detections else 0
    )
    
    # Create detection document
    detection_doc = {
        "user_id": ObjectId(current_user["id"]),
        "detections": [d.model_dump() for d in detections],
        "object_count": len(detections),
        "avg_confidence": avg_confidence,
        "source": detection_data.source,
        "thumbnail": thumbnail,
        "created_at": datetime.utcnow()
    }
    
    result = await db.detections.insert_one(detection_doc)
    
    return DetectionResponse(
        id=str(result.inserted_id),
        user_id=current_user["id"],
        detections=[DetectedObject(**d) for d in detection_doc["detections"]],
        object_count=detection_doc["object_count"],
        avg_confidence=detection_doc["avg_confidence"],
        source=detection_doc["source"],
        created_at=detection_doc["created_at"],
        thumbnail=thumbnail
    )


@router.get("/", response_model=DetectionListResponse)
async def get_detections(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's detection history with pagination
    """
    db = get_database()
    
    # Build query
    query = {"user_id": ObjectId(current_user["id"])}
    if source:
        query["source"] = source
    
    # Get total count
    total = await db.detections.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    cursor = db.detections.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    detections = []
    async for doc in cursor:
        detections.append(DetectionResponse(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            detections=[DetectedObject(**d) for d in doc["detections"]],
            object_count=doc["object_count"],
            avg_confidence=doc["avg_confidence"],
            source=doc.get("source", "upload"),
            created_at=doc["created_at"],
            thumbnail=doc.get("thumbnail")
        ))
    
    return DetectionListResponse(
        detections=detections,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/stats", response_model=UserStats)
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """
    Get user's detection statistics
    """
    db = get_database()
    
    user_id = ObjectId(current_user["id"])
    
    # Aggregate stats
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_detections": {"$sum": 1},
            "total_objects": {"$sum": "$object_count"},
            "avg_confidence": {"$avg": "$avg_confidence"},
            "last_detection": {"$max": "$created_at"}
        }}
    ]
    
    result = await db.detections.aggregate(pipeline).to_list(1)
    
    if not result:
        return UserStats(
            total_detections=0,
            total_objects=0,
            avg_confidence=0,
            top_object="-",
            last_detection=None
        )
    
    stats = result[0]
    
    # Get top object
    top_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$unwind": "$detections"},
        {"$group": {
            "_id": "$detections.label",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    
    top_result = await db.detections.aggregate(top_pipeline).to_list(1)
    top_object = top_result[0]["_id"] if top_result else "-"
    
    return UserStats(
        total_detections=stats["total_detections"],
        total_objects=stats["total_objects"],
        avg_confidence=round(stats["avg_confidence"] * 100, 1) if stats["avg_confidence"] else 0,
        top_object=top_object,
        last_detection=stats["last_detection"]
    )


@router.get("/{detection_id}", response_model=DetectionResponse)
async def get_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific detection by ID
    """
    db = get_database()
    
    if not ObjectId.is_valid(detection_id):
        raise ValidationError("Invalid detection ID")
    
    detection = await db.detections.find_one({
        "_id": ObjectId(detection_id),
        "user_id": ObjectId(current_user["id"])
    })
    
    if not detection:
        raise NotFoundError("Detection")
    
    return DetectionResponse(
        id=str(detection["_id"]),
        user_id=str(detection["user_id"]),
        detections=[DetectedObject(**d) for d in detection["detections"]],
        object_count=detection["object_count"],
        avg_confidence=detection["avg_confidence"],
        source=detection.get("source", "upload"),
        created_at=detection["created_at"],
        thumbnail=detection.get("thumbnail")
    )


@router.delete("/{detection_id}", response_model=MessageResponse)
async def delete_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a detection from history
    """
    db = get_database()
    
    if not ObjectId.is_valid(detection_id):
        raise ValidationError("Invalid detection ID")
    
    result = await db.detections.delete_one({
        "_id": ObjectId(detection_id),
        "user_id": ObjectId(current_user["id"])
    })
    
    if result.deleted_count == 0:
        raise NotFoundError("Detection")
    
    return MessageResponse(message="Detection deleted successfully")


@router.delete("/", response_model=MessageResponse)
async def clear_all_detections(current_user: dict = Depends(get_current_user)):
    """
    Clear all user's detection history
    """
    db = get_database()
    
    result = await db.detections.delete_many({
        "user_id": ObjectId(current_user["id"])
    })
    
    return MessageResponse(
        message=f"Deleted {result.deleted_count} detections"
    )
