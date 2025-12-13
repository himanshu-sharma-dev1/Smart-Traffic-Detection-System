/**
 * LicensePlateDetector - Two-Stage Pipeline Client
 * 
 * ARCHITECTURE (Improved):
 * ┌──────────────┐   POST /api/ocr    ┌──────────────────────────────────┐
 * │   Frontend   │ ─────────────────▶ │         Backend                  │
 * │              │                    │  1. Plate Detection (YOLOv8)     │
 * │              │                    │  2. OCR (PaddleOCR)              │
 * │              │ ◀───────────────── │  3. Temporal Voting              │
 * └──────────────┘  {plate: "MH12"}   └──────────────────────────────────┘
 * 
 * Benefits:
 * - Plate-only crops = higher accuracy
 * - PaddleOCR > EasyOCR for angled text
 * - Temporal voting = stable readings in video
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class LicensePlateDetector {
    constructor() {
        this.isReady = false;
        this.isProcessing = false;
        this.detectedPlates = new Map(); // trackId -> { text, confidence, timestamp }
        this.pendingTracks = new Set();
        this.plateCooldown = 5000; // Reduced cooldown (server handles temporal voting now)

        // Vehicle classes
        this.vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'vehicle'];

        // Pipeline info
        this.pipelineInfo = null;

        // Check backend status
        this.checkBackendStatus();
    }

    async checkBackendStatus() {
        try {
            const response = await axios.get(`${API_BASE}/api/ocr/status`);
            this.pipelineInfo = response.data;
            this.isReady = response.data.status === 'ready';

            if (this.isReady) {
                console.log('✅ OCR Pipeline ready:', response.data);
            } else {
                console.warn('⚠️ OCR Pipeline not ready:', response.data);
            }
        } catch (error) {
            console.warn('⚠️ OCR backend not available:', error.message);
            this.isReady = true; // Allow attempts anyway
        }
    }

    isVehicle(detection) {
        const className = (detection.class || detection.label || '').toLowerCase();
        return this.vehicleClasses.includes(className);
    }

    /**
     * Send vehicle region to backend for plate detection + OCR
     * 
     * IMPORTANT: We crop from the VIDEO element, not the canvas!
     * The canvas has overlay labels drawn on it (like "CAR89") which
     * confuse the OCR. The raw video has only the actual scene.
     * 
     * @param {HTMLVideoElement} video - The raw video element
     * @param {Object} detection - Detection object with bbox
     */
    async processVehicle(video, detection) {
        const trackId = detection.trackId || detection.id;

        try {
            const [x, y, width, height] = detection.bbox;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            // Crop bounds (with slight padding)
            const padding = 0.05;
            const cropX = Math.max(0, Math.floor(x - width * padding));
            const cropY = Math.max(0, Math.floor(y - height * padding));
            const cropW = Math.min(Math.floor(width * (1 + 2 * padding)), videoWidth - cropX);
            const cropH = Math.min(Math.floor(height * (1 + 2 * padding)), videoHeight - cropY);

            if (cropW < 50 || cropH < 50) {
                console.log(`⏭️ Vehicle ${trackId} too small: ${cropW}x${cropH}`);
                return null;
            }

            // Create high-quality crop from VIDEO (not canvas!)
            const SCALE = 3;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropW * SCALE;
            tempCanvas.height = cropH * SCALE;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';

            // Draw from VIDEO element (raw frame, no overlays)
            tempCtx.drawImage(
                video,  // Source is VIDEO, not canvas!
                cropX, cropY, cropW, cropH,
                0, 0, cropW * SCALE, cropH * SCALE
            );

            // Convert to base64
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.92);

            console.log(`📤 Sending ${cropW * SCALE}x${cropH * SCALE} to OCR pipeline...`);

            // Send to backend (two-stage pipeline)
            const response = await axios.post(`${API_BASE}/api/ocr/plate-base64`, {
                image: base64,
                trackId: trackId,
                useTemporal: true
            });

            if (response.data.success && response.data.plate) {
                return {
                    text: response.data.plate,
                    confidence: response.data.confidence,
                    consensusVotes: response.data.consensusVotes,
                    instantPlate: response.data.instantPlate,
                    plateBbox: response.data.plateBbox,
                    pipeline: response.data.pipeline
                };
            }

            // Log what was detected for debugging
            if (response.data.all_text && response.data.all_text.length > 0) {
                console.log(`📝 OCR candidates: ${response.data.all_text.join(', ')}`);
            }

            return null;
        } catch (error) {
            console.error('OCR request error:', error.message);
            return null;
        }
    }

    /**
     * Queue vehicles for processing (NON-BLOCKING)
     * 
     * @param {HTMLVideoElement} video - Raw video element (no overlays)
     * @param {Array} detections - Array of detection objects
     */
    queueForProcessing(video, detections) {
        if (!this.isReady) return;
        if (!video || !video.videoWidth) return;

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

            console.log(`📤 Processing vehicle ${trackId}...`);

            // Send to server (async) - pass VIDEO not canvas
            this.processVehicle(video, detection)
                .then(result => {
                    if (result) {
                        this.detectedPlates.set(trackId, {
                            text: result.text,
                            confidence: result.confidence,
                            consensusVotes: result.consensusVotes,
                            timestamp: Date.now()
                        });
                        console.log(`✅ Plate: ${result.text} (${result.confidence}%, votes: ${result.consensusVotes?.toFixed(0)}%)`);
                    } else {
                        console.log(`❌ No plate for ${trackId}`);
                    }
                })
                .catch(err => {
                    console.error('OCR error:', err);
                })
                .finally(() => {
                    this.isProcessing = false;
                    this.pendingTracks.delete(trackId);
                });

            // Process one at a time
            break;
        }

        // Cleanup old plates (1 minute)
        for (const [id, data] of this.detectedPlates) {
            if (now - data.timestamp > 60000) {
                this.detectedPlates.delete(id);
            }
        }
    }

    getPlateForTrack(trackId) {
        return this.detectedPlates.get(trackId);
    }

    isPending(trackId) {
        return this.pendingTracks.has(trackId);
    }

    getAllPlates() {
        const plates = [];
        for (const [id, data] of this.detectedPlates) {
            plates.push({
                trackId: id,
                text: data.text,
                confidence: data.confidence,
                consensusVotes: data.consensusVotes,
                timestamp: data.timestamp
            });
        }
        return plates.sort((a, b) => b.timestamp - a.timestamp);
    }

    async clearTemporalVotes(trackId = null) {
        try {
            await axios.post(`${API_BASE}/api/ocr/clear-temporal`, { trackId });
        } catch (e) {
            console.warn('Failed to clear temporal votes:', e);
        }
    }

    reset() {
        this.detectedPlates.clear();
        this.pendingTracks.clear();
        this.clearTemporalVotes();
    }

    terminate() {
        this.reset();
    }
}

// Singleton
let instance = null;

export const getLicensePlateDetector = async () => {
    if (!instance) {
        instance = new LicensePlateDetector();
        instance.isReady = true;
    }
    return instance;
};

export default LicensePlateDetector;

