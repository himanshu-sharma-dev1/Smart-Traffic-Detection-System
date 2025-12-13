/**
 * PerspectiveCalibrator - Enables accurate speed measurement from angled cameras
 * 
 * Uses homography (perspective transformation) to convert pixel coordinates
 * to real-world "bird's eye view" coordinates, accounting for perspective distortion.
 * 
 * HOW IT WORKS:
 * 1. User defines 4 points on the video forming a quadrilateral (e.g., lane markings)
 * 2. User specifies the real-world dimensions (e.g., 20m x 3m)
 * 3. We compute a 3x3 homography matrix to transform coordinates
 * 4. All position tracking happens in the transformed "real-world" space
 * 
 * MATH: Uses SVD-based homography computation (Direct Linear Transform)
 */

class PerspectiveCalibrator {
    constructor() {
        // 4 source points in video coordinates (user-defined quadrilateral)
        this.sourcePoints = null;
        
        // Destination rectangle in real-world meters
        this.destWidth = 20;  // meters (length of calibration zone)
        this.destHeight = 3;  // meters (width of lane)
        
        // 3x3 homography matrix
        this.homographyMatrix = null;
        
        // Inverse matrix for reverse transformation
        this.inverseMatrix = null;
        
        // Calibration state
        this.isCalibrated = false;
        
        // Scale factor for better numerical stability
        this.scaleFactor = 100; // 1 meter = 100 units in dest space
    }
    
    /**
     * Set the 4 calibration points from user selection
     * @param {Array} points - [{x, y}, {x, y}, {x, y}, {x, y}] in clockwise order
     * @param {number} realWidth - Real-world width in meters (e.g., 20m)
     * @param {number} realHeight - Real-world height in meters (e.g., 3m lane width)
     */
    setCalibrationPoints(points, realWidth = 20, realHeight = 3) {
        if (points.length !== 4) {
            throw new Error('Exactly 4 calibration points required');
        }
        
        this.sourcePoints = points;
        this.destWidth = realWidth;
        this.destHeight = realHeight;
        
        // Define destination rectangle (bird's eye view)
        // Scaled for numerical stability
        const destPoints = [
            { x: 0, y: 0 },
            { x: realWidth * this.scaleFactor, y: 0 },
            { x: realWidth * this.scaleFactor, y: realHeight * this.scaleFactor },
            { x: 0, y: realHeight * this.scaleFactor }
        ];
        
        // Compute homography matrix
        this.homographyMatrix = this.computeHomography(points, destPoints);
        this.inverseMatrix = this.computeHomography(destPoints, points);
        this.isCalibrated = true;
        
        console.log('Perspective calibration complete:', {
            sourcePoints: points,
            destDimensions: `${realWidth}m x ${realHeight}m`,
            matrixComputed: !!this.homographyMatrix
        });
        
        return this.isCalibrated;
    }
    
    /**
     * Compute 3x3 homography matrix using Direct Linear Transform (DLT)
     * Maps source points to destination points
     */
    computeHomography(srcPoints, dstPoints) {
        // Build the 8x9 matrix A for Ah = 0 (SVD approach)
        const A = [];
        
        for (let i = 0; i < 4; i++) {
            const [xs, ys] = [srcPoints[i].x, srcPoints[i].y];
            const [xd, yd] = [dstPoints[i].x, dstPoints[i].y];
            
            // Two equations per point
            A.push([-xs, -ys, -1, 0, 0, 0, xs * xd, ys * xd, xd]);
            A.push([0, 0, 0, -xs, -ys, -1, xs * yd, ys * yd, yd]);
        }
        
        // Solve using simplified pseudo-inverse (for 8x9 system)
        // Extract the null space using the last row of V from SVD
        const h = this.solveHomography(A);
        
        // Reshape into 3x3 matrix
        return [
            [h[0], h[1], h[2]],
            [h[3], h[4], h[5]],
            [h[6], h[7], h[8]]
        ];
    }
    
    /**
     * Solve the homography system Ah = 0
     * Uses a simplified approach suitable for 4-point correspondences
     */
    solveHomography(A) {
        // For 4 points, we have exactly 8 equations and 9 unknowns
        // We can solve by setting h[8] = 1 and solving the 8x8 system
        
        // Rearrange: A_8x8 * h_8x1 = b_8x1
        const A8 = A.map(row => row.slice(0, 8));
        const b = A.map(row => -row[8]);
        
        // Solve using Gaussian elimination with partial pivoting
        const h8 = this.gaussianElimination(A8, b);
        
        // Add h[8] = 1
        return [...h8, 1];
    }
    
