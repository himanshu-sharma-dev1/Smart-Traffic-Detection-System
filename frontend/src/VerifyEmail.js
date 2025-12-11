import React, { useEffect, useState } from 'react';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setError('Invalid verification link');
                setLoading(false);
                return;
            }

            try {
                await axios.get(`${API_URL}/api/auth/verify-email/${token}`);
                setSuccess(true);
            } catch (err) {
                setError(err.response?.data?.detail || 'Verification failed. The link may have expired.');
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <>
            <div className="mini-hero">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1>✉️ Email Verification</h1>
                        <p>Confirming your email address</p>
                    </motion.div>
                </Container>
            </div>

            <Container className="py-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ maxWidth: 500, margin: '0 auto' }}
                >
                    <Card className="text-center p-4">
                        {loading ? (
                            <div className="py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-3 text-muted">Verifying your email...</p>
                            </div>
                        ) : success ? (
                            <div className="py-4">
                                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✅</div>
                                <h3 className="text-success">Email Verified!</h3>
                                <p className="text-muted">
                                    Your email has been successfully verified. You can now access all features.
                                </p>
                                <Link to="/auth" className="btn btn-primary btn-lg mt-3">
                                    🚀 Login Now
                                </Link>
                            </div>
                        ) : (
                            <div className="py-4">
                                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>❌</div>
                                <h3 className="text-danger">Verification Failed</h3>
                                <Alert variant="danger" className="mt-3">
                                    {error}
                                </Alert>
                                <p className="text-muted">
                                    The verification link may have expired or already been used.
                                </p>
                                <Link to="/auth" className="btn btn-primary mt-3">
                                    Request New Link
                                </Link>
                            </div>
                        )}
                    </Card>
                </motion.div>
            </Container>
        </>
    );
}

export default VerifyEmail;
