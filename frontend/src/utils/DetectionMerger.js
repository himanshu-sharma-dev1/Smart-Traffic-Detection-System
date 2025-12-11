/**
 * Detection Merger - Combines detections from multiple models
 * 
 * Handles:
 * - COCO-SSD (vehicles, pedestrians, traffic lights)
 * - Custom YOLOv8 (Indian traffic signs)
 * 
 * Features:
 * - Non-Maximum Suppression across models
 * - Duplicate removal (stop sign from both models)
 * - Confidence-based filtering
 */

// Classes that appear in both COCO-SSD and our traffic sign model
const OVERLAPPING_CLASSES = {
    'stop sign': ['stop sign', 'stop_sign', 'stop'],
    'traffic light': ['traffic light', 'traffic_light', 'trafficlight']
};

/**
 * Calculate IoU between two bounding boxes
 * Boxes in format: [x, y, width, height]
 */
export function calculateIoU(box1, box2) {
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
 * Normalize class name for comparison
 */
function normalizeClassName(className) {
    return className.toLowerCase().replace(/[_\s-]/g, '');
}

/**
 * Check if two classes are semantically the same
 */
function areSameClass(class1, class2) {
    const norm1 = normalizeClassName(class1);
    const norm2 = normalizeClassName(class2);

    if (norm1 === norm2) return true;

    // Check overlapping classes
    for (const [key, variants] of Object.entries(OVERLAPPING_CLASSES)) {
        const normVariants = variants.map(normalizeClassName);
        if (normVariants.includes(norm1) && normVariants.includes(norm2)) {
            return true;
        }
    }

    return false;
}

/**
 * Merge detections from COCO-SSD and Traffic Sign detector
 * Applies cross-model NMS to remove duplicates
 * 
 * @param {Array} cocoDetections - Detections from COCO-SSD
 * @param {Array} signDetections - Detections from Traffic Sign model
 * @param {number} iouThreshold - IoU threshold for NMS (default 0.5)
 * @returns {Array} Merged and deduplicated detections
 */
export function mergeDetections(cocoDetections = [], signDetections = [], iouThreshold = 0.5) {
    // Normalize COCO-SSD format to match our standard
    const normalizedCoco = cocoDetections.map(d => ({
        class: d.class,
        score: d.score,
        bbox: d.bbox,
        source: 'coco-ssd'
    }));

    // Combine all detections
    const allDetections = [...normalizedCoco, ...signDetections];

    if (allDetections.length === 0) return [];

    // Sort by confidence (descending)
    allDetections.sort((a, b) => b.score - a.score);

    // Apply cross-model NMS
    const kept = [];
    const suppressed = new Set();

    for (let i = 0; i < allDetections.length; i++) {
        if (suppressed.has(i)) continue;

        kept.push(allDetections[i]);

        for (let j = i + 1; j < allDetections.length; j++) {
            if (suppressed.has(j)) continue;

            // Check if boxes overlap significantly
            const iou = calculateIoU(allDetections[i].bbox, allDetections[j].bbox);

            if (iou > iouThreshold) {
                // If same or similar class, suppress the lower confidence one
                if (areSameClass(allDetections[i].class, allDetections[j].class)) {
                    suppressed.add(j);
                }
            }
        }
    }

    return kept;
}

/**
 * Get color for detection box based on source and class
 */
export function getDetectionColor(detection) {
    if (detection.source === 'traffic_signs') {
        // Traffic signs - various colors based on type
        const className = detection.class.toLowerCase();

        if (className.includes('stop') || className.includes('no_')) {
            return '#FF4444'; // Red for prohibitory
        } else if (className.includes('speed') || className.includes('limit')) {
            return '#FF8800'; // Orange for speed limits
        } else if (className.includes('warning') || className.includes('danger')) {
            return '#FFCC00'; // Yellow for warnings
        } else {
            return '#00AAFF'; // Blue for informatory
        }
    }

    // COCO-SSD detections
    const className = detection.class.toLowerCase();

    if (className === 'person') {
        return '#00FF88'; // Green for pedestrians
    } else if (['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(className)) {
        return '#8844FF'; // Purple for vehicles
    } else if (className === 'traffic light') {
        return '#FFFF00'; // Yellow for traffic lights
    }

    return '#FFFFFF'; // White default
}

/**
 * Format detection label for display
 */
export function formatDetectionLabel(detection) {
    const confidence = Math.round(detection.score * 100);
    const className = detection.class.replace(/_/g, ' ');
    const sourceIcon = detection.source === 'traffic_signs' ? '🚦' : '📷';

    return `${sourceIcon} ${className} ${confidence}%`;
}

export default {
    mergeDetections,
    calculateIoU,
    getDetectionColor,
    formatDetectionLabel
};
