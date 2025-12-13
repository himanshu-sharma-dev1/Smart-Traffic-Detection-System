"""
License Plate OCR Route - Two-Stage Pipeline

ARCHITECTURE:
1. Vehicle Detection (frontend) → sends vehicle crop
2. Plate Region Detection (heuristic/YOLO) → finds plate region  
3. OCR (EasyOCR) → reads text from plate-only region
4. Temporal Voting → consensus across frames for live streams

Uses EasyOCR instead of PaddleOCR due to simpler dependencies.
"""
import io
import base64
import logging
import re
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# =============================================================================
# GLOBAL STATE
# =============================================================================

# EasyOCR reader (lazy)
_ocr_reader = None

# Temporal voting storage: {track_id: [list of recent plate readings]}
_temporal_votes = defaultdict(list)
TEMPORAL_WINDOW = 10  # Number of frames to consider

# =============================================================================
# OCR ENGINE (EasyOCR)
# =============================================================================

def get_ocr_reader():
    """Lazy load EasyOCR reader"""
    global _ocr_reader
    
    if _ocr_reader is None:
        try:
            import easyocr
            logger.info("🔍 Initializing EasyOCR...")
            
            _ocr_reader = easyocr.Reader(
                ['en'],
                gpu=False,
                verbose=False
            )
            logger.info("✅ EasyOCR initialized successfully!")
            
        except ImportError:
            logger.error("❌ EasyOCR not installed. Run: pip install easyocr")
            raise HTTPException(
                status_code=500,
                detail="EasyOCR not installed. Run: pip install easyocr"
            )
    
    return _ocr_reader


# =============================================================================
# PLATE VALIDATION
# =============================================================================

def is_indian_plate(text: str) -> bool:
    """Check if text matches Indian plate pattern"""
    patterns = [
        r'^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$',  # MH12AB4567
        r'^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$',       # MH12AB4567
        r'^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{1,4}$',  # With spaces
        r'^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$',  # Flexible
    ]
    
    cleaned = text.upper().replace(' ', '').replace('-', '')
    
    for pattern in patterns:
        if re.match(pattern, cleaned):
            return True
    
    # Check state codes
    state_codes = ['MH', 'DL', 'KA', 'TN', 'AP', 'TS', 'UP', 'RJ', 'GJ', 'MP', 
                   'WB', 'PB', 'HR', 'UK', 'JH', 'BR', 'OR', 'CG', 'AS', 'KL', 'GA', 'HP']
    if len(cleaned) >= 6 and cleaned[:2] in state_codes and any(c.isdigit() for c in cleaned):
        return True
    
    return False


def score_plate_candidate(text: str) -> float:
    """Score how likely text is a license plate"""
    score = 0.0
    cleaned = text.upper().replace(' ', '').replace('-', '')
    
    # Ignore very short text (likely overlay labels like "CAR", "89")
    if len(cleaned) < 6:
        return -50  # Penalize short text heavily
    
    # Length check (Indian plates are typically 9-10 chars)
    if 9 <= len(cleaned) <= 11:
        score += 30  # Perfect length for Indian plates
    elif 6 <= len(cleaned) <= 12:
        score += 15
    
    # Mix of letters and numbers
    has_letters = any(c.isalpha() for c in cleaned)
    has_numbers = any(c.isdigit() for c in cleaned)
    if has_letters and has_numbers:
        score += 30
    
    # Matches Indian pattern
    if is_indian_plate(cleaned):
        score += 50
    
    # Starts with state code
    state_codes = ['MH', 'DL', 'KA', 'TN', 'AP', 'TS', 'UP', 'RJ', 'GJ', 'MP', 'WB', 'PB', 'HR']
    if len(cleaned) >= 2 and cleaned[:2] in state_codes:
        score += 40
    
    # Penalize non-plate words and overlay labels
    bad_words = ['PHONE', 'CELL', 'BATTERY', 'WIFI', 'SUZUKI', 'MARUTI', 'HONDA', 
                 'TOYOTA', 'DIESEL', 'PETROL', 'INDIA', 'CAR', 'TRUCK', 'BUS', 
                 'PERSON', 'VEHICLE', 'READING', 'PLATE']
    for word in bad_words:
        if word in cleaned:
            score -= 100
    
    # Penalize if text looks like a track ID (e.g., "CAR89", "TRUCK12")
    if re.match(r'^(CAR|TRUCK|BUS|VEHICLE)\d+$', cleaned):
        score -= 100
    
    return score


# =============================================================================
# TEMPORAL VOTING (Multi-Frame Consensus)
# =============================================================================

def add_temporal_vote(track_id: str, plate_text: str):
    """Add a plate reading to the temporal voting buffer"""
    if plate_text:
        _temporal_votes[track_id].append(plate_text)
        if len(_temporal_votes[track_id]) > TEMPORAL_WINDOW:
            _temporal_votes[track_id] = _temporal_votes[track_id][-TEMPORAL_WINDOW:]


