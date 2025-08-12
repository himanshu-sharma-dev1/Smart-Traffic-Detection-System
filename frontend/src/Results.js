import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ListGroup, Alert } from 'react-bootstrap';
import './Results.css';

const Results = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    // Effect to handle missing state and redirect
    useEffect(() => {
        if (!state || !state.image || !state.detections) {
            console.log("No detection data found in state, redirecting.");
            navigate('/detect');
        }
    }, [state, navigate]);

    // Effect to draw detections on the canvas
    useEffect(() => {
        if (state && state.image && state.detections && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Draw each detection
                state.detections.forEach(det => {
                    const [x_min, y_min, x_max, y_max] = det.box;
                    ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; // --primary with opacity
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);

                    const label = `${det.label} (${(det.confidence * 100).toFixed(0)}%)`;
                    ctx.fillStyle = 'rgba(0, 123, 255, 0.9)';
                    ctx.font = '16px Inter, sans-serif';
                    const textWidth = ctx.measureText(label).width;
                    ctx.fillRect(x_min, y_min - 25, textWidth + 10, 25);

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(label, x_min + 5, y_min - 5);
                });
            };
            img.src = state.image;
        }
    }, [state]);

    // If state is not yet available, render nothing or a loader
    if (!state || !state.image || !state.detections) {
        return null; // Or a loading spinner
    }

    return (
        <Container className="my-5">
            <div className="text-center mb-5">
                <h1>Detection Results</h1>
                <p className="lead text-muted">Review the objects identified in your image.</p>
            </div>

            <Row className="g-5">
                <Col lg={7}>
                    <h3 className="mb-3">Processed Image</h3>
                    <canvas ref={canvasRef} className="results-canvas" />
                </Col>
                <Col lg={5}>
                    <h3 className="mb-3">Detected Objects</h3>
                    {state.detections.length > 0 ? (
                        <ListGroup>
                            {state.detections.map((detection, index) => (
                                <ListGroup.Item key={index} className="results-list-item">
                                    <span className="detection-label">{detection.label}</span>
                                    <span className="detection-confidence">
                                        {(detection.confidence * 100).toFixed(0)}%
                                    </span>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <Alert variant="info">No objects were detected in the image.</Alert>
                    )}
                    <div className="d-grid mt-4">
                        <Button variant="primary" size="lg" onClick={() => navigate('/detect')}>
                            Analyze Another Image
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Results;