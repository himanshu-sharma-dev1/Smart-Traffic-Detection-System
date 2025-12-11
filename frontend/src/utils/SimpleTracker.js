/**
 * Simple Object Tracker using IoU-based matching (SORT-inspired)
 * Tracks objects across video frames by matching bounding boxes
 */

class SimpleTracker {
    constructor(maxAge = 30, minHits = 3, iouThreshold = 0.3) {
        this.maxAge = maxAge;          // Max frames to keep track without detection
        this.minHits = minHits;         // Min hits before track is confirmed
        this.iouThreshold = iouThreshold; // IoU threshold for matching
        this.tracks = [];               // Active tracks
        this.nextId = 1;                // Next track ID
        this.frameCount = 0;            // Current frame count
    }

    // Calculate Intersection over Union
    calculateIoU(boxA, boxB) {
        // boxA and boxB are [x, y, width, height]
        const [xA, yA, wA, hA] = boxA;
        const [xB, yB, wB, hB] = boxB;

        const x1 = Math.max(xA, xB);
        const y1 = Math.max(yA, yB);
        const x2 = Math.min(xA + wA, xB + wB);
        const y2 = Math.min(yA + hA, yB + hB);

        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = wA * hA;
        const areaB = wB * hB;
        const union = areaA + areaB - intersection;

        return union > 0 ? intersection / union : 0;
    }

    // Convert COCO-SSD bbox to [x, y, w, h]
    normalizeBbox(bbox) {
        return [bbox[0], bbox[1], bbox[2], bbox[3]];
    }

    // Update tracks with new detections
    update(detections) {
        this.frameCount++;

        // Convert detections to tracks format
        const dets = detections.map(det => ({
            bbox: this.normalizeBbox(det.bbox),
            class: det.class,
            score: det.score
        }));

        // If no existing tracks, create new ones
        if (this.tracks.length === 0) {
            dets.forEach(det => {
                this.tracks.push({
                    id: this.nextId++,
                    bbox: det.bbox,
                    class: det.class,
                    score: det.score,
                    hits: 1,
                    age: 0,
                    trail: [this.getCentroid(det.bbox)],
                    color: this.getRandomColor()
                });
            });
            return this.getConfirmedTracks();
        }

        // Build cost matrix (negative IoU for Hungarian-like matching)
        const costMatrix = [];
        this.tracks.forEach(track => {
            const row = [];
            dets.forEach(det => {
                const iou = this.calculateIoU(track.bbox, det.bbox);
                row.push(iou);
            });
            costMatrix.push(row);
        });

        // Greedy matching (simplified Hungarian)
        const matched = [];
        const unmatchedDets = new Set(dets.map((_, i) => i));
        const unmatchedTracks = new Set(this.tracks.map((_, i) => i));

        // Find best matches greedily
        for (let i = 0; i < this.tracks.length; i++) {
            let bestJ = -1;
            let bestIoU = this.iouThreshold;

            for (let j = 0; j < dets.length; j++) {
                if (!unmatchedDets.has(j)) continue;
                if (costMatrix[i][j] > bestIoU) {
                    bestIoU = costMatrix[i][j];
                    bestJ = j;
                }
            }

            if (bestJ !== -1) {
                matched.push([i, bestJ]);
                unmatchedDets.delete(bestJ);
                unmatchedTracks.delete(i);
            }
        }

        // Update matched tracks
        matched.forEach(([trackIdx, detIdx]) => {
            const track = this.tracks[trackIdx];
            const det = dets[detIdx];
            track.bbox = det.bbox;
            track.class = det.class;
            track.score = det.score;
            track.hits++;
            track.age = 0;

            // Update trail (keep last 30 points)
            track.trail.push(this.getCentroid(det.bbox));
            if (track.trail.length > 30) {
                track.trail.shift();
            }
        });

        // Create new tracks for unmatched detections
        unmatchedDets.forEach(detIdx => {
            const det = dets[detIdx];
            this.tracks.push({
                id: this.nextId++,
                bbox: det.bbox,
                class: det.class,
                score: det.score,
                hits: 1,
                age: 0,
                trail: [this.getCentroid(det.bbox)],
                color: this.getRandomColor()
            });
        });

        // Age unmatched tracks
        unmatchedTracks.forEach(trackIdx => {
            this.tracks[trackIdx].age++;
        });

        // Remove dead tracks
        this.tracks = this.tracks.filter(track => track.age < this.maxAge);

        return this.getConfirmedTracks();
    }

    // Get only confirmed tracks (hit threshold met)
    getConfirmedTracks() {
        return this.tracks.filter(track => track.hits >= this.minHits);
    }

    // Get centroid of bbox
    getCentroid(bbox) {
        const [x, y, w, h] = bbox;
        return { x: x + w / 2, y: y + h / 2 };
    }

    // Generate random color for track
    getRandomColor() {
        const colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Get total unique objects tracked
    getTotalTracked() {
        return this.nextId - 1;
    }

    // Reset tracker
    reset() {
        this.tracks = [];
        this.nextId = 1;
        this.frameCount = 0;
    }

    // Get statistics
    getStats() {
        return {
            totalTracked: this.getTotalTracked(),
            activeTracks: this.tracks.length,
            confirmedTracks: this.getConfirmedTracks().length,
            frameCount: this.frameCount
        };
    }
}

export default SimpleTracker;
