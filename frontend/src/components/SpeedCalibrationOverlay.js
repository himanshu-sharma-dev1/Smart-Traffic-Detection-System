/**
 * SpeedCalibrationOverlay - UI for perspective-based speed calibration
 * 
 * Allows users to define 4 points on the video to create a calibration zone.
 * The zone maps to real-world dimensions for accurate speed measurement.
 */

import React, { useState, useCallback, useEffect } from 'react';

const SpeedCalibrationOverlay = ({
    canvasRef,
    onCalibrationComplete,
    onCancel,
    isActive = false,
    existingPoints = null
}) => {
    // 4 calibration points
    const [points, setPoints] = useState(existingPoints || []);

    // Real-world dimensions
    const [realWidth, setRealWidth] = useState(20); // meters
    const [realHeight, setRealHeight] = useState(3); // meters

    // Currently dragging point index
    const [draggingIndex, setDraggingIndex] = useState(null);

    // Instructions step
    const [step, setStep] = useState(0);

    const instructions = [
        '🎯 Click to place the FRONT-LEFT corner of the calibration zone',
        '🎯 Click to place the FRONT-RIGHT corner',
        '🎯 Click to place the BACK-RIGHT corner',
        '🎯 Click to place the BACK-LEFT corner',
        '✅ Adjust the zone and set real-world dimensions'
    ];

    // Handle canvas click to add point
    const handleCanvasClick = useCallback((e) => {
        if (!canvasRef.current || points.length >= 4) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Scale to canvas coordinates
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const newPoint = {
            x: x * scaleX,
            y: y * scaleY
        };

        setPoints(prev => [...prev, newPoint]);
        setStep(prev => Math.min(prev + 1, 4));
    }, [canvasRef, points.length]);

    // Handle mouse down on point for dragging
    const handlePointMouseDown = (index, e) => {
        e.stopPropagation();
        setDraggingIndex(index);
    };

    // Handle mouse move for dragging
    const handleMouseMove = useCallback((e) => {
        if (draggingIndex === null || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        setPoints(prev => {
            const newPoints = [...prev];
            newPoints[draggingIndex] = {
                x: Math.max(0, Math.min(canvasRef.current.width, x * scaleX)),
                y: Math.max(0, Math.min(canvasRef.current.height, y * scaleY))
            };
            return newPoints;
        });
    }, [draggingIndex, canvasRef]);

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setDraggingIndex(null);
    }, []);

    // Add/remove event listeners
    useEffect(() => {
        if (isActive) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isActive, handleMouseMove, handleMouseUp]);

    // Draw calibration zone on canvas
    useEffect(() => {
        if (!canvasRef.current || !isActive) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // This will be called in the main render loop
        // For now, we'll expose a draw function
    }, [canvasRef, isActive, points]);

    // Complete calibration
    const handleComplete = () => {
        if (points.length === 4 && onCalibrationComplete) {
            onCalibrationComplete(points, realWidth, realHeight);
        }
    };

    // Reset points
    const handleReset = () => {
        setPoints([]);
        setStep(0);
    };

    // Draw the calibration overlay
    const drawCalibrationZone = (ctx) => {
        if (!ctx || points.length === 0) return;

        ctx.save();

        // Draw filled zone with transparency
        if (points.length === 4) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < 4; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 255, 100, 0.2)';
            ctx.fill();

            // Draw zone border
            ctx.strokeStyle = '#00ff64';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
        }

        // Draw lines connecting points
        if (points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            if (points.length === 4) {
                ctx.lineTo(points[0].x, points[0].y);
            }
            ctx.strokeStyle = '#00ff64';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();
        }

        // Draw points
        const labels = ['FL', 'FR', 'BR', 'BL'];
        points.forEach((point, index) => {
            // Outer circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = index === draggingIndex ? '#ff6600' : '#00ff64';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[index], point.x, point.y);
        });

        // Draw dimensions if complete
        if (points.length === 4) {
            // Width label
            const midTop = {
                x: (points[0].x + points[1].x) / 2,
                y: (points[0].y + points[1].y) / 2 - 20
            };
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${realWidth}m`, midTop.x, midTop.y);

            // Height label
            const midLeft = {
                x: (points[0].x + points[3].x) / 2 - 25,
                y: (points[0].y + points[3].y) / 2
            };
            ctx.save();
            ctx.translate(midLeft.x, midLeft.y);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${realHeight}m`, 0, 0);
            ctx.restore();
        }

        ctx.restore();
    };

    if (!isActive) return null;

    return (
        <>
            {/* Click handler overlay */}
            <div
                onClick={handleCanvasClick}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: points.length < 4 ? 'crosshair' : 'default',
                    zIndex: 10
                }}
            />

            {/* Draggable points */}
            {points.map((point, index) => {
                const canvas = canvasRef.current;
                if (!canvas) return null;

                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;

                return (
                    <div
                        key={index}
                        onMouseDown={(e) => handlePointMouseDown(index, e)}
                        style={{
                            position: 'absolute',
                            left: point.x * scaleX - 15,
                            top: point.y * scaleY - 15,
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            backgroundColor: draggingIndex === index ? '#ff6600' : '#00ff64',
                            border: '3px solid white',
                            cursor: 'move',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            color: '#000',
                            zIndex: 20,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}
                    >
                        {['FL', 'FR', 'BR', 'BL'][index]}
                    </div>
                );
            })}

            {/* Control panel */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                padding: '15px 25px',
                borderRadius: '12px',
                zIndex: 30,
                minWidth: '350px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(0, 255, 100, 0.3)'
            }}>
                {/* Title */}
                <div style={{
                    color: '#00ff64',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    🎯 Speed Calibration Mode
                </div>

                {/* Instructions */}
                <div style={{
                    color: '#fff',
                    fontSize: '13px',
                    marginBottom: '15px',
                    textAlign: 'center'
                }}>
                    {instructions[step]}
                </div>

                {/* Progress dots */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '15px'
                }}>
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: i < points.length ? '#00ff64' : '#444',
                                border: i === points.length ? '2px solid #00ff64' : 'none'
                            }}
                        />
                    ))}
                </div>

                {/* Dimension inputs (show when 4 points placed) */}
                {points.length === 4 && (
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        marginBottom: '15px',
                        justifyContent: 'center'
                    }}>
                        <div>
                            <label style={{ color: '#aaa', fontSize: '11px' }}>Length (m)</label>
                            <input
                                type="number"
                                value={realWidth}
                                onChange={(e) => setRealWidth(parseFloat(e.target.value) || 20)}
                                style={{
                                    width: '70px',
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #00ff64',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    marginLeft: '8px'
                                }}
                                min={0.1}
                                max={100}
                                step={0.1}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#aaa', fontSize: '11px' }}>Width (m)</label>
                            <input
                                type="number"
                                value={realHeight}
                                onChange={(e) => setRealHeight(parseFloat(e.target.value) || 3)}
                                style={{
                                    width: '70px',
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #00ff64',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    marginLeft: '8px'
                                }}
                                min={0.1}
                                max={20}
                                step={0.1}
                            />
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#555',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        🔄 Reset
                    </button>

                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#ff4444',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        ✕ Cancel
                    </button>

                    {points.length === 4 && (
                        <button
                            onClick={handleComplete}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#00ff64',
                                color: '#000',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✓ Apply Calibration
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default SpeedCalibrationOverlay;
