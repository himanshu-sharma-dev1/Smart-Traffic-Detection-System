/**
 * Traffic Sign Detector - YOLOv8 TensorFlow.js Wrapper
 * 
 * Custom-trained model for Indian traffic sign detection
 * - 85 traffic sign classes
 * - 91.5% mAP50 accuracy
 * - Optimized for real-time browser inference
 */

import * as tf from '@tensorflow/tfjs';

class TrafficSignDetector {
    constructor() {
        this.model = null;
        this.classNames = [];
        this.inputSize = 512;
        this.isLoaded = false;
        // Higher threshold to reduce false positives on untrained signs
        this.confidenceThreshold = 0.65;
        this.iouThreshold = 0.45;
    }

    /**
     * Load the YOLOv8 model and class names
     */
    async loadModel() {
        try {
            console.log('🚦 Loading Traffic Sign model...');

            // Load class names
            const classResponse = await fetch('/models/traffic_signs/class_names.json');
            const classData = await classResponse.json();
            this.classNames = classData.class_names || classData;

            // Load TensorFlow.js model
            this.model = await tf.loadGraphModel('/models/traffic_signs/model.json');

            // Warm up the model
            const dummyInput = tf.zeros([1, this.inputSize, this.inputSize, 3]);
            await this.model.predict(dummyInput);
            dummyInput.dispose();

            this.isLoaded = true;
            console.log(`✅ Traffic Sign model loaded (${this.classNames.length} classes)`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load Traffic Sign model:', error);
            return false;
        }
    }

    /**
     * Preprocess image for YOLOv8 input
     */
    preprocessImage(imageElement) {
        return tf.tidy(() => {
            let tensor = tf.browser.fromPixels(imageElement);

            // Resize to model input size
            tensor = tf.image.resizeBilinear(tensor, [this.inputSize, this.inputSize]);

            // Normalize to 0-1
            tensor = tensor.div(255.0);

            // Add batch dimension
            tensor = tensor.expandDims(0);

            return tensor;
        });
    }

    /**
     * Post-process YOLOv8 output to get detections
     */
    async postProcess(predictions, originalWidth, originalHeight) {
        const detections = [];

        // YOLOv8 output shape: [1, 89, 8400] for 85 classes
        // Format: [x_center, y_center, width, height, class_scores...]
        const predData = await predictions.data();
        const [batch, features, numBoxes] = predictions.shape;

        // Transpose to [8400, 89] for easier processing
        for (let i = 0; i < numBoxes; i++) {
            // Extract box coordinates (normalized 0-1 for 512x512)
            const xCenter = predData[i] / this.inputSize;
            const yCenter = predData[numBoxes + i] / this.inputSize;
            const width = predData[2 * numBoxes + i] / this.inputSize;
            const height = predData[3 * numBoxes + i] / this.inputSize;

            // Find best class
            let maxScore = 0;
            let maxClassIdx = 0;

            for (let c = 0; c < this.classNames.length; c++) {
                const score = predData[(4 + c) * numBoxes + i];
                if (score > maxScore) {
                    maxScore = score;
                    maxClassIdx = c;
                }
            }

            // Filter by confidence
            if (maxScore >= this.confidenceThreshold) {
                // Convert to corner coordinates
                const x1 = (xCenter - width / 2) * originalWidth;
                const y1 = (yCenter - height / 2) * originalHeight;
                const x2 = (xCenter + width / 2) * originalWidth;
                const y2 = (yCenter + height / 2) * originalHeight;

                detections.push({
                    class: this.classNames[maxClassIdx],
                    classIndex: maxClassIdx,
                    score: maxScore,
                    bbox: [
                        Math.max(0, x1),
                        Math.max(0, y1),
                        Math.min(originalWidth, x2 - x1),
                        Math.min(originalHeight, y2 - y1)
                    ],
                    source: 'traffic_signs'
                });
            }
        }

        // Apply NMS
        return this.applyNMS(detections);
    }

    /**
     * Non-Maximum Suppression to remove duplicate boxes
     */
    applyNMS(detections) {
        if (detections.length === 0) return [];

        // Sort by confidence (descending)
        detections.sort((a, b) => b.score - a.score);

        const kept = [];
        const suppressed = new Set();

        for (let i = 0; i < detections.length; i++) {
            if (suppressed.has(i)) continue;

            kept.push(detections[i]);

            for (let j = i + 1; j < detections.length; j++) {
                if (suppressed.has(j)) continue;

                const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
                if (iou > this.iouThreshold) {
                    suppressed.add(j);
                }
            }
        }

        return kept;
    }

    /**
     * Calculate Intersection over Union
     */
    calculateIoU(box1, box2) {
        const [x1, y1, w1, h1] = box1;
        const [x2, y2, w2, h2] = box2;

        const xA = Math.max(x1, x2);
        const yA = Math.max(y1, y2);
        const xB = Math.min(x1 + w1, x2 + w2);
        const yB = Math.min(y1 + h1, y2 + h2);

        const intersection = Math.max(0, xB - xA) * Math.max(0, yB - yA);
        const area1 = w1 * h1;
        const area2 = w2 * h2;
        const union = area1 + area2 - intersection;

        return union > 0 ? intersection / union : 0;
    }

    /**
     * Run detection on an image/video element
     */
    async detect(imageElement) {
        if (!this.isLoaded) {
            console.warn('Traffic Sign model not loaded yet');
            return [];
        }

        const originalWidth = imageElement.videoWidth || imageElement.width;
        const originalHeight = imageElement.videoHeight || imageElement.height;

        // Preprocess
        const inputTensor = this.preprocessImage(imageElement);

        // Run inference
        const predictions = await this.model.predict(inputTensor);

        // Post-process
        const detections = await this.postProcess(predictions, originalWidth, originalHeight);

        // Cleanup
        inputTensor.dispose();
        if (predictions.dispose) predictions.dispose();

        return detections;
    }

    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0.1, Math.min(0.9, threshold));
    }

    /**
     * Get model info
     */
    getInfo() {
        return {
            loaded: this.isLoaded,
            classes: this.classNames.length,
            inputSize: this.inputSize,
            confidenceThreshold: this.confidenceThreshold
        };
    }

    /**
     * Dispose model to free memory
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isLoaded = false;
        }
    }
}

// Singleton instance
let detectorInstance = null;

export async function getTrafficSignDetector() {
    if (!detectorInstance) {
        detectorInstance = new TrafficSignDetector();
        await detectorInstance.loadModel();
    }
    return detectorInstance;
}

export default TrafficSignDetector;
