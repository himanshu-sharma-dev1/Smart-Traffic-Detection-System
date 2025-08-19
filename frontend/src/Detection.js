import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Card, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Detection = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null); // Ref for the canvas element
    const fileInputRef = useRef(null); // Ref for the file input
    const scanningOverlayRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Cleanup camera stream when component unmounts
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (cameraActive && scanningOverlayRef.current) {
            scanningOverlayRef.current.style.animation = 'scan 2s infinite linear';
        } else if (scanningOverlayRef.current) {
            scanningOverlayRef.current.style.animation = 'none';
        }
    }, [cameraActive]);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            setCameraActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please ensure you have a webcam connected and have granted permission.");
            setCameraActive(false);
            toast.error("Camera access denied or not available!");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setCameraActive(false);
        }
    };

    const blobToDataURL = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const processImage = async (imageBlob) => {
        setLoading(true);
        setError(null);

        try {
            // Convert blob to data URL and store it first
            const imageUrl = await blobToDataURL(imageBlob);
            localStorage.setItem('lastDetectedImage', imageUrl);

            const formData = new FormData();
            formData.append('file', imageBlob, 'image.jpg');

            const response = await axios.post('http://localhost:8000/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Detections from API, image is already in local storage
            localStorage.setItem('lastDetectedDetections', JSON.stringify(response.data.detections));

            toast.success("Image processed successfully!");
            navigate('/results'); // Redirect to results page

        } catch (error) {
            console.error("Error detecting signs:", error);
            setError("An error occurred while detecting signs. Please try again. Ensure the backend server is running.");
            toast.error("Detection failed. Check backend connection and console for details.");
        } finally {
            setLoading(false); // Ensure loading state is always reset
        }
    };

    const captureFromWebcam = () => {
        if (!videoRef.current || !cameraActive) {
            setError("Camera not active. Please start the camera first.");
            toast.error("Camera not active. Please start the camera first.");
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            processImage(blob);
        }, 'image/jpeg');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Please upload an image file.");
                toast.error("Please upload an image file.");
                return;
            }
            processImage(file);
        }
    };

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">Live Traffic Sign Detection 🎥</h1>
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    <Card className="shadow-lg mb-4">
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div className="video-feed-container mb-3">
                                <video ref={videoRef} autoPlay playsInline muted={true} className="w-100 rounded" />
                                {cameraActive && <div ref={scanningOverlayRef} className="scanning-overlay"></div>}
                            </div>
                            <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                                {!cameraActive ? (
                                    <Button variant="success" onClick={startCamera} disabled={loading} className="ripple-button">
                                        <i className="bi bi-camera-video"></i> Start Camera
                                    </Button>
                                ) : (
                                    <Button variant="danger" onClick={stopCamera} disabled={loading} className="ripple-button">
                                        <i className="bi bi-camera-video-off"></i> Stop Camera
                                    </Button>
                                )}
                                <Button variant="primary" onClick={captureFromWebcam} disabled={loading || !cameraActive} className="ripple-button">
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-camera"></i>} Capture from Webcam
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <Button variant="info" onClick={() => fileInputRef.current.click()} disabled={loading} className="ripple-button">
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-upload"></i>} Upload Image
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Detection;