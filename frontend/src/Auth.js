import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Nav, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { login, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login
                const result = await login(email, password);
                if (result.success) {
                    toast.success('🎉 Welcome back!');
                    navigate(from, { replace: true });
                } else {
                    setError(result.error);
                }
            } else {
                // Register
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }

                const result = await register(username, email, password);
                if (result.success) {
                    toast.success('🎉 Account created successfully!');
                    navigate(from, { replace: true });
                } else {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {isLogin ? '👋 Welcome Back' : '🚀 Get Started'}
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {isLogin ? 'Sign in to your account' : 'Create your free account'}
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="justify-content-center">
                    <Col md={6} lg={5}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="shadow-lg auth-card">
                                <Card.Body className="p-5">
                                    {/* Toggle Tabs */}
                                    <Nav variant="pills" className="justify-content-center mb-4">
                                        <Nav.Item>
                                            <Nav.Link
                                                active={isLogin}
                                                onClick={() => setIsLogin(true)}
                                                className="auth-nav-link"
                                            >
                                                🔐 Login
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link
                                                active={!isLogin}
                                                onClick={() => setIsLogin(false)}
                                                className="auth-nav-link"
                                            >
                                                ✨ Register
                                            </Nav.Link>
                                        </Nav.Item>
                                    </Nav>

                                    {error && (
                                        <Alert variant="danger" className="mb-4">
                                            ⚠️ {error}
                                        </Alert>
                                    )}

                                    <Form onSubmit={handleSubmit}>
                                        {/* Username (Register only) */}
                                        {!isLogin && (
                                            <Form.Group className="mb-3">
                                                <Form.Label>👤 Username</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Enter username"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    required={!isLogin}
                                                    minLength={3}
                                                />
                                            </Form.Group>
                                        )}

                                        {/* Email */}
                                        <Form.Group className="mb-3">
                                            <Form.Label>📧 Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                placeholder="Enter email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </Form.Group>

                                        {/* Password */}
                                        <Form.Group className="mb-3">
                                            <Form.Label>🔒 Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                            {isLogin && (
                                                <div className="text-end mt-2">
                                                    <Link to="/forgot-password" className="small text-primary">
                                                        Forgot Password?
                                                    </Link>
                                                </div>
                                            )}
                                        </Form.Group>

                                        {/* Confirm Password (Register only) */}
                                        {!isLogin && (
                                            <Form.Group className="mb-4">
                                                <Form.Label>🔒 Confirm Password</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    placeholder="Confirm password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required={!isLogin}
                                                />
                                            </Form.Group>
                                        )}

                                        {/* Submit Button */}
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            size="lg"
                                            className="w-100 ripple-button"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                                </>
                                            ) : (
                                                isLogin ? '🚀 Sign In' : '✨ Create Account'
                                            )}
                                        </Button>
                                    </Form>

                                    {/* Toggle Link */}
                                    <div className="text-center mt-4">
                                        <span className="text-muted">
                                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                                        </span>
                                        <Button
                                            variant="link"
                                            className="p-0"
                                            onClick={toggleMode}
                                        >
                                            {isLogin ? 'Sign Up' : 'Sign In'}
                                        </Button>
                                    </div>

                                    {/* Divider */}
                                    <div className="d-flex align-items-center my-4">
                                        <hr className="flex-grow-1" />
                                        <span className="px-3 text-muted small">or continue with</span>
                                        <hr className="flex-grow-1" />
                                    </div>

                                    {/* Google OAuth Button */}
                                    <Button
                                        variant="outline-dark"
                                        size="lg"
                                        className="w-100 d-flex align-items-center justify-content-center gap-2"
                                        onClick={() => {
                                            window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/google`;
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign in with Google
                                    </Button>

                                    {/* Continue as Guest */}
                                    <div className="text-center mt-4">
                                        <Link to="/detect" className="text-muted small">
                                            Continue as guest →
                                        </Link>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Features */}
                            <div className="text-center mt-4">
                                <small className="text-muted">
                                    🔒 Secure authentication | 📱 Access from any device | 📊 Save your history
                                </small>
                            </div>
                        </motion.div>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Auth;
