import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Spinner, Alert, Card } from 'react-bootstrap';

const Processing = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { task_id, image } = state || {};

    const [status, setStatus] = useState('PENDING');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!task_id || !image) {
            // If we don't have a task_id or image, we can't do anything.
            navigate('/detect');
            return;
        }

        const pollStatus = async () => {
            try {
                const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
                const response = await axios.get(`${API_BASE_URL}/tasks/${task_id}/status`);
                const currentStatus = response.data.status;
                setStatus(currentStatus);

                if (currentStatus === 'SUCCESS') {
                    // Stop polling and fetch the final result
                    const resultResponse = await axios.get(`${API_BASE_URL}/tasks/${task_id}/result`);
                    const detections = resultResponse.data.detections;
                    // Navigate to the results page with all the data
                    navigate('/results', { state: { image, detections } });
                } else if (currentStatus === 'FAILURE') {
                    setError('Image processing failed on the server.');
                }
            } catch (err) {
                setError('Could not connect to the server to get task status.');
                console.error(err);
            }
        };

        const intervalId = setInterval(() => {
            if (status !== 'SUCCESS' && status !== 'FAILURE') {
                pollStatus();
            }
        }, 2000); // Poll every 2 seconds

        // Cleanup function to clear the interval when the component unmounts
        return () => clearInterval(intervalId);

    }, [task_id, image, status, navigate]);

    return (
        <Container className="my-5 text-center">
            <h1 className="mb-4">Processing Image</h1>
            <p className="lead text-muted mb-5">Our AI is analyzing your image. Please wait a moment.</p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Card.Body>
                    <div style={{ position: 'relative' }}>
                        <img src={image} alt="Processing" style={{ maxWidth: '100%', borderRadius: 'var(--border-radius)', opacity: 0.5 }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                            <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} />
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Processing;
