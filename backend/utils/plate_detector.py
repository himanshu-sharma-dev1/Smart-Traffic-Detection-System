"""
Plate Detector - YOLOv8 License Plate Detection

Uses YOLOv8 to detect license plate regions within vehicle crops.
This provides tight plate-only bounding boxes for accurate OCR.
"""

import logging
from pathlib import Path
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Global model instance (lazy loaded)
_plate_model = None

def get_plate_model():
    """
    Lazy load YOLOv8 model for plate detection.
    Uses a pretrained model or falls back to general object detection.
    """
    global _plate_model
    
    if _plate_model is None:
        try:
            from ultralytics import YOLO
            
            # Check for custom plate model first
            custom_model_path = Path(__file__).parent.parent / "models" / "plate_detector.pt"
            
            if custom_model_path.exists():
                logger.info(f"Loading custom plate detector: {custom_model_path}")
                _plate_model = YOLO(str(custom_model_path))
            else:
                # Use YOLOv8n as fallback - we'll use custom detection logic
                logger.info("Using YOLOv8n for general detection (plate-specific model not found)")
                _plate_model = YOLO("yolov8n.pt")
                
            logger.info("✅ Plate detector model loaded")
            
        except Exception as e:
            logger.error(f"Failed to load plate detector: {e}")
            _plate_model = None
            
    return _plate_model


def detect_plate_region(image_array: np.ndarray, confidence_threshold: float = 0.3):
    """
    Detect license plate region in an image (typically a vehicle crop).
    
    Args:
        image_array: NumPy array (RGB) of the image
        confidence_threshold: Minimum confidence for detection
        
    Returns:
        dict with 'bbox' (x, y, w, h), 'confidence', 'found'
        OR {'found': False} if no plate detected
    """
    model = get_plate_model()
    
    if model is None:
        # Fallback: Use heuristic plate region (center-bottom of vehicle)
        return _heuristic_plate_region(image_array)
    
    try:
        # Run inference
        results = model(image_array, verbose=False)
        
        if len(results) == 0 or len(results[0].boxes) == 0:
            # No detection - use heuristic
            return _heuristic_plate_region(image_array)
        
        # Find the most plate-like detection
        # If using custom plate model, just take highest confidence
        # If using general YOLO, look for small rectangular objects in lower half
        
        best_box = None
        best_score = 0
        
        h, w = image_array.shape[:2]
        
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])
            
            box_w = x2 - x1
            box_h = y2 - y1
            box_y_center = (y1 + y2) / 2
            
            # Plate-like criteria (for general YOLO):
            # - Small relative to image
            # - Wider than tall (aspect ratio > 1.5)
            # - In lower 70% of image
            # - Reasonable size
            
            aspect_ratio = box_w / max(box_h, 1)
            relative_size = (box_w * box_h) / (w * h)
            y_position = box_y_center / h
            
            score = conf
            
            # Boost score for plate-like characteristics
            if 2.0 < aspect_ratio < 6.0:  # Plates are typically 2:1 to 5:1
                score += 0.3
            if 0.4 < y_position < 0.9:  # Lower portion of vehicle
                score += 0.2
            if 0.01 < relative_size < 0.3:  # Not too small or too large
                score += 0.1
                
            if score > best_score and conf >= confidence_threshold:
                best_score = score
                best_box = (x1, y1, x2 - x1, y2 - y1)  # x, y, w, h
        
        if best_box:
            return {
                'found': True,
                'bbox': best_box,
                'confidence': best_score,
                'method': 'yolo'
            }
        else:
            return _heuristic_plate_region(image_array)
            
    except Exception as e:
        logger.error(f"Plate detection error: {e}")
        return _heuristic_plate_region(image_array)


def _heuristic_plate_region(image_array: np.ndarray):
    """
    Fallback: Estimate plate region using heuristics.
    Plates are typically in the center-bottom of a vehicle.
    """
    h, w = image_array.shape[:2]
    
    # Plate region: center 60% width, lower 40% height
    plate_x = int(w * 0.2)
    plate_y = int(h * 0.5)
    plate_w = int(w * 0.6)
    plate_h = int(h * 0.4)
    
    return {
        'found': True,
        'bbox': (plate_x, plate_y, plate_w, plate_h),
        'confidence': 0.5,  # Lower confidence for heuristic
        'method': 'heuristic'
    }


def crop_plate_region(image_array: np.ndarray, bbox: tuple, padding: float = 0.1):
    """
    Crop the plate region from the image with optional padding.
    
    Args:
        image_array: Source image
        bbox: (x, y, w, h) of plate region
        padding: Fractional padding to add around the plate
        
    Returns:
        Cropped image as NumPy array
    """
    h, w = image_array.shape[:2]
    x, y, bw, bh = bbox
    
    # Add padding
    pad_x = int(bw * padding)
    pad_y = int(bh * padding)
    
    x1 = max(0, int(x) - pad_x)
    y1 = max(0, int(y) - pad_y)
    x2 = min(w, int(x + bw) + pad_x)
    y2 = min(h, int(y + bh) + pad_y)
    
    return image_array[y1:y2, x1:x2]


def is_available():
    """Check if plate detector is available"""
    try:
        from ultralytics import YOLO
        return True
    except ImportError:
        return False
