import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Alert, Badge, Spinner, ProgressBar, Form, Modal } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import SimpleTracker from './utils/SimpleTracker';
import { getTrafficSignDetector } from './utils/TrafficSignDetector';
import { mergeDetections, getDetectionColor } from './utils/DetectionMerger';
import useVoiceCommands, { VoiceCommandsHelp } from './hooks/useVoiceCommands';
import CountingZone from './utils/CountingZone';
import SpeedEstimator from './utils/SpeedEstimator';
import { getLicensePlateDetector } from './utils/LicensePlateDetector';
import './LiveDetection.css';

// Notification sound using Web Audio API
const createBeepSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => {
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            setTimeout(() => oscillator.stop(), 100);
        }, 100);
    } catch (e) {
        console.log('Audio not supported');
    }
};

// Save detection stats for analytics
const saveDetectionStats = (detections, trackedCount) => {
    try {
        const stats = JSON.parse(localStorage.getItem('detectionStats') || '[]');
        const now = new Date();

        stats.push({
            timestamp: now.toISOString(),
            date: now.toLocaleDateString(),
            hour: now.getHours(),
            objectCount: detections.length,
            trackedCount: trackedCount,
            objects: detections.map(d => ({
                class: d.class,
                score: d.score
            }))
        });

        // Keep last 1000 entries
        const trimmed = stats.slice(-1000);
        localStorage.setItem('detectionStats', JSON.stringify(trimmed));
    } catch (e) {
        console.log('Could not save stats:', e);
    }
};