    /**
     * Gaussian elimination with partial pivoting
     */
    gaussianElimination(A, b) {
        const n = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Forward elimination
        for (let col = 0; col < n; col++) {
            // Find pivot
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
            // Check for singular matrix
            if (Math.abs(aug[col][col]) < 1e-10) {
                console.warn('Near-singular matrix in homography computation');
                aug[col][col] = 1e-10;
            }
            
            // Eliminate column
            for (let row = col + 1; row < n; row++) {
                const factor = aug[row][col] / aug[col][col];
                for (let j = col; j <= n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }
        
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i];
        }
        
        return x;
    }
    
    /**
     * Transform a point from video coordinates to real-world coordinates
     * @param {Object} point - {x, y} in video pixels
     * @returns {Object} {x, y} in real-world meters
     */
    transformPoint(point) {
        if (!this.isCalibrated || !this.homographyMatrix) {
            return point; // Return unchanged if not calibrated
        }
        
        const H = this.homographyMatrix;
        const { x, y } = point;
        
        // Apply homography: [x', y', w'] = H * [x, y, 1]
        const w = H[2][0] * x + H[2][1] * y + H[2][2];
        
        if (Math.abs(w) < 1e-10) {
            return point; // Avoid division by zero
        }
        
        const xPrime = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
        const yPrime = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;
        
        // Convert from scaled units back to meters
        return {
            x: xPrime / this.scaleFactor,
            y: yPrime / this.scaleFactor
        };
    }
    
    /**
     * Transform a point from real-world coordinates back to video coordinates
     * @param {Object} point - {x, y} in real-world meters
     * @returns {Object} {x, y} in video pixels
     */
    inverseTransformPoint(point) {
        if (!this.isCalibrated || !this.inverseMatrix) {
            return point;
        }
        
        const H = this.inverseMatrix;
        // Scale to internal units
        const x = point.x * this.scaleFactor;
        const y = point.y * this.scaleFactor;
        
        const w = H[2][0] * x + H[2][1] * y + H[2][2];
        
        if (Math.abs(w) < 1e-10) {
            return point;
        }
        
        return {
            x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
            y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w
        };
    }
    
    /**
     * Calculate real-world distance between two points
     * @param {Object} p1 - First point in video coordinates
     * @param {Object} p2 - Second point in video coordinates
     * @returns {number} Distance in meters
     */
    getRealWorldDistance(p1, p2) {
        if (!this.isCalibrated) {
            // Fallback: use pixel distance with rough estimate
            const pixelDist = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            return pixelDist / 100; // Rough: 100px = 1m
        }
        
        // Transform both points to real-world coordinates
        const rp1 = this.transformPoint(p1);
        const rp2 = this.transformPoint(p2);
        
        // Euclidean distance in meters
        return Math.sqrt(
            Math.pow(rp2.x - rp1.x, 2) + Math.pow(rp2.y - rp1.y, 2)
        );
    }
    
    /**
     * Check if a point is within the calibrated zone
     * @param {Object} point - {x, y} in video coordinates
     * @returns {boolean}
     */
    isPointInZone(point) {
        if (!this.isCalibrated) return true;
        
        const rp = this.transformPoint(point);
        return rp.x >= 0 && rp.x <= this.destWidth &&
               rp.y >= 0 && rp.y <= this.destHeight;
    }
    
    /**
     * Get calibration zone vertices for drawing
     * @returns {Array} 4 points or null
     */
    getZoneVertices() {
        return this.sourcePoints;
    }
    
    /**
     * Export calibration data (for saving/loading)
     */
    exportCalibration() {
        if (!this.isCalibrated) return null;
        
        return {
            sourcePoints: this.sourcePoints,
            destWidth: this.destWidth,
            destHeight: this.destHeight,
            matrix: this.homographyMatrix
        };
    }
    
    /**
     * Import calibration data (for loading saved calibration)
     */
    importCalibration(data) {
        if (!data || !data.sourcePoints) return false;
        
        return this.setCalibrationPoints(
            data.sourcePoints,
            data.destWidth,
            data.destHeight
        );
    }
    
    /**
     * Reset calibration
     */
    reset() {
        this.sourcePoints = null;
        this.homographyMatrix = null;
        this.inverseMatrix = null;
        this.isCalibrated = false;
    }
}

export default PerspectiveCalibrator;
