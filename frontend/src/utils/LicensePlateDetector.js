/**
 * LicensePlateDetector - Server-Side OCR
 * 
 * ARCHITECTURE:
 * ┌──────────────┐   POST /api/ocr    ┌──────────────┐
 * │   Frontend   │ ─────────────────▶ │   Backend    │
 * │ (Never blocks)│                   │   (EasyOCR)  │
 * │              │ ◀───────────────── │              │
 * └──────────────┘  {plate: "MH12"}   └──────────────┘
 * 
 * Benefits:
 * - UI NEVER freezes (async network request)
 * - Better accuracy than Tesseract.js
 * - FREE (EasyOCR is open source)
 * - Works great with Indian plates
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class LicensePlateDetector {
    constructor() {
        this.isReady = false;
        this.isProcessing = false;
        this.detectedPlates = new Map(); // trackId -> { text, confidence, timestamp }
        this.pendingTracks = new Set(); // Track IDs being processed
        this.plateCooldown = 15000; // 15 seconds cooldown

        // Vehicle classes
        this.vehicleClasses = ['car', 'truck', 'bus', 'motorcycle'];

        // Check if backend OCR is available
        this.checkBackendStatus();
    }

    /**
     * Check if backend OCR is available
     */
    async checkBackendStatus() {
        try {
            const response = await axios.get(`${API_BASE}/api/ocr/status`);
            if (response.data.status === 'ready') {
                this.isReady = true;
                console.log('✅ Server-side OCR ready (EasyOCR)');
            }
        } catch (error) {
            console.warn('⚠️ OCR backend not available. Install: pip install easyocr');
            // Still mark as ready to allow frontend to try
            this.isReady = true;
        }
    }

    /**
     * Check if object is a vehicle
     */
    isVehicle(detection) {
        const className = (detection.class || detection.label || '').toLowerCase();
        return this.vehicleClasses.includes(className);
    }

    /**
     * Extract plate region from vehicle bounding box
     * Plates can be anywhere from middle to bottom of vehicle
     */
    getPlateRegion(bbox, canvasWidth, canvasHeight) {
        const [x, y, width, height] = bbox;

        // Plate is typically in middle to lower portion of vehicle
        // For front-facing vehicles, plate is in the lower-middle area
        const plateY = y + height * 0.3;  // Start from 30% down
        const plateHeight = height * 0.5;  // Capture 50% of height
        const plateX = x + width * 0.1;    // 10% margin on sides
        const plateWidth = width * 0.8;    // 80% of width

        return {
            x: Math.max(0, Math.floor(plateX)),
            y: Math.max(0, Math.floor(plateY)),
            width: Math.min(Math.floor(plateWidth), canvasWidth - Math.floor(plateX)),
            height: Math.min(Math.floor(plateHeight), canvasHeight - Math.floor(plateY))
        };
    }

    /**
     * Extract and send vehicle region to server for plate OCR
     * Sends ENTIRE vehicle bounding box scaled up 3x for better OCR
     */
    async processPlateRegion(ctx, detection) {
        const trackId = detection.trackId || detection.id;

        try {
            const [x, y, width, height] = detection.bbox;

            // Ensure we're within canvas bounds
            const canvasWidth = ctx.canvas.width;
            const canvasHeight = ctx.canvas.height;
            const cropX = Math.max(0, Math.floor(x));
            const cropY = Math.max(0, Math.floor(y));
            const cropW = Math.min(Math.floor(width), canvasWidth - cropX);
            const cropH = Math.min(Math.floor(height), canvasHeight - cropY);

            if (cropW < 30 || cropH < 30) {
                console.log(`⏭️ Vehicle ${trackId} too small: ${cropW}x${cropH}`);
                return null;
            }

            // Scale factor - 5x for better OCR accuracy (higher quality)
            const SCALE = 5;

            // Create scaled canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropW * SCALE;
            tempCanvas.height = cropH * SCALE;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw scaled vehicle region
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(
                ctx.canvas,
                cropX, cropY, cropW, cropH,      // Source region
                0, 0, cropW * SCALE, cropH * SCALE  // Scaled destination
            );

            console.log(`📸 Sending ${cropW * SCALE}x${cropH * SCALE} image for OCR`);

            // Convert to base64
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.95);

            // Send to server
            const response = await axios.post(`${API_BASE}/api/ocr/plate-base64`, {
                image: base64,
                trackId: trackId
            });

            if (response.data.success && response.data.plate) {
                return {
                    text: response.data.plate,
                    confidence: response.data.confidence
                };
            }

            // Log what was detected for debugging
            if (response.data.all_text && response.data.all_text.length > 0) {
                console.log(`📝 OCR saw: ${response.data.all_text.join(', ')}`);
            }

            return null;
        } catch (error) {
            console.error('OCR request error:', error.message);
            return null;
        }
    }

    /**
     * Queue vehicles for processing (NON-BLOCKING)
     */
    queueForProcessing(ctx, detections) {
        if (!this.isReady) return;

        const now = Date.now();

        for (const detection of detections) {
            const trackId = detection.trackId || detection.id;
            if (!trackId) continue;

            // Only vehicles
            if (!this.isVehicle(detection)) continue;

            // Check cooldown
            const cached = this.detectedPlates.get(trackId);
            if (cached && now - cached.timestamp < this.plateCooldown) {
                continue;
            }

            // Already processing?
            if (this.pendingTracks.has(trackId)) continue;

            // Only one at a time
            if (this.isProcessing) continue;

            // Mark as processing
            this.isProcessing = true;
            this.pendingTracks.add(trackId);

            console.log(`📤 Sending vehicle ${trackId} to server for OCR...`);

            // Send to server (async, non-blocking!)
            this.processPlateRegion(ctx, detection)
                .then(result => {
                    if (result) {
                        this.detectedPlates.set(trackId, {
                            text: result.text,
                            confidence: result.confidence,
                            timestamp: Date.now()
                        });
                        console.log(`✅ Plate detected: ${result.text} (${result.confidence}%)`);
                    } else {
                        console.log(`❌ No plate found for ${trackId}`);
                    }
                })
                .catch(err => {
                    console.error('OCR error:', err);
                })
                .finally(() => {
                    this.isProcessing = false;
                    this.pendingTracks.delete(trackId);
                });

            // Only process one at a time
            break;
        }

        // Cleanup old plates
        for (const [id, data] of this.detectedPlates) {
            if (now - data.timestamp > 60000) {
                this.detectedPlates.delete(id);
            }
        }
    }

    /**
     * Get plate for a specific track
     */
    getPlateForTrack(trackId) {
        return this.detectedPlates.get(trackId);
    }

    /**
     * Check if pending
     */
    isPending(trackId) {
        return this.pendingTracks.has(trackId);
    }

    /**
     * Get all plates
     */
    getAllPlates() {
        const plates = [];
        for (const [id, data] of this.detectedPlates) {
            plates.push({
                trackId: id,
                text: data.text,
                confidence: data.confidence,
                timestamp: data.timestamp
            });
        }
        return plates.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Reset
     */
    reset() {
        this.detectedPlates.clear();
        this.pendingTracks.clear();
    }

    /**
     * Terminate (no-op for server-side)
     */
    terminate() {
        this.reset();
    }
}

// Singleton - instant creation, no waiting
let instance = null;

export const getLicensePlateDetector = async () => {
    if (!instance) {
        instance = new LicensePlateDetector();
        // Mark ready immediately - backend check happens in background
        instance.isReady = true;
    }
    return instance;
};

export default LicensePlateDetector;
