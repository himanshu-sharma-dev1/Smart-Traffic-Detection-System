"""
License Plate OCR Route - Server-Side Processing
Uses EasyOCR for accurate plate text extraction

Benefits:
- Truly non-blocking for frontend (network request)
- Better accuracy than Tesseract.js
- FREE and open source
- Handles Indian plates well
"""
import io
import base64
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# Global EasyOCR reader (lazy initialization)
_reader = None

def get_reader():
    """Lazy load EasyOCR reader to avoid slow startup"""
    global _reader
    if _reader is None:
        try:
            import easyocr
            logger.info("🔍 Initializing EasyOCR (first load may take a moment)...")
            # Use both English for better plate detection
            _reader = easyocr.Reader(
                ['en'], 
                gpu=False,
                recognizer=True,
                detector=True
            )
            logger.info("✅ EasyOCR initialized successfully!")
        except ImportError:
            logger.error("❌ EasyOCR not installed. Run: pip install easyocr")
            raise HTTPException(
                status_code=500,
                detail="EasyOCR not installed. Run: pip install easyocr"
            )
    return _reader


def preprocess_for_ocr(img_array):
    """Light preprocessing - don't destroy text"""
    import cv2
    
    # Just slight contrast boost, no heavy processing
    if len(img_array.shape) == 3:
        # Convert to LAB for better contrast
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        # Light CLAHE on L channel only
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge back
        enhanced = cv2.merge([l, a, b])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
    
    return img_array


import re

def is_indian_plate(text):
    """Check if text matches Indian plate pattern"""
    # Indian plates: 2 letters + 2 digits + optional 1-3 letters + 1-4 digits
    # Examples: MH12AB4567, DL9CAB1234, KA01MH2345
    patterns = [
        r'^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$',  # Standard: MH12AB4567
        r'^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$',       # MH12AB4567
        r'^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{1,4}$',  # With spaces
        r'^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$',  # Flexible
    ]
    
    cleaned = text.upper().replace(' ', '').replace('-', '')
    
    for pattern in patterns:
        if re.match(pattern, cleaned):
            return True
    
    # Also check if it contains state code (first 2 chars)
    state_codes = ['MH', 'DL', 'KA', 'TN', 'AP', 'TS', 'UP', 'RJ', 'GJ', 'MP', 'WB', 'PB', 'HR', 'UK', 'JH', 'BR', 'OR', 'CG', 'AS', 'KL', 'GA', 'HP']
    if len(cleaned) >= 6 and cleaned[:2] in state_codes and any(c.isdigit() for c in cleaned):
        return True
    
    return False


def score_plate_candidate(text):
    """Score a text based on how likely it is to be a plate"""
    score = 0
    cleaned = text.upper().replace(' ', '').replace('-', '')
    
    # Length check
    if 6 <= len(cleaned) <= 12:
        score += 20
    
    # Has both letters and numbers
    has_letters = any(c.isalpha() for c in cleaned)
    has_numbers = any(c.isdigit() for c in cleaned)
    if has_letters and has_numbers:
        score += 30
    
    # Matches Indian plate pattern
    if is_indian_plate(cleaned):
        score += 50
    
    # Starts with likely state code
    state_codes = ['MH', 'DL', 'KA', 'TN', 'AP', 'TS', 'UP', 'RJ', 'GJ', 'MP']
    if len(cleaned) >= 2 and cleaned[:2] in state_codes:
        score += 40
    
    # Penalize known non-plate words
    bad_words = ['PHONE', 'CELL', 'BATTERY', 'WIFI', 'SUZUKI', 'MARUTI', 'HONDA', 'TOYOTA']
    for word in bad_words:
        if word in cleaned:
            score -= 100
    
    return score


