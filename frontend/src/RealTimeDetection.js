import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';

const RealTimeDetection = () => {
    const [cameraActive, setCameraActive] = useState(false);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const requestRef = useRef(null);
    const [fps, setFps] = useState(0);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoRef.current.srcObject = stream;
            setCameraActive(true);
            connectWebSocket();
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        if (socketRef.current) {
            socketRef.current.close();
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };

    const connectWebSocket = () => {
        socketRef.current = new WebSocket('ws://localhost:8000/ws/detect');

        socketRef.current.onopen = () => {
            console.log("WebSocket connected");
            sendFrame();
        };

        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.image) {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);

                    // Trigger next frame
                    // Throttle slightly if needed, but for "Real-time" we go as fast as possible
                    // setTimeout(sendFrame, 1000 / 30); // Max 30fps
                    requestRef.current = requestAnimationFrame(sendFrame);
                };
                img.src = `data:image/jpeg;base64,${data.image}`;
            }
        };

        socketRef.current.onerror = (err) => {
            console.error("WebSocket error:", err);
            setError("WebSocket connection failed.");
        };

        socketRef.current.onclose = () => {
            console.log("WebSocket closed");
        };
    };

    const sendFrame = () => {
        if (!cameraActive || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.5); // Quality 0.5 for speed

        socketRef.current.send(base64);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">Real-Time Traffic Stream ⚡</h1>
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="shadow-lg">
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div className="position-relative" style={{ minHeight: '480px', backgroundColor: '#000' }}>
                                {/* Hidden Video Element for Capture */}
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ display: 'none' }}
                                />
                                {/* Visible Canvas for Processed Output */}
                                <canvas
                                    ref={canvasRef}
                                    width={640}
                                    height={480}
                                    className="w-100 rounded"
                                />
                                {!cameraActive && (
                                    <div className="position-absolute top-50 start-50 translate-middle text-white">
                                        <p>Camera is Offline</p>
                                    </div>
                                )}
                            </div>
                            <div className="d-grid gap-2 mt-3 justify-content-center">
                                {!cameraActive ? (
                                    <Button variant="success" onClick={startCamera}>Start Live Stream</Button>
                                ) : (
                                    <Button variant="danger" onClick={stopCamera}>Stop Live Stream</Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RealTimeDetection;
