import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            setSent(true);
            toast.success('📧 Reset link sent! Check your email.');
        } catch (error) {
            // Show success anyway to prevent email enumeration
            setSent(true);
            toast.success('📧 If the email exists, a reset link has been sent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="mini-hero">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1>🔐 Forgot Password</h1>
                        <p>We'll send you a link to reset your password</p>
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
                            {sent ? (
                                <div className="text-center py-4">
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📬</div>
                                    <h4>Check Your Email</h4>
                                    <p className="text-muted">
                                        We've sent a password reset link to <strong>{email}</strong>
                                    </p>
                                    <p className="text-muted small">
                                        The link expires in 1 hour. Check your spam folder if you don't see it.
                                    </p>
                                    <Link to="/auth" className="btn btn-primary mt-3">
                                        ← Back to Login
                                    </Link>
                                </div>
                            ) : (
                                <Form onSubmit={handleSubmit}>
                                    <h4 className="text-center mb-4">Reset Your Password</h4>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Email Address</Form.Label>
                                        <Form.Control
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
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
                                            <><Spinner size="sm" /> Sending...</>
                                        ) : (
                                            '📧 Send Reset Link'
                                        )}
                                    </Button>

                                    <div className="text-center mt-4">
                                        <Link to="/auth">← Back to Login</Link>
                                    </div>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </motion.div>
            </Container>
        </>
    );
}

export default ForgotPassword;
