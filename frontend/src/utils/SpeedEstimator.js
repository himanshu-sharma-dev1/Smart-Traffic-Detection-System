/**
 * SpeedEstimator - Estimates object speed based on frame-to-frame movement
 * 
 * Features:
 * - Track object positions across frames
 * - Calculate pixel displacement
 * - Convert to real-world speed with calibration
 * - Smooth speed readings with moving average
 */

class SpeedEstimator {
    constructor(options = {}) {
        // Calibration: pixels per meter (default tuned for typical webcam at desk distance)
        // Higher value = lower speed readings (more realistic)
        // 100 pixels ≈ 1 meter is a reasonable default for 640px wide video
        this.pixelsPerMeter = options.pixelsPerMeter || 100;

        // Frame rate (for time calculation)
        this.fps = options.fps || 30;

        // Speed smoothing window
        this.smoothingWindow = options.smoothingWindow || 5;

        // Object history: { trackId: { positions: [], speeds: [], lastUpdate: timestamp } }
        this.objectHistory = new Map();

        // Maximum history length
        this.maxHistoryLength = 30;

        // Minimum displacement to register (pixels) - filters camera noise
        // Increased from 2 to 8 to prevent false speed readings from jitter
        this.minDisplacement = options.minDisplacement || 8;

        // Speed unit
        this.speedUnit = options.speedUnit || 'km/h'; // 'km/h', 'm/s', 'mph'

        // Maximum realistic speed (km/h) - filter out impossibly high readings
        this.maxSpeed = options.maxSpeed || 200;
    }

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Get centroid of bounding box
     */
    getCentroid(bbox) {
        const [x, y, width, height] = bbox;
        return {
            x: x + width / 2,
            y: y + height / 2
        };
    }

    /**
     * Convert pixels/second to desired unit
     */
    convertSpeed(pixelsPerSecond) {
        const metersPerSecond = pixelsPerSecond / this.pixelsPerMeter;

        switch (this.speedUnit) {
            case 'm/s':
                return metersPerSecond;
            case 'mph':
                return metersPerSecond * 2.23694;
            case 'km/h':
            default:
                return metersPerSecond * 3.6;
        }
    }

    /**
     * Calculate moving average of speeds
     */
    getSmoothedSpeed(speeds) {
        if (speeds.length === 0) return 0;

        const window = speeds.slice(-this.smoothingWindow);
        const sum = window.reduce((a, b) => a + b, 0);
        return sum / window.length;
    }

    /**
     * Update with new detections
     * @param {Array} trackedObjects - Objects with trackId, class, bbox
     * @param {number} currentFps - Current FPS for accurate timing
     * @returns {Array} Objects with speed estimates
     */
    update(trackedObjects, currentFps = null) {
        const fps = currentFps || this.fps;
        const now = Date.now();
        const results = [];

        for (const obj of trackedObjects) {
            const trackId = obj.trackId || obj.id;
            const centroid = this.getCentroid(obj.bbox || [obj.x, obj.y, obj.width, obj.height]);
            const className = obj.class || obj.label || 'unknown';

            // Initialize history for new objects
            if (!this.objectHistory.has(trackId)) {
                this.objectHistory.set(trackId, {
                    positions: [{ ...centroid, timestamp: now }],
                    speeds: [],
                    lastUpdate: now
                });

                results.push({
                    ...obj,
                    speed: 0,
                    speedUnit: this.speedUnit,
                    direction: null
                });
                continue;
            }

            const history = this.objectHistory.get(trackId);
            const lastPos = history.positions[history.positions.length - 1];
            const timeDelta = (now - lastPos.timestamp) / 1000; // Convert to seconds

            // Calculate displacement
            const displacement = this.distance(lastPos, centroid);

            // Only calculate speed if there's significant movement and time has passed
            if (displacement >= this.minDisplacement && timeDelta > 0) {
                // Calculate instantaneous speed in pixels/second
                const pixelsPerSecond = displacement / timeDelta;

                // Convert to desired unit
                let speed = this.convertSpeed(pixelsPerSecond);

                // Cap speed to maxSpeed to filter out noise-induced spikes
                speed = Math.min(speed, this.maxSpeed);

                // Add to speed history (only if reasonable)
                if (speed > 0.5) { // Ignore very tiny speeds
                    history.speeds.push(speed);
                }

                // Limit history size
                if (history.speeds.length > this.maxHistoryLength) {
                    history.speeds.shift();
                }

                // Calculate direction (angle in degrees)
                const direction = Math.atan2(
                    centroid.y - lastPos.y,
                    centroid.x - lastPos.x
                ) * (180 / Math.PI);

                // Add position to history
                history.positions.push({ ...centroid, timestamp: now });
                if (history.positions.length > this.maxHistoryLength) {
                    history.positions.shift();
                }

                history.lastUpdate = now;

                // Get smoothed speed
                const smoothedSpeed = this.getSmoothedSpeed(history.speeds);

                results.push({
                    ...obj,
                    speed: Math.round(smoothedSpeed * 10) / 10, // Round to 1 decimal
                    speedUnit: this.speedUnit,
                    direction: Math.round(direction),
                    instantSpeed: Math.round(speed * 10) / 10
                });
            } else {
                // No significant movement, use last known speed with decay
                const lastSpeed = history.speeds.length > 0
                    ? history.speeds[history.speeds.length - 1] * 0.9 // Decay
                    : 0;

                if (lastSpeed > 0.5) {
                    history.speeds.push(lastSpeed);
                }

                results.push({
                    ...obj,
                    speed: Math.round(this.getSmoothedSpeed(history.speeds) * 10) / 10,
                    speedUnit: this.speedUnit,
                    direction: null
                });
            }
        }

        // Clean up old object history (objects not seen in 2 seconds)
        const activeIds = new Set(trackedObjects.map(o => o.trackId || o.id));
        for (const [trackId, history] of this.objectHistory) {
            if (!activeIds.has(trackId) && now - history.lastUpdate > 2000) {
                this.objectHistory.delete(trackId);
            }
        }

        return results;
    }

    /**
     * Set calibration value
     * @param {number} pixelsPerMeter - Pixels per meter conversion
     */
    setCalibration(pixelsPerMeter) {
        this.pixelsPerMeter = pixelsPerMeter;
    }

    /**
     * Set speed unit
     * @param {string} unit - 'km/h', 'm/s', or 'mph'
     */
    setSpeedUnit(unit) {
        this.speedUnit = unit;
    }

    /**
     * Get average speed of all tracked objects
     */
    getAverageSpeed() {
        let totalSpeed = 0;
        let count = 0;

        for (const [, history] of this.objectHistory) {
            if (history.speeds.length > 0) {
                totalSpeed += this.getSmoothedSpeed(history.speeds);
                count++;
            }
        }

        return count > 0 ? Math.round((totalSpeed / count) * 10) / 10 : 0;
    }

    /**
     * Get speed statistics
     */
    getStats() {
        const speeds = [];

        for (const [, history] of this.objectHistory) {
            if (history.speeds.length > 0) {
                speeds.push(this.getSmoothedSpeed(history.speeds));
            }
        }

        if (speeds.length === 0) {
            return { avg: 0, max: 0, min: 0, count: 0 };
        }

        return {
            avg: Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10,
            max: Math.round(Math.max(...speeds) * 10) / 10,
            min: Math.round(Math.min(...speeds) * 10) / 10,
            count: speeds.length
        };
    }

    /**
     * Reset all tracking
     */
    reset() {
        this.objectHistory.clear();
    }
}

export default SpeedEstimator;
