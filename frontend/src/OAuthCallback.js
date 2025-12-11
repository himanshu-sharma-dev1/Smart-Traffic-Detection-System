/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth and stores the token
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';

function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(true);

    useEffect(() => {
        const processOAuthCallback = async () => {
            const token = searchParams.get('token');
            const user = searchParams.get('user');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(decodeURIComponent(errorParam));
                setProcessing(false);
                return;
            }

            if (!token) {
                setError('No authentication token received');
                setProcessing(false);
                return;
            }

            try {
                // Store the token using AuthContext login
                // The token comes directly from the backend
                localStorage.setItem('token', token);

                // Fetch user data with the new token
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    localStorage.setItem('user', JSON.stringify(userData));

                    // Redirect to dashboard
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 1000);
                } else {
                    throw new Error('Failed to fetch user data');
                }
            } catch (err) {
                setError('Failed to complete authentication');
                setProcessing(false);
            }
        };

        processOAuthCallback();
    }, [searchParams, navigate, login]);

    return (
        <Container className="min-vh-100 d-flex align-items-center justify-content-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                {processing && !error ? (
                    <div>
                        <Spinner animation="border" variant="primary" className="mb-3" />
                        <h4 className="mb-2">Completing Sign In...</h4>
                        <p className="text-muted">Please wait while we set up your account</p>
                    </div>
                ) : error ? (
                    <Alert variant="danger">
                        <Alert.Heading>Authentication Failed</Alert.Heading>
                        <p>{error}</p>
                        <hr />
                        <button
                            className="btn btn-outline-danger"
                            onClick={() => navigate('/login')}
                        >
                            Return to Login
                        </button>
                    </Alert>
                ) : (
                    <div>
                        <div className="text-success mb-3" style={{ fontSize: '3rem' }}>✓</div>
                        <h4>Sign In Successful!</h4>
                        <p className="text-muted">Redirecting to dashboard...</p>
                    </div>
                )}
            </motion.div>
        </Container>
    );
}

export default OAuthCallback;
