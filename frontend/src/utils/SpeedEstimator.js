/**
 * SpeedEstimator - Estimates object speed based on frame-to-frame movement
 * 
 * Features:
 * - Track object positions across frames
 * - Calculate pixel displacement OR real-world distance (with calibration)
 * - Convert to real-world speed with calibration
 * - Smooth speed readings with moving average
 * - PERSPECTIVE CALIBRATION: Use homography for accurate speed from angled cameras
 */

import PerspectiveCalibrator from './PerspectiveCalibrator';
import KalmanFilter from './KalmanFilter';

class SpeedEstimator {
    constructor(options = {}) {
        // Calibration: pixels per meter (default tuned for typical webcam)
        this.pixelsPerMeter = options.pixelsPerMeter || 100;

        // Frame rate
        this.fps = options.fps || 30;

        // Tracking filters: { trackId: KalmanFilter }
        this.filters = new Map();

        // Track last update time for pruning
        this.lastUpdates = new Map();

        // Speed history for final output smoothing (UI display)
        this.speedHistory = new Map();

        // Constants
        this.speedUnit = options.speedUnit || 'km/h';
        this.maxSpeed = options.maxSpeed || 200;

        // Perspective Calibration
        this.perspectiveCalibrator = new PerspectiveCalibrator();
        this.usePerspectiveCalibration = false;
    }

    setPerspectiveCalibration(points, realWidth = 20, realHeight = 3) {
        try {
            this.perspectiveCalibrator.setCalibrationPoints(points, realWidth, realHeight);
            this.usePerspectiveCalibration = true;
            console.log('✅ Perspective calibration enabled');
            return true;
        } catch (error) {
            console.error('Failed to set perspective calibration:', error);
            this.usePerspectiveCalibration = false;
            return false;
        }
    }

    getPerspectiveCalibrator() {
        return this.perspectiveCalibrator;
    }

    isPerspectiveCalibrated() {
        return this.usePerspectiveCalibration && this.perspectiveCalibrator.isCalibrated;
    }

    clearPerspectiveCalibration() {
        this.perspectiveCalibrator.reset();
        this.usePerspectiveCalibration = false;
    }

    distance(p1, p2) {
        if (this.isPerspectiveCalibrated()) {
            return this.perspectiveCalibrator.getRealWorldDistance(p1, p2);
        }
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    getCentroid(bbox) {
        const [x, y, width, height] = bbox;
        return {
            x: x + width / 2,
            y: y + height / 2
        };
    }

    update(trackedObjects, currentFps = null) {
        const fps = currentFps || this.fps;
        const dt = 1 / fps; // Time step in seconds
        const now = Date.now();
        const results = [];
        const isPerspective = this.isPerspectiveCalibrated();

        for (const obj of trackedObjects) {
            const trackId = obj.trackId || obj.id;
            let centroid = this.getCentroid(obj.bbox || [obj.x, obj.y, obj.width, obj.height]);

            // Transform raw centroid to perspective space IF calibrated
            // We want to run Kalman Filter in the "Real World" (Meters) space if possible
            // OR we run it in pixel space. 
            // Better strategy: Run Kalman on PIXELS to smooth the tracking box, then convert displacement to meters.
            // Why? Because perspective transform is non-linear, better to smooth raw inputs.

            // Initialize Kalman Filter if new
            if (!this.filters.has(trackId)) {
                // Initialize with 0 velocity
                this.filters.set(trackId, new KalmanFilter(centroid.x, centroid.y, 0, dt));
                this.speedHistory.set(trackId, []);
            }

            const filter = this.filters.get(trackId);

            // 1. Predict (Physics Step)
            filter.predict();

            // 2. Correct (Measurement Step) with new observed centroid
            const estimatedState = filter.correct(centroid.x, centroid.y);

            // 3. Update Last Update Time
            this.lastUpdates.set(trackId, now);

            // 4. Calculate Speed from FILTERED Velocity
            // The filter gives us vx, vy in [pixels / dt]
            const estimate = filter.getEstimate();

            // Current position from filter (smoothest)
            const smoothedPos = { x: estimate.x, y: estimate.y };

            // Previous position (reverse engineer from velocity)
            const prevPos = {
                x: estimate.x - estimate.vx,
                y: estimate.y - estimate.vy
            };

            // Calculate magnitude of movement in one frame (displacement)
            // If calibrated, this 'distance' function handles the perspective math using the SMOOTHED coords
            let displacement = this.distance(prevPos, smoothedPos);

            // Calculate Speed: Distance / Time (dt)
            // displacement is per frame (dt), so speed = displacement / dt => displacement * fps
            let speedMetersPerSecond = 0;

            if (isPerspective) {
                // displacement is already in METERS (from perspectiveCalibrator)
                speedMetersPerSecond = displacement / dt;
            } else {
                // displacement is in PIXELS
                speedMetersPerSecond = (displacement / this.pixelsPerMeter) / dt;
            }

            // Convert to output unit (km/h)
            let speed = speedMetersPerSecond * 3.6;

            // Noise Gate: Kalman is good, but stationary wobble can still produce micro-velocity
            // If raw displacement is tiny, force zero
            const pixelVelocity = Math.sqrt(estimate.vx * estimate.vx + estimate.vy * estimate.vy);
            if (pixelVelocity < 0.5) speed = 0; // Less than 0.5 pixel per frame is stationary
            if (speed < 1.0) speed = 0; // Hard cutoff for display clarity

            // Cap max speed
            speed = Math.min(speed, this.maxSpeed);

            // 5. Final Display Smoothing (UI)
            // Even with Kalman, a 5-frame moving average makes the text easier to read
            const history = this.speedHistory.get(trackId);
            history.push(speed);
            if (history.length > 10) history.shift();

            const avgSpeed = history.reduce((a, b) => a + b, 0) / history.length;

            results.push({
                ...obj,
                speed: Math.round(avgSpeed * 10) / 10,
                speedUnit: this.speedUnit,
                instantSpeed: Math.round(speed * 10) / 10
            });
        }

        // Prune old tracks
        for (const [trackId, lastTime] of this.lastUpdates) {
            if (now - lastTime > 2000) {
                this.filters.delete(trackId);
                this.lastUpdates.delete(trackId);
                this.speedHistory.delete(trackId);
            }
        }

        return results;
    }

    getStats() {
        // Collect current speeds
        const speeds = [];
        for (let [id, history] of this.speedHistory) {
            if (history.length > 0) speeds.push(history[history.length - 1]);
        }

        if (speeds.length === 0) return { avg: 0, max: 0, count: 0 };

        return {
            avg: Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10,
            max: Math.round(Math.max(...speeds) * 10) / 10,
            count: this.filters.size
        };
    }

    reset() {
        this.filters.clear();
        this.lastUpdates.clear();
        this.speedHistory.clear();
    }
}

export default SpeedEstimator;
