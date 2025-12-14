/**
 * PlateRegionDetector - YOLOv8 License Plate Detection
 * 
 * Custom trained model achieving:
 * - mAP50: 98.1%
 * - Precision: 97.5%
 * - Recall: 96.1%
 * 
 * Use: Detect license plate bounding boxes for OCR pipeline
 */
import * as tf from '@tensorflow/tfjs';

class PlateRegionDetector {
    constructor() {
        this.model = null;
        this.isLoading = false;
        this.isReady = false;
        this.inputSize = 640;
        this.confidenceThreshold = 0.25;  // Lower threshold, NMS will filter
        this.iouThreshold = 0.45;
    }

    async loadModel() {
        if (this.model || this.isLoading) return this.isReady;
        
        this.isLoading = true;
        try {
            console.log('🚗 Loading License Plate Detector model...');
            this.model = await tf.loadGraphModel('/models/plate_detector/model.json');
            
            // Warm up with dummy input
            const dummy = tf.zeros([1, this.inputSize, this.inputSize, 3]);
            const warmup = this.model.predict(dummy);
            if (Array.isArray(warmup)) {
                warmup.forEach(t => t.dispose());
            } else {
                warmup.dispose();
            }
            dummy.dispose();
            
            this.isReady = true;
            console.log('✅ License Plate Detector ready! (98.1% mAP50)');
            return true;
        } catch (error) {
            console.error('❌ Failed to load plate detector:', error);
            this.isReady = false;
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Detect license plates in an image
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageElement
     * @returns {Array} Array of {bbox: [x, y, w, h], confidence, class}
     */
    async detect(imageElement) {
        if (!this.model || !this.isReady) {
            console.warn('Plate detector not ready');
            return [];
        }

        const origWidth = imageElement.videoWidth || imageElement.width;
        const origHeight = imageElement.videoHeight || imageElement.height;

        // Run inference in tf.tidy to auto-cleanup tensors
        const predictions = tf.tidy(() => {
            // Convert image to tensor
            let tensor = tf.browser.fromPixels(imageElement);
            
            // Resize to model input size (640x640)
            tensor = tf.image.resizeBilinear(tensor, [this.inputSize, this.inputSize]);
            
            // Normalize to 0-1
            tensor = tensor.div(255.0);
            
            // Add batch dimension [1, 640, 640, 3]
            tensor = tensor.expandDims(0);

            // Run inference
            return this.model.predict(tensor);
        });

        // Post-process predictions
        const boxes = await this.postProcess(predictions, origWidth, origHeight);
        
        // Cleanup
        if (Array.isArray(predictions)) {
            predictions.forEach(t => t.dispose());
        } else {
            predictions.dispose();
        }

        return boxes;
    }

    async postProcess(predictions, origWidth, origHeight) {
        // YOLOv8 output shape: [1, 5, 8400] or [1, 84, 8400]
        // For single class (license_plate): [1, 5, 8400]
        // Format: [x_center, y_center, width, height, confidence]
        
        let output;
        if (Array.isArray(predictions)) {
            output = await predictions[0].array();
        } else {
            output = await predictions.array();
        }
        
        // Shape is [1, 5, 8400], we need [1, 8400, 5]
        // Transpose: batch stays, swap dims 1 and 2
        const batch = output[0];  // [5, 8400]
        const numPredictions = batch[0].length;  // 8400
        
        const boxes = [];
        
        for (let i = 0; i < numPredictions; i++) {
            // Get values for this prediction
            const xCenter = batch[0][i];
            const yCenter = batch[1][i];
            const width = batch[2][i];
            const height = batch[3][i];
            const confidence = batch[4][i];
            
            if (confidence >= this.confidenceThreshold) {
                // Convert from 640x640 normalized to original image coordinates
                const x = (xCenter - width / 2) / this.inputSize * origWidth;
                const y = (yCenter - height / 2) / this.inputSize * origHeight;
                const w = width / this.inputSize * origWidth;
                const h = height / this.inputSize * origHeight;
                
                // Clamp to image bounds
                const x1 = Math.max(0, x);
                const y1 = Math.max(0, y);
                const x2 = Math.min(origWidth, x + w);
                const y2 = Math.min(origHeight, y + h);
                
                if (x2 > x1 && y2 > y1) {
                    boxes.push({
                        bbox: [x1, y1, x2 - x1, y2 - y1],
                        confidence: confidence,
                        class: 'license_plate'
                    });
                }
            }
        }
        
        // Apply Non-Maximum Suppression
        return this.nms(boxes, this.iouThreshold);
    }

    nms(boxes, iouThreshold) {
        if (boxes.length <= 1) return boxes;

        // Sort by confidence (highest first)
        boxes.sort((a, b) => b.confidence - a.confidence);
        
        const kept = [];
        const suppressed = new Set();

        for (let i = 0; i < boxes.length; i++) {
            if (suppressed.has(i)) continue;
            
            kept.push(boxes[i]);
            
            for (let j = i + 1; j < boxes.length; j++) {
                if (suppressed.has(j)) continue;
                
                if (this.iou(boxes[i].bbox, boxes[j].bbox) > iouThreshold) {
                    suppressed.add(j);
                }
            }
        }

        return kept;
    }

    iou(box1, box2) {
        const [x1, y1, w1, h1] = box1;
        const [x2, y2, w2, h2] = box2;

        const xi1 = Math.max(x1, x2);
        const yi1 = Math.max(y1, y2);
        const xi2 = Math.min(x1 + w1, x2 + w2);
        const yi2 = Math.min(y1 + h1, y2 + h2);

        if (xi2 <= xi1 || yi2 <= yi1) return 0;

        const intersection = (xi2 - xi1) * (yi2 - yi1);
        const union = w1 * h1 + w2 * h2 - intersection;

        return intersection / union;
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isReady = false;
            console.log('🗑️ Plate detector disposed');
        }
    }
}

// Singleton instance
let instance = null;

export const getPlateRegionDetector = async () => {
    if (!instance) {
        instance = new PlateRegionDetector();
    }
    if (!instance.isReady && !instance.isLoading) {
        await instance.loadModel();
    }
    return instance;
};

export default PlateRegionDetector;