@router.post("/plate")
async def read_license_plate(file: UploadFile = File(...)):
    """
    Extract license plate text from an image.
    
    Args:
        file: Image file (JPEG, PNG, WebP)
    
    Returns:
        {
            "success": true,
            "plate": "MH12AB1234",
            "confidence": 85,
            "all_text": ["MH12AB1234", "INDIA"]
        }
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Get OCR reader
        reader = get_reader()
        
        # Run OCR
        results = reader.readtext(img_array)
        
        if not results:
            return JSONResponse({
                "success": False,
                "plate": None,
                "confidence": 0,
                "message": "No text detected"
            })
        
        # Find the most likely license plate
        # License plates typically have 6-12 characters, mix of letters and numbers
        best_plate = None
        best_confidence = 0
        all_text = []
        
        for (bbox, text, confidence) in results:
            text = text.strip().upper().replace(' ', '')
            all_text.append(text)
            
            # Filter for plate-like text (alphanumeric, reasonable length)
            if len(text) >= 4 and len(text) <= 15:
                # Check if it looks like a plate (has both letters and numbers)
                has_letters = any(c.isalpha() for c in text)
                has_numbers = any(c.isdigit() for c in text)
                
                if has_letters and has_numbers and confidence > best_confidence:
                    best_plate = text
                    best_confidence = confidence
        
        if best_plate:
            return JSONResponse({
                "success": True,
                "plate": best_plate,
                "confidence": int(best_confidence * 100),
                "all_text": all_text
            })
        else:
            return JSONResponse({
                "success": False,
                "plate": None,
                "confidence": 0,
                "all_text": all_text,
                "message": "No valid plate found"
            })
            
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plate-base64")
async def read_plate_from_base64(data: dict):
    """
    Read license plate from base64 encoded image.
    This is what the frontend will use.
    """
    try:
        image_data = data.get("image", "")
        track_id = data.get("trackId", "unknown")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Remove data URL prefix if present
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image)
        logger.info(f"🔍 Processing plate image for track {track_id}, size: {img_array.shape}")
        
        # Get reader
        reader = get_reader()
        
        # For manual scans, try BOTH original and preprocessed
        if track_id == 'manual-scan':
            # Try original first (often works better for manual crops)
            logger.info("🎯 Manual scan - trying original image first")
            results = reader.readtext(img_array, paragraph=False, detail=1)
            
            if not results:
                # Try preprocessed if original fails
                try:
                    processed = preprocess_for_ocr(img_array)
                    logger.info("🔧 Trying preprocessed version")
                    results = reader.readtext(processed, paragraph=False, detail=1)
                except:
                    pass
        else:
            # Auto scan - use preprocessing
            try:
                processed = preprocess_for_ocr(img_array)
                logger.info("🔧 Image preprocessed with contrast enhancement")
            except Exception as e:
                logger.warning(f"Preprocessing failed, using original: {e}")
                processed = img_array
            
            results = reader.readtext(processed, paragraph=False, detail=1)
        
        # Log all detected text for debugging
        all_text = []
        for (bbox, text, confidence) in results:
            all_text.append(f"{text} ({confidence:.2f})")
        logger.info(f"📝 OCR detected: {all_text}")
        
        if not results:
            return JSONResponse({
                "success": False,
                "trackId": track_id,
                "plate": None,
                "confidence": 0,
                "debug": "No text detected"
            })
        
        # Find best plate using scoring system
        best_plate = None
        best_score = -100
        best_confidence = 0
        
        for (bbox, text, confidence) in results:
            # Clean up text - keep alphanumeric only
            cleaned = ''.join(c for c in text.upper() if c.isalnum() or c == ' ')
            cleaned = cleaned.strip()
            
            if len(cleaned) < 4:
                continue
            
            # Score this candidate
            score = score_plate_candidate(cleaned)
            
            # Also factor in OCR confidence
            combined_score = score + (confidence * 30)
            
            logger.info(f"  Candidate: '{cleaned}' score={score}, conf={confidence:.2f}, combined={combined_score:.1f}")
            
            if combined_score > best_score:
                best_score = combined_score
                best_plate = cleaned.replace(' ', '')
                best_confidence = confidence
        
        if best_plate and best_score > 0:
            logger.info(f"✅ Plate found: {best_plate} (score={best_score:.1f}, conf={best_confidence:.2f})")
        else:
            logger.info(f"❌ No valid plate (best score: {best_score:.1f}) in: {all_text}")
        
        # Only return plate if score is positive (filters false positives)
        valid_plate = best_plate if best_score > 0 else None
        
        return JSONResponse({
            "success": valid_plate is not None,
            "trackId": track_id,
            "plate": valid_plate,
            "confidence": int(best_confidence * 100) if valid_plate else 0,
            "all_text": [t for (_, t, _) in results]
        })
        
    except Exception as e:
        logger.error(f"OCR base64 error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def ocr_status():
    """Check if OCR is available (doesn't load EasyOCR)"""
    try:
        import easyocr
        return {"status": "ready", "engine": "EasyOCR"}
    except ImportError:
        return {"status": "not_installed", "message": "Run: pip install easyocr"}


@router.post("/plate-gemini")
async def read_plate_with_gemini(data: dict):
    """
    Read license plate using Gemini Vision API - more accurate than EasyOCR
    for Indian plates and angled text.
    """
    import os
    import google.generativeai as genai
    
    try:
        image_data = data.get("image", "")
        track_id = data.get("trackId", "unknown")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Get API key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return JSONResponse({
                "success": False,
                "error": "GEMINI_API_KEY not set",
                "plate": None
            })
        
        genai.configure(api_key=api_key)
        
        # Remove data URL prefix if present
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        # Decode image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        logger.info(f"🤖 Gemini scanning plate for track {track_id}")
        
        # Use Gemini Vision
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = """Read the license plate number from this image.

Look for text that appears to be a vehicle registration/license plate.
Indian plates typically have format like: MH12AB4567 or DL9CAB1234

Return ONLY the alphanumeric plate number (like "MH12AB4567").
If you see partial text or unclear text, still return your best guess.
If absolutely no plate-like text is visible, respond with "NONE".

License plate:"""
        
        response = model.generate_content([prompt, image])
        
        result_text = response.text.strip().upper()
        logger.info(f"🤖 Gemini raw response: '{result_text}'")
        
        # Clean up response
        plate = ''.join(c for c in result_text if c.isalnum())
        
        if plate and plate != "NONE" and len(plate) >= 6:
            return JSONResponse({
                "success": True,
                "trackId": track_id,
                "plate": plate,
                "confidence": 95,  # Gemini is usually very accurate
                "engine": "Gemini Vision"
            })
        else:
            return JSONResponse({
                "success": False,
                "trackId": track_id,
                "plate": None,
                "raw_response": result_text,
                "engine": "Gemini Vision"
            })
            
    except Exception as e:
        logger.error(f"Gemini OCR error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "plate": None
        })
