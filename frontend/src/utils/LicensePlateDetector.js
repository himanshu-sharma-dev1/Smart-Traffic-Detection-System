/**
 * LicensePlateDetector - Three-Stage Pipeline with YOLOv8
 * 
 * ARCHITECTURE (v2 - With Local Plate Detection):
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │   Frontend                                                           │
 * │   1. Crop vehicle from video                                         │
 * │   2. YOLOv8 Plate Detection (98.1% mAP50) → Find exact plate region  │
 * │   3. Send plate-only crop to backend                                 │
 * └────────────────────────────────────────┬─────────────────────────────┘
 *                                          │ POST /api/ocr
 * ┌────────────────────────────────────────▼─────────────────────────────┐
 * │   Backend                                                            │
 * │   1. OCR (Gemini/EasyOCR) → Read plate text                          │
 * │   2. Temporal Voting → Stabilize readings                            │
 * └──────────────────────────────────────────────────────────────────────┘
 * 
 * Benefits:
 * - YOLOv8 plate detection = 98.1% accuracy finding plates
 * - Plate-only crops = much higher OCR accuracy
 * - No brand logos or overlay labels confusing OCR
 */

import axios from 'axios';
import { getPlateRegionDetector } from './PlateRegionDetector';

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

        // YOLOv8 Plate Detector
        this.plateDetector = null;

        // Initialize
        this.initialize();
    }

    async initialize() {
        // Load YOLOv8 plate detector
        try {
            this.plateDetector = await getPlateRegionDetector();
            console.log('✅ YOLOv8 Plate Detector integrated');
        } catch (error) {
            console.warn('⚠️ YOLOv8 Plate Detector not available:', error.message);
        }

        // Check backend OCR status
        await this.checkBackendStatus();
    }

    async checkBackendStatus() {
        try {
            const response = await axios.get(`${API_BASE}/api/ocr/status`);
            this.pipelineInfo = response.data;
            this.isReady = response.data.status === 'ready';

            if (this.isReady) {
                // Pipeline ready
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
     * NEW: Uses YOLOv8 to detect exact plate region first!
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
                return null;
            }

            // Create high-quality crop from VIDEO (not canvas!)
            const SCALE = 2;  // Reduced scale since we'll crop again
            const vehicleCanvas = document.createElement('canvas');
            vehicleCanvas.width = cropW * SCALE;
            vehicleCanvas.height = cropH * SCALE;
            const vehicleCtx = vehicleCanvas.getContext('2d');

            vehicleCtx.imageSmoothingEnabled = true;
            vehicleCtx.imageSmoothingQuality = 'high';

            // Draw from VIDEO element (raw frame, no overlays)
            vehicleCtx.drawImage(
                video,
                cropX, cropY, cropW, cropH,
                0, 0, cropW * SCALE, cropH * SCALE
            );

            // ==========================================
            // NEW: Use YOLOv8 to detect exact plate region
            // ==========================================
            let imageToSend = vehicleCanvas;
            let plateBbox = null;

            if (this.plateDetector && this.plateDetector.isReady) {
                const plateDetections = await this.plateDetector.detect(vehicleCanvas);

                if (plateDetections.length > 0) {
                    // Found a plate! Crop to just the plate region
                    const plate = plateDetections[0];
                    plateBbox = plate.bbox;

                    const plateCanvas = document.createElement('canvas');
                    const plateWidth = Math.max(100, plate.bbox[2]);
                    const plateHeight = Math.max(30, plate.bbox[3]);

                    // Scale up plate crop for better OCR
                    const plateScale = 3;
                    plateCanvas.width = plateWidth * plateScale;
                    plateCanvas.height = plateHeight * plateScale;

                    const plateCtx = plateCanvas.getContext('2d');
                    plateCtx.imageSmoothingEnabled = true;
                    plateCtx.imageSmoothingQuality = 'high';

                    plateCtx.drawImage(
                        vehicleCanvas,
                        plate.bbox[0], plate.bbox[1], plate.bbox[2], plate.bbox[3],
                        0, 0, plateWidth * plateScale, plateHeight * plateScale
                    );

                    imageToSend = plateCanvas;
                    console.log(`🎯 Plate detected: ${Math.round(plate.confidence * 100)}% confidence`);
                }
            }

            // Convert to base64
            const base64 = imageToSend.toDataURL('image/jpeg', 0.95);

            // Send to backend OCR
            const response = await axios.post(`${API_BASE}/api/ocr/plate-base64`, {
                image: base64,
                trackId: trackId,
                useTemporal: true,
                plateDetected: plateBbox !== null
            });

            if (response.data.success && response.data.plate) {
                return {
                    text: response.data.plate,
                    confidence: response.data.confidence,
                    consensusVotes: response.data.consensusVotes,
                    instantPlate: response.data.instantPlate,
                    plateBbox: plateBbox,
                    pipeline: response.data.pipeline,
                    yoloDetected: plateBbox !== null
                };
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

