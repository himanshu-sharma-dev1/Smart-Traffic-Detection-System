import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, ListGroup, Alert, ProgressBar, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

const Results = () => {
    const [imageSrc, setImageSrc] = useState(null);
    const [detections, setDetections] = useState([]);
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    // Map common object names to emojis for visual flair
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
        'Road sign': 'igns',
        // Add more mappings as needed for common detections
    };

    const getEmoji = (label) => {
        // Try exact match first
        if (emojiMap[label]) {
            return emojiMap[label];
        }
        // Try partial match for more generic terms like 'sign'
        for (const key in emojiMap) {
            if (label.toLowerCase().includes(key.toLowerCase())) {
                return emojiMap[key];
            }
        }
        return '✨'; // Default emoji if no specific match
    };

    const drawDetectionsOnCanvas = (image, detectionsData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            // Set canvas dimensions to match image
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            detectionsData.forEach(detection => {
                const [x_min, y_min, x_max, y_max] = detection.box;
                const label = detection.label;
                const confidence = detection.confidence;

                // Draw rectangle
                ctx.beginPath();
                ctx.rect(x_min, y_min, x_max - x_min, y_max - y_min);
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#2ecc71'; // Accent green
                ctx.stroke();

                // Draw label background
                ctx.fillStyle = '#2ecc71'; // Accent green
                const fontSize = 24;
                ctx.font = `${fontSize}px Arial`;
                const textWidth = ctx.measureText(`${label} ${(confidence * 100).toFixed(1)}%`).width;
                ctx.fillRect(x_min, y_min - fontSize - 8, textWidth + 10, fontSize + 8);

                // Draw label text
                ctx.fillStyle = 'white';
                ctx.fillText(`${label} ${(confidence * 100).toFixed(1)}%`, x_min + 5, y_min - 5);
            });
        };
        img.src = image;
    };

    useEffect(() => {
        const storedImage = localStorage.getItem('lastDetectedImage');
        const storedDetections = localStorage.getItem('lastDetectedDetections');

        if (storedImage && storedDetections) {
            setImageSrc(storedImage);
            const parsedDetections = JSON.parse(storedDetections);
            setDetections(parsedDetections);
            // Draw on canvas once image and detections are set
            drawDetectionsOnCanvas(storedImage, parsedDetections);
        } else {
            // If no data, redirect back to detection page
            navigate('/detect');
        }
    }, [navigate]);

    // Redraw on canvas if imageSrc or detections change (e.g., if component re-renders)
    useEffect(() => {
        if (imageSrc && detections.length > 0) {
            drawDetectionsOnCanvas(imageSrc, detections);
        }
    }, [imageSrc, detections]);

    if (!imageSrc) {
        return null; // Or a loading spinner
    }

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">Detection Results 📊</h1>
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    <Card className="shadow-lg">
                        <Card.Body>
                            <h2 className="text-center mb-3">Captured Image</h2>
                            <div className="canvas-container mb-3">
                                <canvas ref={canvasRef} className="w-100 rounded" style={{ border: '2px solid #1a2a6c' }}></canvas>
                            </div>
                            <h3 className="mb-3">Detected Objects:</h3>
                            {detections.length > 0 ? (
                                <ListGroup variant="flush">
                                    <TransitionGroup component={null}>
                                        {detections.map((detection, index) => (
                                            <CSSTransition key={index} timeout={500} classNames="detected-item">
                                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span style={{ fontSize: '1.8rem', marginRight: '15px' }}>{getEmoji(detection.label)}</span>
                                                        <strong>{detection.label}</strong>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <ProgressBar now={(detection.confidence * 100).toFixed(0)} label={`${(detection.confidence * 100).toFixed(0)}%`} className="me-2" style={{ width: '100px' }} />
                                                        <span className="badge bg-primary rounded-pill">{(detection.confidence * 100).toFixed(2)}%</span>
                                                    </div>
                                                </ListGroup.Item>
                                            </CSSTransition>
                                        ))}
                                    </TransitionGroup>
                                </ListGroup>
                            ) : (
                                <Alert variant="info">No significant objects detected in the image.</Alert>
                            )}
                            <div className="text-center mt-4">
                                <Button variant="secondary" onClick={() => navigate('/detect')} className="ripple-button">
                                    Detect Another Image
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Results;