/**
 * HeatmapGenerator - Generates traffic density heatmaps
 * 
 * Tracks where objects are detected most frequently and generates
 * a visual heatmap overlay. Uses a grid-based accumulator with
 * time decay for recent vs old detections.
 */

class HeatmapGenerator {
    constructor(gridWidth = 50, gridHeight = 50) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.grid = this.createGrid();
        this.maxValue = 0;
        this.decayRate = 0.995; // Decay factor per frame
        this.lastDecayTime = Date.now();
        this.totalDetections = 0;
    }

    createGrid() {
        return Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
    }

    /**
     * Add a detection to the heatmap
     * @param {Object} bbox - { x, y, width, height } in canvas coordinates
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} weight - Weight of this detection (default 1)
     */
    addDetection(bbox, canvasWidth, canvasHeight, weight = 1) {
        const [x, y, width, height] = Array.isArray(bbox)
            ? bbox
            : [bbox.x, bbox.y, bbox.width, bbox.height];

        // Calculate center of bounding box
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Convert to grid coordinates
        const gridX = Math.floor((centerX / canvasWidth) * this.gridWidth);
        const gridY = Math.floor((centerY / canvasHeight) * this.gridHeight);

        // Add to grid with Gaussian spread for smoother heatmap
        const spread = 2; // Cells to spread to
        for (let dy = -spread; dy <= spread; dy++) {
            for (let dx = -spread; dx <= spread; dx++) {
                const gx = gridX + dx;
                const gy = gridY + dy;

                if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
                    // Gaussian falloff
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const falloff = Math.exp(-distance * distance / 2);
                    this.grid[gy][gx] += weight * falloff;

                    if (this.grid[gy][gx] > this.maxValue) {
                        this.maxValue = this.grid[gy][gx];
                    }
                }
            }
        }

        this.totalDetections++;
    }

    /**
     * Apply time decay to make recent detections more prominent
     */
    applyDecay() {
        const now = Date.now();
        const elapsed = now - this.lastDecayTime;

        // Decay every 100ms
        if (elapsed > 100) {
            const decayFactor = Math.pow(this.decayRate, elapsed / 100);

            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    this.grid[y][x] *= decayFactor;
                }
            }

            this.maxValue *= decayFactor;
            this.lastDecayTime = now;
        }
    }

    /**
     * Get normalized heatmap data (0-1 range)
     */
    getNormalizedGrid() {
        if (this.maxValue === 0) return this.grid;

        return this.grid.map(row =>
            row.map(value => value / this.maxValue)
        );
    }

    /**
     * Draw heatmap on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} opacity - Overall opacity (0-1)
     */
    drawHeatmap(ctx, opacity = 0.6) {
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        const cellWidth = canvasWidth / this.gridWidth;
        const cellHeight = canvasHeight / this.gridHeight;

        const normalizedGrid = this.getNormalizedGrid();

        ctx.save();
        ctx.globalAlpha = opacity;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const value = normalizedGrid[y][x];

                if (value > 0.01) { // Only draw if significant
                    ctx.fillStyle = this.getHeatColor(value);
                    ctx.fillRect(
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth + 1, // +1 to avoid gaps
                        cellHeight + 1
                    );
                }
            }
        }

        ctx.restore();
    }

    /**
     * Get color for a normalized value (0-1)
     * Blue (cold) → Green → Yellow → Red (hot)
     */
    getHeatColor(value) {
        // Clamp value
        value = Math.max(0, Math.min(1, value));

        let r, g, b;

        if (value < 0.25) {
            // Blue to Cyan
            const t = value / 0.25;
            r = 0;
            g = Math.floor(255 * t);
            b = 255;
        } else if (value < 0.5) {
            // Cyan to Green
            const t = (value - 0.25) / 0.25;
            r = 0;
            g = 255;
            b = Math.floor(255 * (1 - t));
        } else if (value < 0.75) {
            // Green to Yellow
            const t = (value - 0.5) / 0.25;
            r = Math.floor(255 * t);
            g = 255;
            b = 0;
        } else {
            // Yellow to Red
            const t = (value - 0.75) / 0.25;
            r = 255;
            g = Math.floor(255 * (1 - t));
            b = 0;
        }

        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }

    /**
     * Export heatmap as a standalone image
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {string} Data URL of the image
     */
    exportAsImage(width = 800, height = 600) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw heatmap
        this.drawHeatmap(ctx, 0.8);

        // Add legend
        this.drawLegend(ctx, width, height);

        return canvas.toDataURL('image/png');
    }

    /**
     * Draw legend on canvas
     */
    drawLegend(ctx, width, height) {
        const legendWidth = 20;
        const legendHeight = 150;
        const legendX = width - legendWidth - 20;
        const legendY = 20;

        // Draw gradient
        for (let i = 0; i < legendHeight; i++) {
            const value = 1 - (i / legendHeight);
            ctx.fillStyle = this.getHeatColor(value);
            ctx.fillRect(legendX, legendY + i, legendWidth, 1);
        }

        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('High', legendX + legendWidth + 5, legendY + 12);
        ctx.fillText('Low', legendX + legendWidth + 5, legendY + legendHeight);

        // Stats
        ctx.fillText(`Total: ${this.totalDetections} detections`, 20, height - 20);
    }

    /**
     * Reset the heatmap
     */
    reset() {
        this.grid = this.createGrid();
        this.maxValue = 0;
        this.totalDetections = 0;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalDetections: this.totalDetections,
            maxValue: this.maxValue,
            gridSize: `${this.gridWidth}x${this.gridHeight}`
        };
    }
}

export default HeatmapGenerator;
