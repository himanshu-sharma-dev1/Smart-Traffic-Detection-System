import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, ListGroup, Alert, ProgressBar, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { useAuth } from './context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Results = () => {
    const { isAuthenticated, token } = useAuth();
    const [imageSrc, setImageSrc] = useState(null);
    const [detections, setDetections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confettiTriggered, setConfettiTriggered] = useState(false);
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    // Map common object names to emojis
    const emojiMap = {
        'Traffic sign': '🛑',
        'Stop sign': '⛔',
        'Speed limit sign': '🔢',
        'Yield sign': '⚠️',
        'Street sign': '🛣️',
        'Car': '🚗',
        'Truck': '🚚',
        'Bus': '🚌',
        'Motorcycle': '🏍️',
        'Bicycle': '🚲',
        'Person': '🚶',
        'Traffic light': '🚦',
        'Road sign': '🛤️',
        'Sign': '📋',
        'Vehicle': '🚙',
        'Building': '🏢',
        'Tree': '🌳',
    };

    const getEmoji = (label) => {
        if (emojiMap[label]) {
            return emojiMap[label];
        }
        for (const key in emojiMap) {
            if (label.toLowerCase().includes(key.toLowerCase())) {
                return emojiMap[key];
            }
        }
        return '✨';
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.9) return 'success';
        if (confidence >= 0.7) return 'info';
        if (confidence >= 0.5) return 'warning';
        return 'danger';
    };

    // Celebration confetti effect
    const triggerConfetti = () => {
        if (confettiTriggered) return;
        setConfettiTriggered(true);

        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c']
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c']
            });
        }, 250);
    };

    // Compress image for storage (~100KB thumbnail)
    const compressImage = (base64Image, maxWidth = 400) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85)); // 85% quality for ~100KB
            };
            img.src = base64Image;
        });
    };

    // Save to history with compression
    const saveToHistory = async (image, detectionsData) => {
        try {
            // Compress image to thumbnail for storage
            const thumbnail = await compressImage(image);

            // Save to localStorage as fallback
            const historyItem = {
                id: Date.now(),
                image: thumbnail,
                detections: detectionsData,
                timestamp: new Date().toISOString(),
                avgConfidence: detectionsData.reduce((sum, d) => sum + d.confidence, 0) / detectionsData.length || 0
            };

            const existingHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]');
            const updatedHistory = [historyItem, ...existingHistory].slice(0, 20);
            localStorage.setItem('detectionHistory', JSON.stringify(updatedHistory));

            // Save to database if authenticated (uses compressed thumbnail to save space)
            if (isAuthenticated && token) {
                try {
                    await axios.post(`${API_URL}/api/detections/`, {
                        detections: detectionsData.map(d => ({
                            label: d.label,
                            confidence: d.confidence,
                            box: d.box
                        })),
                        image_base64: thumbnail, // Use compressed thumbnail (~5KB) instead of full image
                        source: 'upload'
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log('Detection saved to database');
                } catch (apiError) {
                    console.warn('Could not save to database:', apiError.message);
                }
            }
        } catch (error) {
            console.warn('Could not save to history:', error.message);
            if (error.name === 'QuotaExceededError') {
                try {
                    localStorage.removeItem('detectionHistory');
                    console.log('Cleared old history due to quota limit');
                } catch (e) {
                    console.warn('Could not clear history:', e);
                }
            }
        }
    };

    const drawDetectionsOnCanvas = (image, detectionsData) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error('Canvas ref not found');
            setLoading(false);
            return;
        }
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onerror = (e) => {
            console.error('Failed to load image:', e);
            setLoading(false);
            // Try to display the image directly if canvas fails
        };

        img.onload = () => {
            try {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                detectionsData.forEach((detection, index) => {
                    const [x_min, y_min, x_max, y_max] = detection.box;
                    const label = detection.label;
                    const confidence = detection.confidence;

                    const colors = ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'];
                    const color = colors[index % colors.length];

                    // Draw rectangle
                    ctx.beginPath();
                    ctx.rect(x_min, y_min, x_max - x_min, y_max - y_min);
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = color;
                    ctx.stroke();

                    // Draw corner accents
                    const cornerSize = 15;
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = color;

                    // Top-left
                    ctx.beginPath();
                    ctx.moveTo(x_min, y_min + cornerSize);
                    ctx.lineTo(x_min, y_min);
                    ctx.lineTo(x_min + cornerSize, y_min);
                    ctx.stroke();

                    // Top-right
                    ctx.beginPath();
                    ctx.moveTo(x_max - cornerSize, y_min);
                    ctx.lineTo(x_max, y_min);
                    ctx.lineTo(x_max, y_min + cornerSize);
                    ctx.stroke();

                    // Bottom-left
                    ctx.beginPath();
                    ctx.moveTo(x_min, y_max - cornerSize);
                    ctx.lineTo(x_min, y_max);
                    ctx.lineTo(x_min + cornerSize, y_max);
                    ctx.stroke();

                    // Bottom-right
                    ctx.beginPath();
                    ctx.moveTo(x_max - cornerSize, y_max);
                    ctx.lineTo(x_max, y_max);
                    ctx.lineTo(x_max, y_max - cornerSize);
                    ctx.stroke();

                    // Draw label background
                    const fontSize = Math.max(16, Math.min(24, (x_max - x_min) / 8));
                    ctx.font = `bold ${fontSize}px 'Poppins', Arial`;
                    const labelText = `${label} ${(confidence * 100).toFixed(0)}%`;
                    const textWidth = ctx.measureText(labelText).width;
                    const padding = 8;

                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.roundRect(x_min, y_min - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 1.5, 4);
                    ctx.fill();

                    ctx.fillStyle = 'white';
                    ctx.fillText(labelText, x_min + padding, y_min - padding);
                });

                setLoading(false);

                // Trigger confetti if detections found
                if (detectionsData.length > 0) {
                    setTimeout(() => triggerConfetti(), 500);
                }
            } catch (err) {
                console.error('Error drawing on canvas:', err);
                setLoading(false);
            }
        };

        // Set the source after setting up handlers
        img.src = image;
    };

    useEffect(() => {
        const storedImage = localStorage.getItem('lastDetectedImage');
        const storedDetections = localStorage.getItem('lastDetectedDetections');

        if (storedImage && storedDetections) {
            setImageSrc(storedImage);
            const parsedDetections = JSON.parse(storedDetections);
            setDetections(parsedDetections);
            drawDetectionsOnCanvas(storedImage, parsedDetections);

            // Save to history
            saveToHistory(storedImage, parsedDetections);
        } else {
            navigate('/detect');
        }
    }, [navigate]);

    const downloadImage = () => {
        if (imageSrc) {
            const link = document.createElement('a');
            link.download = `detection-result-${Date.now()}.jpg`;
            link.href = imageSrc;
            link.click();
        }
    };

    if (!imageSrc) {
        return (
            <Container className="my-5 text-center">
                <div className="skeleton" style={{ height: '400px', marginBottom: '2rem' }}></div>
                <div className="skeleton" style={{ height: '200px' }}></div>
            </Container>
        );
    }

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        📊 Detection Results
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Found <strong>{detections.length}</strong> object{detections.length !== 1 ? 's' : ''} in your image
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="justify-content-center">
                    <Col lg={10}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Card className="shadow-lg mb-4">
                                <Card.Body className="p-4">
                                    {/* Success Banner */}
                                    {detections.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, delay: 0.3 }}
                                        >
                                            <Alert variant="success" className="text-center mb-4">
                                                🎉 <strong>Success!</strong> Detection completed. Results saved to history.
                                            </Alert>
                                        </motion.div>
                                    )}

                                    {/* Image Container - Direct img display */}
                                    <div className="image-container mb-4 text-center position-relative">
                                        {imageSrc && (
                                            <img
                                                src={imageSrc}
                                                alt="Detection Result"
                                                className="img-fluid rounded"
                                                style={{
                                                    maxWidth: '100%',
                                                    border: '3px solid var(--primary-dark)',
                                                    display: loading ? 'none' : 'block',
                                                    margin: '0 auto'
                                                }}
                                                onLoad={() => setLoading(false)}
                                                onError={(e) => {
                                                    console.error('Image load error');
                                                    setLoading(false);
                                                }}
                                            />
                                        )}
                                        {/* Hidden canvas for download functionality */}
                                        <canvas
                                            ref={canvasRef}
                                            style={{ display: 'none' }}
                                        />
                                        {loading && (
                                            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Detection Results */}
                                    <h3 className="mb-4">🎯 Detected Objects</h3>
                                    {detections.length > 0 ? (
                                        <ListGroup variant="flush">
                                            <AnimatePresence>
                                                {detections.map((detection, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                                    >
                                                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center">
                                                                <motion.span
                                                                    style={{ fontSize: '2rem', marginRight: '15px' }}
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{
                                                                        type: "spring",
                                                                        stiffness: 500,
                                                                        delay: index * 0.1 + 0.2
                                                                    }}
                                                                >
                                                                    {getEmoji(detection.label)}
                                                                </motion.span>
                                                                <div>
                                                                    <strong className="d-block">{detection.label}</strong>
                                                                    <small className="text-muted">Object #{index + 1}</small>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div style={{ width: '120px' }}>
                                                                    <ProgressBar
                                                                        now={(detection.confidence * 100).toFixed(0)}
                                                                        variant={getConfidenceColor(detection.confidence)}
                                                                        className="mb-1"
                                                                        style={{ height: '8px' }}
                                                                    />
                                                                    <small className="text-muted">Confidence</small>
                                                                </div>
                                                                <span className={`badge bg-${getConfidenceColor(detection.confidence)} rounded-pill`}>
                                                                    {(detection.confidence * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </ListGroup.Item>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </ListGroup>
                                    ) : (
                                        <Alert variant="info">
                                            🔍 No significant objects detected. Try with a clearer image.
                                        </Alert>
                                    )}

                                    {/* Action Buttons */}
                                    <motion.div
                                        className="d-flex gap-3 justify-content-center mt-4 flex-wrap"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                    >
                                        <Button
                                            variant="primary"
                                            onClick={() => navigate('/detect')}
                                            className="ripple-button px-4"
                                        >
                                            🎯 Detect Another
                                        </Button>
                                        <Button
                                            variant="success"
                                            onClick={downloadImage}
                                            className="ripple-button px-4"
                                        >
                                            📥 Download
                                        </Button>
                                        <Button
                                            variant="info"
                                            as={Link}
                                            to="/history"
                                            className="px-4 text-white"
                                        >
                                            📜 View History
                                        </Button>
                                        <Button
                                            variant="outline-secondary"
                                            as={Link}
                                            to="/"
                                            className="px-4"
                                        >
                                            🏠 Home
                                        </Button>
                                    </motion.div>
                                </Card.Body>
                            </Card>
                        </motion.div>

                        {/* Summary Stats */}
                        {detections.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                <Card className="shadow-sm bg-success-subtle">
                                    <Card.Body>
                                        <Row className="text-center">
                                            <Col md={4}>
                                                <motion.h4
                                                    className="mb-1"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, delay: 0.7 }}
                                                >
                                                    {detections.length}
                                                </motion.h4>
                                                <small className="text-muted">Objects Detected</small>
                                            </Col>
                                            <Col md={4}>
                                                <motion.h4
                                                    className="mb-1"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, delay: 0.8 }}
                                                >
                                                    {(detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100).toFixed(1)}%
                                                </motion.h4>
                                                <small className="text-muted">Average Confidence</small>
                                            </Col>
                                            <Col md={4}>
                                                <motion.h4
                                                    className="mb-1"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, delay: 0.9 }}
                                                >
                                                    {(Math.max(...detections.map(d => d.confidence)) * 100).toFixed(1)}%
                                                </motion.h4>
                                                <small className="text-muted">Highest Confidence</small>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </motion.div>
                        )}
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Results;