def get_consensus_plate(track_id: str) -> tuple:
    """Get the most common plate reading across recent frames."""
    votes = _temporal_votes.get(track_id, [])
    
    if not votes:
        return None, 0
    
    from collections import Counter
    counts = Counter(votes)
    most_common = counts.most_common(1)[0]
    
    plate_text = most_common[0]
    vote_count = most_common[1]
    confidence = (vote_count / len(votes)) * 100
    
    return plate_text, confidence


def clear_temporal_votes(track_id: str = None):
    """Clear temporal votes"""
    if track_id:
        _temporal_votes.pop(track_id, None)
    else:
        _temporal_votes.clear()


# =============================================================================
# PLATE REGION DETECTION (Heuristic)
# =============================================================================

def detect_plate_region_heuristic(img_array: np.ndarray):
    """
    Heuristic plate region detection.
    
    Key insight: Real license plates are typically in the CENTER of the vehicle,
    not at the very bottom (where UI overlays/labels often appear).
    
    For front-facing vehicles:
    - Plates are usually in the vertical center to lower-center
    - Horizontally centered
    """
    h, w = img_array.shape[:2]
    
    # Target the CENTER region where real plates appear
    # Avoid bottom 20% where overlay labels often are
    plate_x = int(w * 0.15)
    plate_y = int(h * 0.25)  # Start higher up
    plate_w = int(w * 0.7)
    plate_h = int(h * 0.5)   # Don't go to very bottom
    
    return {
        'x': plate_x,
        'y': plate_y,
        'width': plate_w,
        'height': plate_h
    }


def crop_plate_region(img_array: np.ndarray, region: dict, padding: float = 0.1):
    """Crop the plate region with padding"""
    h, w = img_array.shape[:2]
    
    pad_x = int(region['width'] * padding)
    pad_y = int(region['height'] * padding)
    
    x1 = max(0, region['x'] - pad_x)
    y1 = max(0, region['y'] - pad_y)
    x2 = min(w, region['x'] + region['width'] + pad_x)
    y2 = min(h, region['y'] + region['height'] + pad_y)
    
    return img_array[y1:y2, x1:x2]


# =============================================================================
# TWO-STAGE OCR PIPELINE
# =============================================================================

