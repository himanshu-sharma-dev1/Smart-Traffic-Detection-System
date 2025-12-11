import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Card, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Detection = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const scanningOverlayRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
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
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                }
            });
            videoRef.current.srcObject = stream;
            setCameraActive(true);
            toast.success('📷 Camera activated successfully!');
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
            toast.info('📷 Camera stopped');
        }
    };

    const processImage = async (imageBlob) => {
        setLoading(true);
        setError(null);
        setProgress(10);

        const formData = new FormData();
        formData.append('file', imageBlob, 'image.jpg');

        try {
            setProgress(30);

            const response = await axios.post('http://localhost:8000/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total);
                    setProgress(30 + percentCompleted);
                }
            });

            setProgress(90);

            localStorage.setItem('lastDetectedImage', `data:image/jpeg;base64,${response.data.image}`);
            localStorage.setItem('lastDetectedDetections', JSON.stringify(response.data.detections));

            setProgress(100);

            const detectionCount = response.data.detections.length;
            toast.success(`🎉 Found ${detectionCount} object${detectionCount !== 1 ? 's' : ''}!`);

            navigate('/results');

        } catch (error) {
            console.error("Error detecting signs:", error);
            setError("An error occurred while detecting signs. Please try again. Ensure the backend server is running.");
            toast.error("Detection failed. Check backend connection.");
        } finally {
            setLoading(false);
            setProgress(0);
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
        }, 'image/jpeg', 0.9);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Please upload an image file.");
                toast.error("Please upload an image file.");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError("File size too large. Please upload an image under 10MB.");
                toast.error("File size too large (max 10MB).");
                return;
            }
            processImage(file);
        }
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <h1>🎯 Live Detection Mode</h1>
                    <p className="lead mb-0">Point your camera at a traffic sign or upload an image</p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="justify-content-center">
                    <Col md={10} lg={8}>
                        <Card className="shadow-lg mb-4">
                            <Card.Body className="p-4">
                                {error && (
                                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                        ⚠️ {error}
                                    </Alert>
                                )}

                                {/* Progress Bar */}
                                {loading && (
                                    <div className="mb-3">
                                        <small className="text-muted">Processing image...</small>
                                        <ProgressBar
                                            now={progress}
                                            animated
                                            striped
                                            label={`${progress}%`}
                                            className="mt-1"
                                        />
                                    </div>
                                )}

                                {/* Video Feed */}
                                <div className="video-feed-container mb-4">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted={true}
                                        className="w-100 rounded"
                                    />
                                    {cameraActive && (
                                        <div ref={scanningOverlayRef} className="scanning-overlay"></div>
                                    )}
                                    {!cameraActive && (
                                        <div className="position-absolute top-50 start-50 translate-middle text-white text-center">
                                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                                            <p className="mb-0">Click "Start Camera" to begin</p>
                                        </div>
                                    )}
                                </div>

                                {/* Control Buttons */}
                                <div className="d-grid gap-2 d-md-flex justify-content-md-center flex-wrap">
                                    {!cameraActive ? (
                                        <Button
                                            variant="success"
                                            onClick={startCamera}
                                            disabled={loading}
                                            className="ripple-button px-4"
                                            size="lg"
                                        >
                                            📷 Start Camera
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="danger"
                                            onClick={stopCamera}
                                            disabled={loading}
                                            className="ripple-button px-4"
                                            size="lg"
                                        >
                                            ⏹️ Stop Camera
                                        </Button>
                                    )}
                                    <Button
                                        variant="primary"
                                        onClick={captureFromWebcam}
                                        disabled={loading || !cameraActive}
                                        className="ripple-button px-4"
                                        size="lg"
                                    >
                                        {loading ? (
                                            <><Spinner animation="border" size="sm" className="me-2" /> Processing...</>
                                        ) : (
                                            '🎯 Capture & Detect'
                                        )}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        variant="info"
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={loading}
                                        className="ripple-button px-4 text-white"
                                        size="lg"
                                    >
                                        📁 Upload Image
                                    </Button>
                                    <Button
                                        variant="warning"
                                        onClick={() => navigate('/video')}
                                        disabled={loading}
                                        className="ripple-button px-4"
                                        size="lg"
                                    >
                                        🎬 Video Detection
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Tips Card */}
                        <Card className="shadow-sm bg-primary-subtle">
                            <Card.Body>
                                <h5 className="mb-3">💡 Tips for Best Results</h5>
                                <Row>
                                    <Col md={6}>
                                        <ul className="mb-0">
                                            <li>Ensure good lighting conditions</li>
                                            <li>Hold the camera steady</li>
                                            <li>Center the traffic sign in frame</li>
                                        </ul>
                                    </Col>
                                    <Col md={6}>
                                        <ul className="mb-0">
                                            <li>Avoid blurry images</li>
                                            <li>Get close enough for clear visibility</li>
                                            <li>Supported: JPG, PNG, WebP (max 10MB)</li>
                                        </ul>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Detection;