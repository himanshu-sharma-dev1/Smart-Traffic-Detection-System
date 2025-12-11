/**
 * CountingZone - Manages line-crossing detection for object counting
 * 
 * Features:
 * - Define horizontal/vertical counting lines
 * - Track object centroids crossing lines
 * - Count entries and exits per class
 * - Direction detection (up/down or left/right)
 */

class CountingZone {
    constructor() {
        // Counting lines: { id, x1, y1, x2, y2, direction, counts, crossed }
        this.lines = [];
        this.lineIdCounter = 0;

        // Track which objects have crossed which lines
        // { trackId: { lineId: 'up' | 'down' | null } }
        this.objectHistory = new Map();

        // Total counts per class
        this.classCounts = {};
    }

    /**
     * Add a counting line
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @returns {number} Line ID
     */
    addLine(x1, y1, x2, y2) {
        const id = ++this.lineIdCounter;

        // Determine if line is more horizontal or vertical
        const isHorizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);

        this.lines.push({
            id,
            x1, y1, x2, y2,
            isHorizontal,
            // For horizontal lines: count objects moving up (negative) vs down (positive)
            // For vertical lines: count objects moving left vs right
            countIn: 0,
            countOut: 0,
            recentCrossings: [] // Store recent crossings for animation
        });

        return id;
    }

    /**
     * Remove a counting line
     * @param {number} lineId - Line ID to remove
     */
    removeLine(lineId) {
        const index = this.lines.findIndex(l => l.id === lineId);
        if (index !== -1) {
            this.lines.splice(index, 1);
        }
    }

    /**
     * Clear all lines
     */
    clearLines() {
        this.lines = [];
        this.objectHistory.clear();
        this.classCounts = {};
    }

    /**
     * Check which side of a line a point is on
     * @returns {number} Positive if on one side, negative if on other, 0 if on line
     */
    getSideOfLine(line, x, y) {
        const { x1, y1, x2, y2 } = line;
        // Cross product to determine side
        return (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    }

    /**
     * Calculate centroid of bounding box
     */
    getCentroid(bbox) {
        const [x, y, width, height] = bbox;
        return {
            x: x + width / 2,
            y: y + height / 2
        };
    }

    /**
     * Update with new detections
     * @param {Array} trackedObjects - Objects with trackId, class, bbox
     * @returns {Object} Crossing events
     */
    update(trackedObjects) {
        const crossings = [];

        for (const obj of trackedObjects) {
            const trackId = obj.trackId || obj.id;
            const centroid = this.getCentroid(obj.bbox || [obj.x, obj.y, obj.width, obj.height]);
            const className = obj.class || obj.label || 'unknown';

            // Initialize history for new objects
            if (!this.objectHistory.has(trackId)) {
                const initialState = {};
                for (const line of this.lines) {
                    initialState[line.id] = this.getSideOfLine(line, centroid.x, centroid.y);
                }
                this.objectHistory.set(trackId, initialState);
                continue;
            }

            const history = this.objectHistory.get(trackId);

            // Check each line for crossings
            for (const line of this.lines) {
                const currentSide = this.getSideOfLine(line, centroid.x, centroid.y);
                const previousSide = history[line.id];

                // Crossing detected when sign changes
                if (previousSide !== undefined && currentSide !== 0) {
                    if ((previousSide > 0 && currentSide < 0) || (previousSide < 0 && currentSide > 0)) {
                        // Determine direction
                        const direction = currentSide > 0 ? 'in' : 'out';

                        // Update line counts
                        if (direction === 'in') {
                            line.countIn++;
                        } else {
                            line.countOut++;
                        }

                        // Update class counts
                        if (!this.classCounts[className]) {
                            this.classCounts[className] = { in: 0, out: 0, total: 0 };
                        }
                        this.classCounts[className][direction]++;
                        this.classCounts[className].total++;

                        // Add to recent crossings for visual feedback
                        line.recentCrossings.push({
                            time: Date.now(),
                            direction,
                            className,
                            x: centroid.x,
                            y: centroid.y
                        });

                        // Keep only recent crossings (last 2 seconds)
                        line.recentCrossings = line.recentCrossings.filter(
                            c => Date.now() - c.time < 2000
                        );

                        crossings.push({
                            lineId: line.id,
                            trackId,
                            className,
                            direction,
                            timestamp: Date.now()
                        });
                    }
                }

                // Update history
                history[line.id] = currentSide;
            }
        }

        // Clean up old object history
        const activeIds = new Set(trackedObjects.map(o => o.trackId || o.id));
        for (const [trackId] of this.objectHistory) {
            if (!activeIds.has(trackId)) {
                this.objectHistory.delete(trackId);
            }
        }

        return crossings;
    }

    /**
     * Get all lines for rendering
     */
    getLines() {
        return this.lines;
    }

    /**
     * Get total counts
     */
    getTotalCounts() {
        let totalIn = 0;
        let totalOut = 0;
        for (const line of this.lines) {
            totalIn += line.countIn;
            totalOut += line.countOut;
        }
        return { in: totalIn, out: totalOut, total: totalIn + totalOut };
    }

    /**
     * Get counts by class
     */
    getClassCounts() {
        return this.classCounts;
    }

    /**
     * Reset counts (but keep lines)
     */
    resetCounts() {
        for (const line of this.lines) {
            line.countIn = 0;
            line.countOut = 0;
            line.recentCrossings = [];
        }
        this.classCounts = {};
    }
}

export default CountingZone;
