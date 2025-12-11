import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, {
                token,
                new_password: password
            });
            setSuccess(true);
            toast.success('🎉 Password reset successfully!');

            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/auth'), 3000);
        } catch (error) {
            setError(error.response?.data?.detail || 'Invalid or expired reset link');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Container className="py-5 text-center">
                <Alert variant="danger">
                    <h4>Invalid Reset Link</h4>
                    <p>The password reset link is missing or invalid.</p>
                    <Link to="/forgot-password" className="btn btn-primary mt-2">
                        Request New Link
                    </Link>
                </Alert>
            </Container>
        );
    }

    return (
        <>
            <div className="mini-hero">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1>🔑 Create New Password</h1>
                        <p>Choose a strong password for your account</p>
                    </motion.div>
                </Container>
            </div>

            <Container className="py-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ maxWidth: 450, margin: '0 auto' }}
                >
                    <Card className="auth-card">
                        <Card.Body className="p-4">
                            {success ? (
                                <div className="text-center py-4">
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                                    <h4>Password Reset!</h4>
                                    <p className="text-muted">
                                        Your password has been changed successfully.
                                    </p>
                                    <p className="text-muted small">
                                        Redirecting to login...
                                    </p>
                                    <Link to="/auth" className="btn btn-primary mt-3">
                                        Go to Login
                                    </Link>
                                </div>
                            ) : (
                                <Form onSubmit={handleSubmit}>
                                    <h4 className="text-center mb-4">Set New Password</h4>

                                    {error && <Alert variant="danger">{error}</Alert>}

                                    <Form.Group className="mb-3">
                                        <Form.Label>New Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="Enter new password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Confirm Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </Form.Group>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-100"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <><Spinner size="sm" /> Resetting...</>
                                        ) : (
                                            '🔐 Reset Password'
                                        )}
                                    </Button>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </motion.div>
            </Container>
        </>
    );
}

export default ResetPassword;