def run_two_stage_ocr(img_array: np.ndarray, track_id: str = "unknown"):
    """
    Two-stage OCR pipeline:
    1. Detect plate region (heuristic)
    2. Run OCR on plate crop
    3. Add to temporal voting
    """
    try:
        # Stage 1: Detect plate region
        plate_region = detect_plate_region_heuristic(img_array)
        plate_crop = crop_plate_region(img_array, plate_region)
        
        logger.info(f"📍 Plate region: {plate_region['x']},{plate_region['y']} - {plate_region['width']}x{plate_region['height']}")
        
        # Stage 2: Run EasyOCR on BOTH full image and plate crop
        reader = get_ocr_reader()
        
        # Try plate crop first
        results = reader.readtext(plate_crop)
        
        # If no results, try full image
        if not results:
            logger.info("📝 No text in plate region, trying full image...")
            results = reader.readtext(img_array)
        
        if not results:
            return {
                'plate': None,
                'confidence': 0,
                'all_text': [],
                'plate_region': plate_region
            }
        
        # Score candidates and find best plate
        all_text = []
        best_plate = None
        best_score = -100
        best_conf = 0
        
        for (bbox, text, conf) in results:
            # Clean text
            cleaned = ''.join(c for c in text.upper() if c.isalnum())
            all_text.append(f"{cleaned} ({conf:.2f})")
            
            if len(cleaned) >= 4:
                score = score_plate_candidate(cleaned) + (conf * 30)
                
                logger.info(f"  Candidate: '{cleaned}' score={score:.1f}, conf={conf:.2f}")
                
                if score > best_score:
                    best_score = score
                    best_plate = cleaned
                    best_conf = conf
        
        logger.info(f"📝 OCR detected: {all_text}")
        
        # Only accept if score is positive
        valid_plate = best_plate if best_score > 0 else None
        
        # Add to temporal voting
        if valid_plate and track_id != "manual-scan":
            add_temporal_vote(track_id, valid_plate)
        
        return {
            'plate': valid_plate,
            'confidence': int(best_conf * 100) if valid_plate else 0,
            'score': best_score,
            'all_text': all_text,
            'plate_region': plate_region
        }
        
    except Exception as e:
        logger.error(f"Two-stage OCR error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'plate': None,
            'confidence': 0,
            'error': str(e)
        }


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/plate-base64")
async def read_plate_from_base64(data: dict):
    """
    Read license plate from base64 encoded image.
    Uses Gemini Vision as primary (much better for plates) with EasyOCR fallback.
    """
    import os
    import google.generativeai as genai
    
    try:
        image_data = data.get("image", "")
        track_id = data.get("trackId", "unknown")
        use_temporal = data.get("useTemporal", True)
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Remove data URL prefix
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        # Decode
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image)
        logger.info(f"🔍 Processing image for track {track_id}, size: {img_array.shape}")
        
        # Try Gemini Vision first (much better for license plates)
        api_key = os.getenv("GEMINI_API_KEY")
        plate = None
        confidence = 0
        engine_used = "none"
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.0-flash')
                
                prompt = """Look at this image and find ANY text that looks like a vehicle license plate number.

Indian plates typically look like: MH12AB4567, DL9CAB1234, KA01MH2345

Return ONLY the plate number (letters and digits), nothing else.
If you see a license plate, return it like: MH12AB4567
If no plate visible, return: NONE"""
                
                response = model.generate_content([prompt, image])
                result_text = response.text.strip().upper()
                
                logger.info(f"🤖 Gemini response: '{result_text}'")
                
                # Clean and validate
                cleaned = ''.join(c for c in result_text if c.isalnum())
                
                if cleaned and cleaned != "NONE" and len(cleaned) >= 6:
                    # Validate it looks like a plate
                    if score_plate_candidate(cleaned) > 0:
                        plate = cleaned
                        confidence = 95
                        engine_used = "Gemini Vision"
                        logger.info(f"✅ Gemini found plate: {plate}")
                    
            except Exception as e:
                logger.warning(f"Gemini error: {e}")
        
        # Fallback to EasyOCR if Gemini didn't work
        if not plate:
            logger.info("📝 Gemini didn't find plate, trying EasyOCR...")
            result = run_two_stage_ocr(img_array, track_id)
            plate = result.get('plate')
            confidence = result.get('confidence', 0)
            engine_used = "EasyOCR"
        
        # Add to temporal voting
        if plate and track_id != "manual-scan":
            add_temporal_vote(track_id, plate)
        
        # Get temporal consensus
        consensus_plate = None
        consensus_conf = 0
        
        if use_temporal and track_id != "manual-scan":
            consensus_plate, consensus_conf = get_consensus_plate(track_id)
            if consensus_plate:
                logger.info(f"📊 Temporal consensus: {consensus_plate} ({consensus_conf:.0f}% votes)")
        
        # Prefer temporal consensus over single-frame result
        final_plate = consensus_plate if consensus_conf >= 50 else plate
        final_conf = int(consensus_conf) if consensus_plate else confidence
        
        return JSONResponse({
            "success": final_plate is not None,
            "trackId": track_id,
            "plate": final_plate,
            "confidence": final_conf,
            "instantPlate": plate,
            "instantConfidence": confidence,
            "consensusVotes": consensus_conf,
            "engine": engine_used,
            "pipeline": "gemini-first"
        })
        
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plate")
async def read_license_plate(file: UploadFile = File(...)):
    """Upload file endpoint for OCR"""
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image)
        result = run_two_stage_ocr(img_array, "file-upload")
        
        return JSONResponse({
            "success": result['plate'] is not None,
            "plate": result['plate'],
            "confidence": result['confidence'],
            "all_text": result.get('all_text', [])
        })
        
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def ocr_status():
    """Check if OCR is available"""
    easyocr_ok = False
    
    try:
        import easyocr
        easyocr_ok = True
    except ImportError:
        pass
    
    return {
        "status": "ready" if easyocr_ok else "not_ready",
        "engine": "EasyOCR",
        "easyocr": easyocr_ok,
        "pipeline": "two-stage"
    }


@router.post("/clear-temporal")
async def clear_temporal(data: dict = None):
    """Clear temporal voting buffer"""
    track_id = data.get("trackId") if data else None
    clear_temporal_votes(track_id)
    return {"success": True, "cleared": track_id or "all"}


# =============================================================================
# GEMINI VISION ENDPOINT (Fallback)
# =============================================================================

@router.post("/plate-gemini")
async def read_plate_with_gemini(data: dict):
    """Gemini Vision fallback for difficult plates"""
    import os
    import google.generativeai as genai
    
    try:
        image_data = data.get("image", "")
        track_id = data.get("trackId", "unknown")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return JSONResponse({
                "success": False,
                "error": "GEMINI_API_KEY not set",
                "plate": None
            })
        
        genai.configure(api_key=api_key)
        
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = """Read the license plate number from this image.
Look for text that appears to be a vehicle registration/license plate.
Indian plates typically have format like: MH12AB4567 or DL9CAB1234
Return ONLY the alphanumeric plate number (like "MH12AB4567").
If no plate visible, respond with "NONE".
License plate:"""
        
        response = model.generate_content([prompt, image])
        result_text = response.text.strip().upper()
        
        plate = ''.join(c for c in result_text if c.isalnum())
        
        if plate and plate != "NONE" and len(plate) >= 6:
            return JSONResponse({
                "success": True,
                "trackId": track_id,
                "plate": plate,
                "confidence": 95,
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