const LiveDetection = () => {
    const [model, setModel] = useState(null);
    const [modelLoading, setModelLoading] = useState(true);
    const [modelProgress, setModelProgress] = useState(0);
    const [cameraActive, setCameraActive] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detections, setDetections] = useState([]);
    const [fps, setFps] = useState(0);
    const [deepScanLoading, setDeepScanLoading] = useState(false);
    const [error, setError] = useState(null);

    // Feature states
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [roiEnabled, setRoiEnabled] = useState(false);
    const [roi, setRoi] = useState(null);
    const [isDrawingRoi, setIsDrawingRoi] = useState(false);
    const [roiStart, setRoiStart] = useState(null);

    // Tracking states
    const [trackingEnabled, setTrackingEnabled] = useState(true);
    const [trackedObjects, setTrackedObjects] = useState([]);
    const [totalTracked, setTotalTracked] = useState(0);

    // Traffic Sign Detection states
    const [trafficSignEnabled, setTrafficSignEnabled] = useState(false);
    const [trafficSignModel, setTrafficSignModel] = useState(null);
    const [trafficSignLoading, setTrafficSignLoading] = useState(false);
    const frameCountRef = useRef(0);
    const cocoResultsRef = useRef([]);
    const signResultsRef = useRef([]);

    // Voice Commands state
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);

    // Counting Zone states
    const [countingEnabled, setCountingEnabled] = useState(false);
    const [isDrawingLine, setIsDrawingLine] = useState(false);
    const [lineStart, setLineStart] = useState(null);
    const [countingStats, setCountingStats] = useState({ in: 0, out: 0, total: 0 });
    const countingZoneRef = useRef(new CountingZone());

    // Speed Estimation states
    const [speedEnabled, setSpeedEnabled] = useState(false);
    const [speedCalibration, setSpeedCalibration] = useState(10); // pixels per meter
    const [speedStats, setSpeedStats] = useState({ avg: 0, max: 0, count: 0 });
    const speedEstimatorRef = useRef(new SpeedEstimator({ pixelsPerMeter: 10 }));

    // License Plate Detection states
    const [plateEnabled, setPlateEnabled] = useState(false);
    const [plateLoading, setPlateLoading] = useState(false);
    const [plateDetector, setPlateDetector] = useState(null);
    const [detectedPlates, setDetectedPlates] = useState([]);

    // Manual Plate Scan states
    const [plateScanMode, setPlateScanMode] = useState(false);
    const [isDrawingPlate, setIsDrawingPlate] = useState(false);
    const [plateStart, setPlateStart] = useState(null);
    const [scanningPlate, setScanningPlate] = useState(false);
    const [lastScannedPlate, setLastScannedPlate] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const roiCanvasRef = useRef(null);
    const animationRef = useRef(null);
    const trackerRef = useRef(new SimpleTracker(30, 2, 0.25));
    const fpsRef = useRef({ frameCount: 0, lastTime: Date.now() });
    const lastSoundTimeRef = useRef(0);
    const statsIntervalRef = useRef(null);
    const navigate = useNavigate();

    // Voice Commands hook with handlers
    const voiceCommands = useVoiceCommands({
        onStartDetection: () => {
            if (cameraActive && !detecting) {
                startDetection();
                toast.success('🎤 Voice: Started detection');
            }
        },
        onStopDetection: () => {
            if (detecting) {
                stopDetection();
                toast.info('🎤 Voice: Stopped detection');
            }
        },
        onScreenshot: () => {
            if (canvasRef.current) {
                const link = document.createElement('a');
                link.download = `detection-${Date.now()}.png`;
                link.href = canvasRef.current.toDataURL('image/png');
                link.click();
                toast.success('🎤 Voice: Screenshot captured');
            }
        },
        onSwitchCamera: () => {
            toast.info('🎤 Voice: Switch camera (not implemented)');
        },
        onToggleTracking: () => {
            setTrackingEnabled(prev => {
                toast.info(`🎤 Voice: Tracking ${!prev ? 'enabled' : 'disabled'}`);
                return !prev;
            });
        },
        onToggleSound: () => {
            setSoundEnabled(prev => {
                toast.info(`🎤 Voice: Sound ${!prev ? 'enabled' : 'disabled'}`);
                return !prev;
            });
        },
        onExportReport: () => {
            if (trackedObjects.length > 0) {
                const reportData = {
                    timestamp: new Date().toISOString(),
                    totalDetections: detections.length,
                    trackedObjects: trackedObjects.length,
                    uniqueClasses: [...new Set(trackedObjects.map(d => d.class))],
                    objects: trackedObjects.map(t => ({
                        id: t.trackId || t.id,
                        class: t.class,
                        confidence: Math.round((t.score || 0.9) * 100) + '%'
                    }))
                };
                const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `detection-report-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success('🎤 Voice: Report exported!');
            } else {
                toast.warn('🎤 Voice: No objects to export');
            }
        },
        onFullscreen: () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
            toast.info('🎤 Voice: Toggled fullscreen');
        },
        onToggleTrafficSigns: () => {
            handleTrafficSignToggle(!trafficSignEnabled);
            toast.info(`🎤 Voice: Traffic signs ${!trafficSignEnabled ? 'enabled' : 'disabled'}`);
        },
        onToggleCounting: () => {
            setCountingEnabled(prev => {
                toast.info(`🎤 Voice: Counting ${!prev ? 'enabled' : 'disabled'}`);
                return !prev;
            });
        },
        onToggleLicensePlate: () => {
            handlePlateToggle(!plateEnabled);
            toast.info(`🎤 Voice: License plates ${!plateEnabled ? 'enabled' : 'disabled'}`);
        },
        onHelp: () => {
            setShowVoiceHelp(true);
        }
    });

    useEffect(() => {
        loadModel();
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, []);

    // Save stats every 5 seconds when detecting
    useEffect(() => {
        if (detecting && trackedObjects.length > 0) {
            statsIntervalRef.current = setInterval(() => {
                saveDetectionStats(trackedObjects, totalTracked);
            }, 5000);
        } else {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        }
        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, [detecting, trackedObjects, totalTracked]);

    const loadModel = async () => {
        try {
            setModelLoading(true);
            setModelProgress(10);

            const progressInterval = setInterval(() => {
                setModelProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const loadedModel = await cocoSsd.load({
                base: 'lite_mobilenet_v2'
            });

            clearInterval(progressInterval);
            setModelProgress(100);
            setModel(loadedModel);
            setModelLoading(false);
            toast.success('🧠 AI Model loaded successfully!');
        } catch (err) {
            console.error('Error loading model:', err);
            setError('Failed to load AI model. Please refresh the page.');
            setModelLoading(false);
            toast.error('Failed to load AI model');
        }
    };

    // Load traffic sign model on demand
    const loadTrafficSignModel = async () => {
        if (trafficSignModel) return true;

        try {
            setTrafficSignLoading(true);
            toast.info('🚦 Loading Traffic Sign model...');

            const detector = await getTrafficSignDetector();
            setTrafficSignModel(detector);
            setTrafficSignLoading(false);
            toast.success(`🚦 Traffic Sign model loaded (${detector.classNames.length} classes)`);
            return true;
        } catch (err) {
            console.error('Error loading traffic sign model:', err);
            toast.error('Failed to load traffic sign model');
            setTrafficSignLoading(false);
            setTrafficSignEnabled(false);
            return false;
        }
    };

    // Handle traffic sign toggle
    const handleTrafficSignToggle = async (enabled) => {
        if (enabled) {
            const success = await loadTrafficSignModel();
            if (success) {
                setTrafficSignEnabled(true);
                frameCountRef.current = 0;
                cocoResultsRef.current = [];
                signResultsRef.current = [];
            }
        } else {
            setTrafficSignEnabled(false);
            signResultsRef.current = [];
        }
    };

    // Handle license plate toggle
    const handlePlateToggle = async (enabled) => {
        if (enabled) {
            try {
                setPlateLoading(true);
                toast.info('🚗 Loading License Plate OCR...');
                const detector = await getLicensePlateDetector();
                setPlateDetector(detector);
                setPlateEnabled(true);
                setPlateLoading(false);
                toast.success('🚗 License Plate detection ready!');
            } catch (err) {
                console.error('Failed to load plate detector:', err);
                toast.error('Failed to load License Plate OCR');
                setPlateLoading(false);
            }
        } else {
            setPlateEnabled(false);
            setDetectedPlates([]);
        }
    };

    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setCameraActive(true);
                    toast.success('📷 Camera activated!');
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera. Please grant permission.');
            toast.error('Camera access denied');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setDetecting(false);
        setDetections([]);
        setTrackedObjects([]);
        setRoi(null);
        trackerRef.current.reset();
        setTotalTracked(0);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        toast.info('📷 Camera stopped');
    };

    const startDetection = () => {
        if (!model || !cameraActive) return;
        setDetecting(true);
        trackerRef.current.reset();
        detectFrame();
        toast.success('🎯 Real-time detection with tracking started!');
    };

    const stopDetection = () => {
        setDetecting(false);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setDetections([]);
        setTrackedObjects([]);
    };

    const isInROI = (bbox) => {
        if (!roi) return true;
        const [x, y, width, height] = bbox;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        return centerX >= roi.x &&
            centerX <= roi.x + roi.width &&
            centerY >= roi.y &&
            centerY <= roi.y + roi.height;
    };

    // Refs for state accessed inside the loop to avoid dependency cycles
    const detectingRef = useRef(false);

    // Sync refs with state
    useEffect(() => {
        detectingRef.current = detecting;
    }, [detecting]);

    const detectFrame = useCallback(async () => {
        // Use refs for "live" values inside the recursive loop
        if (!model || !videoRef.current || !canvasRef.current || !detectingRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Ensure canvas dimensions match video
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        try {
            let predictions = [];

            // Frame interlacing for dual-model detection
            if (trafficSignEnabled && trafficSignModel) {
                frameCountRef.current++;

                // Always run COCO-SSD for stable detection
                const cocoResults = await model.detect(video);
                cocoResultsRef.current = cocoResults;

                // Run traffic sign detection every 3rd frame
                if (frameCountRef.current % 3 === 0) {
                    const signResults = await trafficSignModel.detect(video);

                    // Smooth position updates
                    if (signResultsRef.current.length > 0 && signResults.length > 0) {
                        signResults.forEach(newDet => {
                            const oldDet = signResultsRef.current.find(old => old.class === newDet.class);
                            if (oldDet) {
                                // Interpolate
                                const [ox, oy, ow, oh] = oldDet.bbox;
                                const [nx, ny, nw, nh] = newDet.bbox;
                                newDet.bbox = [
                                    ox * 0.2 + nx * 0.8,
                                    oy * 0.2 + ny * 0.8,
                                    ow * 0.2 + nw * 0.8,
                                    oh * 0.2 + nh * 0.8
                                ];
                            }
                        });
                    }
                    signResultsRef.current = signResults;
                }

                predictions = mergeDetections(cocoResultsRef.current, signResultsRef.current);
            } else {
                predictions = await model.detect(video);
            }

            // Filter by ROI
            if (roiEnabled && roi) {
                predictions = predictions.filter(pred => {
                    const [x, y, width, height] = pred.bbox;
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    return centerX >= roi.x &&
                        centerX <= roi.x + roi.width &&
                        centerY >= roi.y &&
                        centerY <= roi.y + roi.height;
                });
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw ROI
            if (roiEnabled && roi) {
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(243, 156, 18, 0.8)';
                ctx.fillRect(roi.x, roi.y - 25, 120, 22);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Poppins';
                ctx.fillText('🎯 Detection Zone', roi.x + 5, roi.y - 8);
            }

            // Update tracker
            let tracks = predictions;
            if (trackingEnabled) {
                tracks = trackerRef.current.update(predictions);
                setTotalTracked(trackerRef.current.getTotalTracked());
            }

            // Sound
            if (soundEnabled && predictions.length > 0) {
                const now = Date.now();
                if (now - lastSoundTimeRef.current > 1000) {
                    createBeepSound();
                    lastSoundTimeRef.current = now;
                }
            }

            // Draw Tracks
            tracks.forEach((track) => {
                const [x, y, width, height] = track.bbox;
                const color = trackingEnabled && track.color ? track.color : '#3498db';
                const id = trackingEnabled && track.id ? track.id : null;

                // Trail
                if (trackingEnabled && track.trail && track.trail.length > 1) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(track.trail[0].x, track.trail[0].y);
                    track.trail.forEach((point, i) => {
                        ctx.globalAlpha = (i / track.trail.length) * 0.7;
                        ctx.lineTo(point.x, point.y);
                    });
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }

                // Box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // Corners
                const cornerSize = 15;
                ctx.lineWidth = 4;
                // ... (Corner drawing code omitted for brevity but assumed implicit if not changing logic, 
                // actually better to rewrite explicitly to be safe or assuming the user knows I'm replacing the block)
                // RE-WRITING CORNERS TO BE SAFE:
                ctx.beginPath(); ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + width - cornerSize, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerSize); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y + height - cornerSize); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerSize, y + height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + width - cornerSize, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - cornerSize); ctx.stroke();

                // Label
                const score = track.score || (track.hits ? 0.9 : 0);
                const labelText = id
                    ? `#${id} ${track.class} ${Math.round(score * 100)}%`
                    : `${track.class} ${Math.round(score * 100)}%`;

                ctx.font = 'bold 14px Poppins, Arial';
                const textWidth = ctx.measureText(labelText).width;
                ctx.fillStyle = color;
                ctx.fillRect(x, y - 25, textWidth + 10, 22);
                ctx.fillStyle = 'white';
                ctx.fillText(labelText, x + 5, y - 8);
            });

            // Speed
            let tracksWithSpeed = tracks;
            if (speedEnabled) {
                tracksWithSpeed = speedEstimatorRef.current.update(tracks, fps);
                // Updating state inside loop is okay IF dependencies don't restart loop
                // But better to throttle this? For now, we leave it as it wasn't the cause of the freeze
                setSpeedStats(speedEstimatorRef.current.getStats());

                tracksWithSpeed.forEach((track) => {
                    if (track.speed > 0) {
                        const [x, y, width] = track.bbox;
                        ctx.fillStyle = '#e74c3c';
                        ctx.fillRect(x + width - 60, y - 25, 58, 22);
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 12px Poppins';
                        ctx.fillText(`${track.speed} km/h`, x + width - 55, y - 8);
                    }
                });
            }

            // Counting Zone
            if (countingEnabled && countingZoneRef.current.getLines().length > 0) {
                const crossings = countingZoneRef.current.update(tracks);
                if (crossings.length > 0 && soundEnabled) createBeepSound();
                setCountingStats(countingZoneRef.current.getTotalCounts());

                // Draw lines
                const lines = countingZoneRef.current.getLines();
                lines.forEach(line => {
                    ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); ctx.stroke();
                    ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.arc(line.x1, line.y1, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(line.x2, line.y2, 6, 0, Math.PI * 2); ctx.fill();
                    const midX = (line.x1 + line.x2) / 2; const midY = (line.y1 + line.y2) / 2;
                    ctx.fillRect(midX - 35, midY - 12, 70, 24); ctx.fillStyle = 'white'; ctx.font = 'bold 12px Poppins';
                    ctx.fillText(`↑${line.countIn} ↓${line.countOut}`, midX - 28, midY + 4);
                });
            }

            // CRITICAL SECTION: LICENSE PLATE DETECTION
            // We use 'detectedPlates' for drawing, but we DO NOT include it in dependencies
            // The drawing will use the *latest* state from the next render cycle, which is fine
            if (plateEnabled && plateDetector) {
                // Queue periodically
                if (frameCountRef.current % 30 === 0) {
                    plateDetector.queueForProcessing(ctx, tracks);
                    // IMPORTANT: We update state, but use functional update to be safe
                    // and this triggers re-render, but detectFrame reference won't change
                    setDetectedPlates(prev => {
                        const newPlates = plateDetector.getAllPlates();
                        // Simple check to avoid update if identical could be added, but simple set is fine without dep cycle
                        return newPlates;
                    });
                }

                // Draw logical plates (from state)
                tracks.forEach(track => {
                    const trackId = track.trackId || track.id;
                    if (!trackId) return;
                    const className = (track.class || '').toLowerCase();
                    if (!['car', 'truck', 'bus', 'motorcycle'].includes(className)) return;

                    const [x, y, width, height] = track.bbox;

                    // Optimization: Use the plateDetector directly for instant feedback if state lags
                    // But strictly speaking, we should use state for rendering
                    // We will use the plateDetector instance methods to get data which is faster than waiting for React state in the loop?
                    // No, let's stick to using the detector instance for *checking* pending status and data to avoid relying on stale state closure
                    const plateData = plateDetector.getPlateForTrack(trackId);

                    if (plateData) {
                        ctx.fillStyle = '#27ae60';
                        ctx.fillRect(x, y + height + 2, width, 26);
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px Courier';
                        ctx.fillText(`🚗 ${plateData.text}`, x + 5, y + height + 20);
                    } else if (plateDetector.isPending(trackId)) {
                        ctx.fillStyle = '#f39c12';
                        ctx.fillRect(x, y + height + 2, width, 22);
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 11px Arial';
                        ctx.fillText('🔍 Reading plate...', x + 5, y + height + 17);
                    }
                });
            }

            setDetections(predictions);
            setTrackedObjects(speedEnabled ? tracksWithSpeed : tracks);

            // FPS
            fpsRef.current.frameCount++;
            const fpsNow = Date.now();
            if (fpsNow - fpsRef.current.lastTime >= 1000) {
                setFps(fpsRef.current.frameCount);
                fpsRef.current.frameCount = 0;
                fpsRef.current.lastTime = fpsNow;
            }

        } catch (err) {
            console.error('Detection error:', err);
        }

        if (detectingRef.current) {
            animationRef.current = requestAnimationFrame(detectFrame);
        }
    }, [
        // Dependencies required for logic renewal but NOT state that updates rapidly
        model,
        // detecting: removed (using ref)
        roiEnabled, roi,
        soundEnabled,
        trackingEnabled,
        trafficSignEnabled, trafficSignModel,
        plateEnabled, plateDetector,
        // detectedPlates: removed (causing the freeze)
        speedEnabled, countingEnabled // these toggle features so we want to refresh if they change
    ]);

    // Initial Trigger
    useEffect(() => {
        if (detecting && model && cameraActive) {
            detectFrame();
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [detecting, model, cameraActive, detectFrame]);

    // ROI handlers
    const handleRoiMouseDown = (e) => {
        const rect = roiCanvasRef.current.getBoundingClientRect();
        const scaleX = roiCanvasRef.current.width / rect.width;
        const scaleY = roiCanvasRef.current.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Handle counting line drawing
        if (isDrawingLine && countingEnabled && cameraActive) {
            setLineStart({ x, y });
            return;
        }

        // Handle Plate Scan drawing
        if (plateScanMode && cameraActive) {
            setPlateStart({ x, y });
            setIsDrawingPlate(true);
            return;
        }

        // Handle ROI drawing
        if (!roiEnabled || !cameraActive) return;
        setRoiStart({ x, y });
        setIsDrawingRoi(true);
    };

    const handleRoiMouseMove = (e) => {
        const rect = roiCanvasRef.current.getBoundingClientRect();
        const scaleX = roiCanvasRef.current.width / rect.width;
        const scaleY = roiCanvasRef.current.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        const canvas = roiCanvasRef.current;
        const ctx = canvas.getContext('2d');

        // Handle counting line drawing preview
        if (lineStart && isDrawingLine) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(lineStart.x, lineStart.y);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();

            // Draw endpoints
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(lineStart.x, lineStart.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Handle Plate Scan drawing (green box)
        if (isDrawingPlate && plateStart) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#27ae60';  // Green for plate
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(plateStart.x, plateStart.y, currentX - plateStart.x, currentY - plateStart.y);

            // Draw label
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(plateStart.x, plateStart.y - 25, 100, 22);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('🚗 Scan Plate', plateStart.x + 5, plateStart.y - 8);
            return;
        }

        // Handle ROI drawing
        if (!isDrawingRoi || !roiStart) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(roiStart.x, roiStart.y, currentX - roiStart.x, currentY - roiStart.y);
    };

    const handleRoiMouseUp = (e) => {
        const rect = roiCanvasRef.current.getBoundingClientRect();
        const scaleX = roiCanvasRef.current.width / rect.width;
        const scaleY = roiCanvasRef.current.height / rect.height;
        const endX = (e.clientX - rect.left) * scaleX;
        const endY = (e.clientY - rect.top) * scaleY;

        // Handle counting line finalization
        if (lineStart && isDrawingLine) {
            countingZoneRef.current.addLine(lineStart.x, lineStart.y, endX, endY);
            setLineStart(null);
            setIsDrawingLine(false);

            const roiCtx = roiCanvasRef.current.getContext('2d');
            roiCtx.clearRect(0, 0, roiCanvasRef.current.width, roiCanvasRef.current.height);

            toast.success('📊 Counting line added!');
            return;
        }

        // Handle Plate Scan finalization - trigger OCR!
        if (isDrawingPlate && plateStart) {
            const region = {
                x: Math.min(plateStart.x, endX),
                y: Math.min(plateStart.y, endY),
                width: Math.abs(endX - plateStart.x),
                height: Math.abs(endY - plateStart.y)
            };

            setIsDrawingPlate(false);
            setPlateStart(null);

            const roiCtx = roiCanvasRef.current.getContext('2d');
            roiCtx.clearRect(0, 0, roiCanvasRef.current.width, roiCanvasRef.current.height);

            // Trigger OCR scan
            scanPlateRegion(region);
            return;
        }

        // Handle ROI finalization
        if (!isDrawingRoi || !roiStart) return;

        setRoi({
            x: Math.min(roiStart.x, endX),
            y: Math.min(roiStart.y, endY),
            width: Math.abs(endX - roiStart.x),
            height: Math.abs(endY - roiStart.y)
        });

        setIsDrawingRoi(false);
        setRoiStart(null);

        const roiCtx = roiCanvasRef.current.getContext('2d');
        roiCtx.clearRect(0, 0, roiCanvasRef.current.width, roiCanvasRef.current.height);

        toast.success('🎯 Detection zone set!');
    };

    const clearRoi = () => {
        setRoi(null);
        const roiCtx = roiCanvasRef.current?.getContext('2d');
        if (roiCtx) {
            roiCtx.clearRect(0, 0, roiCanvasRef.current.width, roiCanvasRef.current.height);
        }
        toast.info('Detection zone cleared');
    };

    // Scan a manually cropped plate region
    const scanPlateRegion = async (region) => {
        if (!canvasRef.current || !region || region.width < 20 || region.height < 10) {
            toast.error('Please draw a larger area around the plate');
            return;
        }

        setScanningPlate(true);
        toast.info('🔍 Scanning plate...');

        try {

            // Scale factor for better OCR (5x for manual scans)
            const SCALE = 5;

            // Create temporary canvas with scaled region
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = region.width * SCALE;
            tempCanvas.height = region.height * SCALE;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw scaled region
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(
                canvasRef.current,
                region.x, region.y, region.width, region.height,
                0, 0, region.width * SCALE, region.height * SCALE
            );

            // Convert to base64
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.95);

            // Send to Gemini Vision API (more accurate for Indian plates)
            const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_BASE}/api/ocr/plate-gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64,
                    trackId: 'manual-scan'
                })
            });

            const result = await response.json();

            if (result.success && result.plate) {
                setLastScannedPlate({
                    text: result.plate,
                    confidence: result.confidence,
                    timestamp: Date.now()
                });
                toast.success(`🚗 Plate: ${result.plate} (${result.confidence}%)`);
            } else {
                toast.error('❌ Could not read plate. Try drawing closer to the plate text.');
                if (result.all_text && result.all_text.length > 0) {
                    console.log('OCR detected:', result.all_text);
                }
            }
        } catch (error) {
            console.error('Plate scan error:', error);
            toast.error('Scan failed. Check console for details.');
        } finally {
            setScanningPlate(false);
        }
    };

    const handleDeepScan = async () => {
        if (!videoRef.current) return;

        setDeepScanLoading(true);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            const response = await axios.post('http://localhost:8000/detect', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            localStorage.setItem('lastDetectedImage', `data:image/jpeg;base64,${response.data.image}`);
            localStorage.setItem('lastDetectedDetections', JSON.stringify(response.data.detections));

            if (soundEnabled) {
                createBeepSound();
                setTimeout(createBeepSound, 150);
            }

            toast.success(`🎯 Deep Scan found ${response.data.detections.length} objects!`);
            navigate('/results');

        } catch (err) {
            console.error('Deep scan error:', err);
            toast.error('Deep scan failed. Check backend connection.');
            setError('Deep scan failed. Ensure backend is running.');
        } finally {
            setDeepScanLoading(false);
        }
    };

    const uniqueClasses = [...new Set(trackedObjects.map(d => d.class))];

    useEffect(() => {
        if (cameraActive && videoRef.current && roiCanvasRef.current) {
            roiCanvasRef.current.width = videoRef.current.videoWidth;
            roiCanvasRef.current.height = videoRef.current.videoHeight;
        }
    }, [cameraActive]);

    return (
        <>
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        🎬 Live Detection with Tracking
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Real-time AI detection with object tracking
                    </motion.p>
                </Container>
            </div>

            <Container className="my-4">
                <Row className="justify-content-center">
                    <Col lg={10}>
                        {modelLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="text-center p-5 mb-4">
                                    <Card.Body>
                                        <Spinner animation="border" variant="primary" className="mb-3" />
                                        <h4>Loading AI Model...</h4>
                                        <p className="text-muted mb-3">
                                            This may take a few seconds on first load
                                        </p>
                                        <ProgressBar
                                            now={modelProgress}
                                            animated
                                            striped
                                            label={`${modelProgress}%`}
                                        />
                                    </Card.Body>
                                </Card>
                            </motion.div>
                        )}

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                ⚠️ {error}
                            </Alert>
                        )}

                        {!modelLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="shadow-lg mb-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Card.Body className="p-4">
                                        {/* Status Bar */}
                                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                                            <div className="d-flex gap-2 align-items-center flex-wrap">
                                                <span className={`status-badge ${model ? 'badge-model' : ''}`} style={!model ? { background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white' } : {}}>
                                                    {model ? '🧠 Model Ready' : '❌ Model Error'}
                                                </span>
                                                <span className="status-badge badge-camera" style={!cameraActive ? { background: '#4a5568', color: '#a0aec0' } : {}}>
                                                    {cameraActive ? '📷 Camera On' : '📷 Camera Off'}
                                                </span>
                                                {detecting && (
                                                    <span className="status-badge badge-live">
                                                        🔴 LIVE
                                                    </span>
                                                )}
                                                {roi && (
                                                    <span className="status-badge" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white' }}>
                                                        🎯 ROI Active
                                                    </span>
                                                )}
                                                {trackingEnabled && totalTracked > 0 && (
                                                    <span className="status-badge" style={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', color: 'white' }}>
                                                        🔄 {totalTracked} Tracked
                                                    </span>
                                                )}
                                            </div>
                                            {detecting && (
                                                <span className="status-badge badge-fps">
                                                    ⚡ {fps} FPS | {trackedObjects.length} objects
                                                </span>
                                            )}
                                        </div>

                                        {/* Core Features Section */}
                                        <div className="feature-control-panel mb-3">
                                            <div className="section-header">
                                                <span className="icon">🎛️</span>
                                                <span className="title">Core Features</span>
                                            </div>
                                            <div className="feature-grid">
                                                <div className="custom-toggle toggle-primary">
                                                    <Form.Check
                                                        type="switch"
                                                        id="tracking-toggle"
                                                        label="🔄 Object Tracking"
                                                        checked={trackingEnabled}
                                                        onChange={(e) => {
                                                            setTrackingEnabled(e.target.checked);
                                                            if (!e.target.checked) {
                                                                trackerRef.current.reset();
                                                                setTotalTracked(0);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="custom-toggle toggle-success">
                                                    <Form.Check
                                                        type="switch"
                                                        id="sound-toggle"
                                                        label="🔊 Sound Alerts"
                                                        checked={soundEnabled}
                                                        onChange={(e) => setSoundEnabled(e.target.checked)}
                                                    />
                                                </div>
                                                <div className="custom-toggle toggle-danger">
                                                    <Form.Check
                                                        type="switch"
                                                        id="roi-toggle"
                                                        label="🎯 Detection Zone"
                                                        checked={roiEnabled}
                                                        onChange={(e) => {
                                                            setRoiEnabled(e.target.checked);
                                                            if (!e.target.checked) clearRoi();
                                                        }}
                                                    />
                                                </div>
                                                {roiEnabled && !roi && (
                                                    <Badge bg="warning" text="dark" className="mini-badge">
                                                        👆 Draw rectangle on video
                                                    </Badge>
                                                )}
                                                {roiEnabled && roi && (
                                                    <Button
                                                        className="action-btn action-btn-outline"
                                                        size="sm"
                                                        onClick={clearRoi}
                                                    >
                                                        ✕ Clear Zone
                                                    </Button>
                                                )}
                                                <div className="custom-toggle toggle-info">
                                                    <Form.Check
                                                        type="switch"
                                                        id="traffic-sign-toggle"
                                                        label={trafficSignLoading ? '🚦 Loading...' : '🚦 Traffic Signs'}
                                                        checked={trafficSignEnabled}
                                                        disabled={trafficSignLoading}
                                                        onChange={(e) => handleTrafficSignToggle(e.target.checked)}
                                                    />
                                                </div>
                                                {trafficSignEnabled && (
                                                    <Badge className="mini-badge" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                                                        85 Signs
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Advanced AI Features Section */}
                                        <div className="feature-control-panel mb-3">
                                            <div className="section-header">
                                                <span className="icon">🤖</span>
                                                <span className="title">Advanced AI Features</span>
                                            </div>
                                            <div className="feature-grid">
                                                {/* Speed Estimation hidden - requires camera calibration
                                                <div className="custom-toggle toggle-danger">
                                                    <Form.Check
                                                        type="switch"
                                                        id="speed-toggle"
                                                        label="⚡ Speed Estimation"
                                                        checked={speedEnabled}
                                                        onChange={(e) => {
                                                            setSpeedEnabled(e.target.checked);
                                                            if (!e.target.checked) {
                                                                speedEstimatorRef.current.reset();
                                                                setSpeedStats({ avg: 0, max: 0, count: 0 });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {speedEnabled && speedStats.avg > 0 && (
                                                    <span className="speed-badge">
                                                        🏎️ Avg: {speedStats.avg} km/h
                                                    </span>
                                                )}
                                                */}

                                                <div className="custom-toggle toggle-purple">
                                                    <Form.Check
                                                        type="switch"
                                                        id="counting-toggle"
                                                        label="📊 Counting Zones"
                                                        checked={countingEnabled}
                                                        onChange={(e) => {
                                                            setCountingEnabled(e.target.checked);
                                                            if (!e.target.checked) {
                                                                countingZoneRef.current.clearLines();
                                                                setCountingStats({ in: 0, out: 0, total: 0 });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {countingEnabled && (
                                                    <>
                                                        <Button
                                                            className={`action-btn ${isDrawingLine ? 'action-btn-danger' : 'action-btn-outline'}`}
                                                            size="sm"
                                                            onClick={() => setIsDrawingLine(!isDrawingLine)}
                                                        >
                                                            {isDrawingLine ? '✓ Drawing...' : '+ Add Line'}
                                                        </Button>
                                                        <Button
                                                            className="action-btn action-btn-outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                countingZoneRef.current.clearLines();
                                                                setCountingStats({ in: 0, out: 0, total: 0 });
                                                            }}
                                                        >
                                                            Clear All
                                                        </Button>
                                                        <span className="counting-badge">
                                                            ↑{countingStats.in} ↓{countingStats.out} = {countingStats.total}
                                                        </span>
                                                    </>
                                                )}

                                                <div className="custom-toggle toggle-success">
                                                    <Form.Check
                                                        type="switch"
                                                        id="plate-toggle"
                                                        label={plateLoading ? '🚗 Loading...' : '🚗 License Plates'}
                                                        checked={plateEnabled}
                                                        disabled={plateLoading}
                                                        onChange={(e) => handlePlateToggle(e.target.checked)}
                                                    />
                                                </div>
                                                {plateEnabled && detectedPlates.length > 0 && (
                                                    <Badge className="mini-badge" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                                                        {detectedPlates.length} plates
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Voice Control Section */}
                                        {voiceCommands.isSupported && (
                                            <div className="feature-control-panel mb-3">
                                                <div className="section-header">
                                                    <span className="icon">🎙️</span>
                                                    <span className="title">Voice Control</span>
                                                </div>
                                                <div className="d-flex gap-3 align-items-center">
                                                    <button
                                                        className={`voice-btn ${voiceCommands.isListening ? 'listening' : ''}`}
                                                        onClick={voiceCommands.toggleListening}
                                                        title={voiceCommands.isListening ? 'Stop listening' : 'Start voice control'}
                                                    >
                                                        {voiceCommands.isListening ? '🎤' : '🎙️'}
                                                    </button>
                                                    <div style={{ color: '#e6edf3' }}>
                                                        {voiceCommands.isListening ? (
                                                            <span style={{ color: '#f39c12' }}>Listening for commands...</span>
                                                        ) : (
                                                            <span style={{ color: '#8b949e' }}>Click to activate voice control</span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        className="action-btn action-btn-outline ms-auto"
                                                        size="sm"
                                                        onClick={() => setShowVoiceHelp(true)}
                                                    >
                                                        ❓ Commands
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Voice transcript feedback */}
                                        {voiceCommands.isListening && voiceCommands.transcript && (
                                            <Alert variant="info" className="mb-2 py-2">
                                                🎤 "{voiceCommands.transcript}"
                                            </Alert>
                                        )}

                                        {roiEnabled && !roi && cameraActive && (
                                            <Alert variant="info" className="mb-3">
                                                🎯 Draw a rectangle on the video to set your detection zone
                                            </Alert>
                                        )}

                                        {/* Video Container */}
                                        <div
                                            className="live-video-container mb-4"
                                            onMouseDown={handleRoiMouseDown}
                                            onMouseMove={handleRoiMouseMove}
                                            onMouseUp={handleRoiMouseUp}
                                            style={{ cursor: (roiEnabled || isDrawingLine) && cameraActive ? 'crosshair' : 'default' }}
                                        >
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="live-video"
                                            />
                                            <canvas
                                                ref={canvasRef}
                                                className="live-canvas"
                                            />
                                            <canvas
                                                ref={roiCanvasRef}
                                                className="live-canvas roi-canvas"
                                            />
                                            {!cameraActive && (
                                                <div className="live-placeholder">
                                                    <div style={{ fontSize: '4rem' }}>🎥</div>
                                                    <p>Click "Start Camera" to begin</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tracking Stats */}
                                        {detecting && trackingEnabled && (
                                            <Row className="mb-3 text-center">
                                                <Col xs={4}>
                                                    <div className="tracking-stat">
                                                        <h3 className="text-primary mb-0">{totalTracked}</h3>
                                                        <small className="text-muted">Total Tracked</small>
                                                    </div>
                                                </Col>
                                                <Col xs={4}>
                                                    <div className="tracking-stat">
                                                        <h3 className="text-success mb-0">{trackedObjects.length}</h3>
                                                        <small className="text-muted">Active Now</small>
                                                    </div>
                                                </Col>
                                                <Col xs={4}>
                                                    <div className="tracking-stat">
                                                        <h3 className="text-info mb-0">{fps}</h3>
                                                        <small className="text-muted">FPS</small>
                                                    </div>
                                                </Col>
                                            </Row>
                                        )}

                                        {/* Detected Objects */}
                                        {detecting && trackedObjects.length > 0 && (
                                            <div className="detected-objects mb-4">
                                                <h6 className="mb-2">
                                                    {trackingEnabled ? 'Tracked Objects:' : 'Detected Objects:'}
                                                </h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {uniqueClasses.map((cls, i) => {
                                                        const count = trackedObjects.filter(d => d.class === cls).length;
                                                        return (
                                                            <Badge key={i} bg="primary" className="detection-badge">
                                                                {cls} {count > 1 && `(${count})`}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Detected License Plates */}
                                        {plateEnabled && detectedPlates.length > 0 && (
                                            <div className="detected-plates mb-4">
                                                <h6 className="mb-2">🚗 Detected License Plates:</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {detectedPlates.slice(0, 10).map((plate, i) => (
                                                        <Badge
                                                            key={i}
                                                            bg="success"
                                                            className="plate-badge"
                                                            style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                                        >
                                                            {plate.text} ({plate.confidence}%)
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Control Buttons */}
                                        <div className="d-flex flex-wrap gap-2 justify-content-center">
                                            {!cameraActive ? (
                                                <Button
                                                    variant="success"
                                                    size="lg"
                                                    onClick={startCamera}
                                                    disabled={!model}
                                                    className="ripple-button"
                                                >
                                                    📷 Start Camera
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="danger"
                                                        size="lg"
                                                        onClick={stopCamera}
                                                        className="ripple-button"
                                                    >
                                                        ⏹️ Stop Camera
                                                    </Button>

                                                    {!detecting ? (
                                                        <Button
                                                            variant="primary"
                                                            size="lg"
                                                            onClick={startDetection}
                                                            className="ripple-button"
                                                        >
                                                            🎯 Start Detection
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="warning"
                                                            size="lg"
                                                            onClick={stopDetection}
                                                            className="ripple-button"
                                                        >
                                                            ⏸️ Pause Detection
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="info"
                                                        size="lg"
                                                        onClick={handleDeepScan}
                                                        disabled={deepScanLoading}
                                                        className="ripple-button text-white deep-scan-btn"
                                                    >
                                                        {deepScanLoading ? (
                                                            <>
                                                                <Spinner size="sm" className="me-2" />
                                                                Scanning...
                                                            </>
                                                        ) : (
                                                            '🔬 Deep Scan'
                                                        )}
                                                    </Button>

                                                    {/* License Plate Scan - Hidden for now (OCR not reliable enough)
                                                    <Button
                                                        variant={plateScanMode ? "success" : "outline-success"}
                                                        size="lg"
                                                        onClick={() => {
                                                            setPlateScanMode(!plateScanMode);
                                                            if (!plateScanMode) {
                                                                toast.info('📋 Draw a box around the license plate to scan');
                                                            }
                                                        }}
                                                        disabled={scanningPlate}
                                                        className="ripple-button"
                                                    >
                                                        {scanningPlate ? (
                                                            <>
                                                                <Spinner size="sm" className="me-2" />
                                                                Scanning...
                                                            </>
                                                        ) : plateScanMode ? (
                                                            '✅ Draw Plate Box'
                                                        ) : (
                                                            '📋 Scan Plate'
                                                        )}
                                                    </Button>

                                                    {lastScannedPlate && (
                                                        <div className="badge bg-success fs-6 p-2">
                                                            🚗 {lastScannedPlate.text} ({lastScannedPlate.confidence}%)
                                                        </div>
                                                    )}
                                                    */}

                                                    <Button
                                                        variant="secondary"
                                                        size="lg"
                                                        onClick={() => {
                                                            if (document.fullscreenElement) {
                                                                document.exitFullscreen();
                                                            } else {
                                                                document.documentElement.requestFullscreen();
                                                            }
                                                        }}
                                                        className="ripple-button"
                                                    >
                                                        {document.fullscreenElement ? '⬜ Exit Fullscreen' : '🖥️ Fullscreen'}
                                                    </Button>

                                                    <Button
                                                        variant="success"
                                                        size="lg"
                                                        onClick={() => {
                                                            // Export detection report as PDF-like format
                                                            const reportData = {
                                                                timestamp: new Date().toISOString(),
                                                                totalDetections: detections.length,
                                                                trackedObjects: trackedObjects.length,
                                                                uniqueClasses: [...new Set(trackedObjects.map(d => d.class))],
                                                                objects: trackedObjects.map(t => ({
                                                                    id: t.trackId || t.id,
                                                                    class: t.class,
                                                                    confidence: Math.round((t.score || 0.9) * 100) + '%'
                                                                }))
                                                            };

                                                            // Create downloadable JSON report
                                                            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                                                            const url = URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = `detection-report-${Date.now()}.json`;
                                                            link.click();
                                                            URL.revokeObjectURL(url);
                                                            toast.success('📄 Detection report exported!');
                                                        }}
                                                        className="ripple-button"
                                                        disabled={trackedObjects.length === 0}
                                                    >
                                                        📄 Export Report
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>

                                {/* Feature Info Cards */}
                                <Row className="g-3 mb-4">
                                    <Col md={3}>
                                        <Card className="h-100 bg-primary-subtle">
                                            <Card.Body className="text-center">
                                                <h5>🔄</h5>
                                                <small>Object Tracking</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="h-100 bg-success-subtle">
                                            <Card.Body className="text-center">
                                                <h5>🔊</h5>
                                                <small>Sound Alerts</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="h-100 bg-warning-subtle">
                                            <Card.Body className="text-center">
                                                <h5>🎯</h5>
                                                <small>Detection Zone</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="h-100 bg-info-subtle">
                                            <Card.Body className="text-center">
                                                <h5>📈</h5>
                                                <small>Trail Visualization</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Navigation */}
                                <div className="text-center">
                                    <Button as={Link} to="/detect" variant="outline-primary" className="me-2">
                                        📸 Image Upload
                                    </Button>
                                    <Button as={Link} to="/batch" variant="outline-success" className="me-2">
                                        📁 Batch Process
                                    </Button>
                                    <Button as={Link} to="/compare" variant="outline-info" className="me-2">
                                        🔀 Compare
                                    </Button>
                                    <Button as={Link} to="/dashboard" variant="outline-warning">
                                        📊 Analytics
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Voice Commands Help Modal */}
            <Modal show={showVoiceHelp} onHide={() => setShowVoiceHelp(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>🎤 Voice Commands</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <VoiceCommandsHelp />
                    <Alert variant="info" className="mt-3 mb-0">
                        <strong>Tip:</strong> Click the microphone button then speak naturally.
                        Commands work best in a quiet environment.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowVoiceHelp(false)}>
                        Close
                    </Button>
                    {voiceCommands.isSupported && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                setShowVoiceHelp(false);
                                voiceCommands.startListening();
                            }}
                        >
                            🎤 Start Listening
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default LiveDetection;
