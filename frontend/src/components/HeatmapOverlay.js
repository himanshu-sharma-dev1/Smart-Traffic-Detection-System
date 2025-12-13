/**
 * HeatmapOverlay - Visual heatmap overlay component
 * 
 * Displays a semi-transparent heatmap showing detection density.
 * Can be toggled on/off and exported as an image.
 */

import React, { useRef, useEffect } from 'react';

const HeatmapOverlay = ({
    heatmapGenerator,
    canvasWidth,
    canvasHeight,
    visible = true,
    opacity = 0.5
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!visible || !heatmapGenerator) {
            console.log('Heatmap not visible or no generator');
            return;
        }

        console.log('🔥 Heatmap overlay started, size:', canvasWidth, 'x', canvasHeight);

        const draw = () => {
            if (!canvasRef.current || !heatmapGenerator) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply decay and draw
            heatmapGenerator.applyDecay();
            heatmapGenerator.drawHeatmap(ctx, opacity);

            // Debug: show stats
            const stats = heatmapGenerator.getStats();
            if (stats.totalDetections > 0 && stats.totalDetections % 50 === 0) {
                console.log('🔥 Heatmap stats:', stats);
            }

            // Continue animation
            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [visible, heatmapGenerator, opacity, canvasWidth, canvasHeight]);

    if (!visible) return null;

    return (
        <canvas
            ref={canvasRef}
            width={canvasWidth || 640}
            height={canvasHeight || 480}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10, // Increased z-index
            }}
        />
    );
};

export default HeatmapOverlay;
