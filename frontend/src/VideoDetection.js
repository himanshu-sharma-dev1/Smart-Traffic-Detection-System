/**
 * VideoDetection - Upload and analyze video files frame-by-frame
 * Supports MP4, WebM, and other browser-compatible video formats
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ProgressBar, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

const VideoDetection = () => {
    const [model, setModel] = useState(null);
    const [modelLoading, setModelLoading] = useState(true);
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [detections, setDetections] = useState([]);
    const [allDetections, setAllDetections] = useState([]);
    const [fps, setFps] = useState(0);
    const [error, setError] = useState(null);
    const [processingSpeed, setProcessingSpeed] = useState(1); // 1x, 2x, etc.

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const fpsRef = useRef({ frameCount: 0, lastTime: Date.now() });

    // Load model on mount
    useEffect(() => {
        loadModel();
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, []);

    const loadModel = async () => {
        try {
            setModelLoading(true);
            const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            setModel(loadedModel);
            setModelLoading(false);
            toast.success('🧠 AI Model loaded!');
        } catch (err) {
            setError('Failed to load AI model');
            setModelLoading(false);
        }
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate video type
        if (!file.type.startsWith('video/')) {
            toast.error('Please upload a video file');
            return;
        }

        // Cleanup previous URL
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }

        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setAllDetections([]);
        setProgress(0);
        setDetections([]);
        toast.success(`📹 Video loaded: ${file.name}`);
    };

    // Handle video metadata loaded
    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            // Set canvas size
            if (canvasRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
            }
        }
    };

    // Process frame
    const processFrame = useCallback(async () => {
        if (!model || !videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Run detection
        try {
            const predictions = await model.detect(canvas);
            setDetections(predictions);

            // Store detection with timestamp
            if (predictions.length > 0) {
                setAllDetections(prev => [
                    ...prev,
                    {
                        time: video.currentTime,
                        detections: predictions.map(p => ({
                            class: p.class,
                            score: p.score,
                            bbox: p.bbox
                        }))
                    }
                ]);
            }

            // Draw bounding boxes
            predictions.forEach((prediction, i) => {
                const [x, y, width, height] = prediction.bbox;
                const colors = ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f1c40f', '#1abc9c'];
                const color = colors[i % colors.length];

                // Draw box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // Draw corners
                const corner = 15;
                ctx.lineWidth = 4;
                // Top-left
                ctx.beginPath();
                ctx.moveTo(x, y + corner);
                ctx.lineTo(x, y);
                ctx.lineTo(x + corner, y);
                ctx.stroke();
                // Top-right
                ctx.beginPath();
                ctx.moveTo(x + width - corner, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + corner);
                ctx.stroke();
                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(x, y + height - corner);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x + corner, y + height);
                ctx.stroke();
                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(x + width - corner, y + height);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x + width, y + height - corner);
                ctx.stroke();

                // Draw label
                const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
                ctx.fillStyle = color;
                ctx.fillRect(x, y - 25, ctx.measureText(label).width + 10, 25);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(label, x + 5, y - 8);
            });

            // Calculate FPS
            fpsRef.current.frameCount++;
            const now = Date.now();
            if (now - fpsRef.current.lastTime >= 1000) {
                setFps(fpsRef.current.frameCount);
                fpsRef.current.frameCount = 0;
                fpsRef.current.lastTime = now;
            }

        } catch (err) {
            console.error('Detection error:', err);
        }

        // Update progress
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);

        // Continue processing
        animationRef.current = requestAnimationFrame(processFrame);
    }, [model]);

    // Start processing
    const startProcessing = () => {
        if (!videoRef.current || !model) return;

        setIsProcessing(true);
        setIsPaused(false);
        videoRef.current.playbackRate = processingSpeed;
        videoRef.current.play();
        processFrame();
        toast.info('🎬 Processing started');
    };

    // Pause processing
    const pauseProcessing = () => {
        if (!videoRef.current) return;

        if (isPaused) {
            videoRef.current.play();
            setIsPaused(false);
            processFrame();
        } else {
            videoRef.current.pause();
            setIsPaused(true);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    };

    // Stop processing
    const stopProcessing = () => {
        if (!videoRef.current) return;

        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsProcessing(false);
        setIsPaused(false);
        setProgress(0);
        setCurrentTime(0);

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    // Handle video end
    const handleVideoEnded = () => {
        setIsProcessing(false);
        toast.success(`✅ Processing complete! ${allDetections.length} detection events`);
    };

    // Seek video
    const handleSeek = (e) => {
        if (!videoRef.current) return;
        const seekTime = (e.target.value / 100) * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        setProgress(e.target.value);
    };

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Export detections as JSON
    const exportDetections = () => {
        const data = {
            video: videoFile?.name,
            duration: duration,
            totalEvents: allDetections.length,
            detections: allDetections
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `detections-${videoFile?.name || 'video'}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('📥 Detections exported');
    };

    // Download annotated frame
    const downloadFrame = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `frame-${formatTime(currentTime).replace(':', '-')}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
        toast.success('📸 Frame saved');
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                        🎬 Video Detection
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Upload and analyze video files frame-by-frame
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="justify-content-center">
                    <Col lg={10}>
                        {modelLoading ? (
                            <Card className="shadow-lg mb-4">
                                <Card.Body className="text-center p-5">
                                    <div className="loading-spinner mb-3"></div>
                                    <h4>Loading AI Model...</h4>
                                </Card.Body>
                            </Card>
                        ) : error ? (
                            <Alert variant="danger">{error}</Alert>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="shadow-lg mb-4">
                                    <Card.Body className="p-4">
                                        {/* Status Bar */}
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <div className="d-flex gap-2 align-items-center">
                                                <Badge bg={model ? 'success' : 'danger'}>
                                                    🧠 Model Ready
                                                </Badge>
                                                {videoFile && (
                                                    <Badge bg="info">
                                                        📹 {videoFile.name}
                                                    </Badge>
                                                )}
                                                {isProcessing && (
                                                    <Badge bg="danger" className="live-badge">
                                                        🔴 PROCESSING
                                                    </Badge>
                                                )}
                                            </div>
                                            {isProcessing && (
                                                <Badge bg="dark">
                                                    {fps} FPS | {detections.length} objects
                                                </Badge>
                                            )}
                                        </div>

                                        {/* File Upload */}
                                        {!videoUrl && (
                                            <div className="text-center p-5 border border-dashed rounded mb-4"
                                                style={{ borderStyle: 'dashed', cursor: 'pointer' }}
                                                onClick={() => document.getElementById('video-upload').click()}>
                                                <input
                                                    type="file"
                                                    id="video-upload"
                                                    accept="video/*"
                                                    onChange={handleFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                                <div style={{ fontSize: '4rem' }}>📁</div>
                                                <h5>Click or drag video file here</h5>
                                                <p className="text-muted mb-0">Supports MP4, WebM, MOV</p>
                                            </div>
                                        )}

                                        {/* Video Preview */}
                                        {videoUrl && (
                                            <>
                                                <div className="position-relative mb-3" style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <video
                                                        ref={videoRef}
                                                        src={videoUrl}
                                                        onLoadedMetadata={handleVideoLoaded}
                                                        onEnded={handleVideoEnded}
                                                        style={{ width: '100%', display: isProcessing ? 'none' : 'block' }}
                                                        muted
                                                    />
                                                    <canvas
                                                        ref={canvasRef}
                                                        style={{
                                                            width: '100%',
                                                            display: isProcessing ? 'block' : 'none',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <small>{formatTime(currentTime)}</small>
                                                        <small>{formatTime(duration)}</small>
                                                    </div>
                                                    <Form.Range
                                                        value={progress}
                                                        onChange={handleSeek}
                                                        disabled={isProcessing && !isPaused}
                                                    />
                                                    <ProgressBar
                                                        now={progress}
                                                        variant="primary"
                                                        animated={isProcessing && !isPaused}
                                                        label={`${Math.round(progress)}%`}
                                                    />
                                                </div>

                                                {/* Speed Control */}
                                                <div className="d-flex align-items-center gap-3 mb-3">
                                                    <span>Speed:</span>
                                                    {[0.5, 1, 1.5, 2].map(speed => (
                                                        <Button
                                                            key={speed}
                                                            variant={processingSpeed === speed ? 'primary' : 'outline-secondary'}
                                                            size="sm"
                                                            onClick={() => {
                                                                setProcessingSpeed(speed);
                                                                if (videoRef.current) {
                                                                    videoRef.current.playbackRate = speed;
                                                                }
                                                            }}
                                                        >
                                                            {speed}x
                                                        </Button>
                                                    ))}
                                                </div>

                                                {/* Controls */}
                                                <div className="d-flex gap-2 flex-wrap justify-content-center mb-4">
                                                    {!isProcessing ? (
                                                        <Button variant="success" size="lg" onClick={startProcessing}>
                                                            ▶️ Start Processing
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button variant="warning" onClick={pauseProcessing}>
                                                                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                                                            </Button>
                                                            <Button variant="danger" onClick={stopProcessing}>
                                                                ⏹️ Stop
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button variant="outline-primary" onClick={downloadFrame} disabled={!isProcessing}>
                                                        📸 Save Frame
                                                    </Button>
                                                    <Button
                                                        variant="outline-success"
                                                        onClick={() => {
                                                            setVideoUrl(null);
                                                            setVideoFile(null);
                                                            setAllDetections([]);
                                                        }}
                                                    >
                                                        📁 New Video
                                                    </Button>
                                                </div>

                                                {/* Detection Results */}
                                                {allDetections.length > 0 && (
                                                    <Card className="bg-light">
                                                        <Card.Body>
                                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                                <h5 className="mb-0">📊 Detection Summary</h5>
                                                                <Button variant="primary" size="sm" onClick={exportDetections}>
                                                                    📥 Export JSON
                                                                </Button>
                                                            </div>
                                                            <Row>
                                                                <Col md={4}>
                                                                    <div className="text-center">
                                                                        <h3 className="text-primary">{allDetections.length}</h3>
                                                                        <small className="text-muted">Detection Events</small>
                                                                    </div>
                                                                </Col>
                                                                <Col md={4}>
                                                                    <div className="text-center">
                                                                        <h3 className="text-success">
                                                                            {[...new Set(allDetections.flatMap(d => d.detections.map(det => det.class)))].length}
                                                                        </h3>
                                                                        <small className="text-muted">Unique Classes</small>
                                                                    </div>
                                                                </Col>
                                                                <Col md={4}>
                                                                    <div className="text-center">
                                                                        <h3 className="text-info">{formatTime(duration)}</h3>
                                                                        <small className="text-muted">Video Length</small>
                                                                    </div>
                                                                </Col>
                                                            </Row>
                                                        </Card.Body>
                                                    </Card>
                                                )}
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>

                                {/* Navigation */}
                                <div className="text-center">
                                    <Button as={Link} to="/live" variant="outline-primary" className="me-2">
                                        🎥 Live Camera
                                    </Button>
                                    <Button as={Link} to="/detect" variant="outline-success" className="me-2">
                                        📸 Image Upload
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
        </>
    );
};

export default VideoDetection;
