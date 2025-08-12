import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Container, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Detection.css';

const Detection = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            // Ensure camera is turned off when component unmounts
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
        } catch (err) {
            setError("Could not access the camera. Please grant permission and ensure a webcam is available.");
            toast.error("Camera access denied.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const processImage = async (imageBlob) => {
        setLoading(true);
        setError(null);
        stopCamera(); // Stop the camera once an image is being processed

        const formData = new FormData();
        formData.append('file', imageBlob, 'capture.jpg');

        try {
            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
            const response = await axios.post(`${API_BASE_URL}/detect`, formData);

            navigate('/results', { state: { image: `data:image/jpeg;base64,${response.data.image}`, detections: response.data.detections } });
            toast.success("Detection successful!");
        } catch (err) {
            setError("An error occurred during detection. The backend server might be down.");
            toast.error("Detection failed.");
        } finally {
            setLoading(false);
        }
    };

    const captureFromWebcam = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        canvas.toBlob(processImage, 'image/jpeg');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processImage(file);
        }
    };

    return (
        <Container className="my-5 detection-container text-center">
            <h1 className="mb-3">Traffic Sign Detection</h1>
            <p className="lead text-muted mb-5">Use your camera for live detection or upload an image to start.</p>

            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

            {cameraActive ? (
                <div className="video-wrapper mb-4">
                    <video ref={videoRef} autoPlay playsInline muted />
                </div>
            ) : (
                <div className="video-placeholder mb-4">
                    <i className="bi bi-camera-video-off"></i>
                    <p>Camera is off</p>
                </div>
            )}

            {loading ? (
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            ) : (
                <div className="button-group">
                    {!cameraActive ? (
                        <Button variant="primary" size="lg" onClick={startCamera}>Start Camera</Button>
                    ) : (
                        <>
                            <Button variant="success" size="lg" onClick={captureFromWebcam}>Capture Frame</Button>
                            <Button variant="secondary" size="lg" onClick={stopCamera}>Stop Camera</Button>
                        </>
                    )}
                    <Button variant="outline-primary" size="lg" onClick={() => fileInputRef.current.click()}>
                        Upload Image
                    </Button>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />
        </Container>
    );
};

export default Detection;