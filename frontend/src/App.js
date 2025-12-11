import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Modal, Button, Dropdown } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Detection from './Detection';
import Home from './Home';
import About from './About';
import Features from './Features';
import Contact from './Contact';
import Results from './Results';
import History from './History';
import LiveDetection from './LiveDetection';
import BatchProcessing from './BatchProcessing';
import CompareMode from './CompareMode';
import Dashboard from './Dashboard';
import Auth from './Auth';
import APIDocs from './APIDocs';
import Profile from './Profile';
import Settings from './Settings';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import OAuthCallback from './OAuthCallback';
import VideoDetection from './VideoDetection';
import { registerServiceWorker } from './hooks/usePWAInstall';
import useKeyboardShortcuts, { KeyboardShortcutsDisplay } from './hooks/useKeyboardShortcuts';
import './App.css';

// Register service worker for PWA
registerServiceWorker();

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}

function AppContent() {
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });

    const { user, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            setShowWelcomeModal(true);
            localStorage.setItem('hasVisited', 'true');
        }
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const handleCloseWelcomeModal = () => {
        setShowWelcomeModal(false);
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        toast.info(darkMode ? '☀️ Light mode activated!' : '🌙 Dark mode activated!', {
            autoClose: 2000,
            hideProgressBar: true,
        });
    };

    // Initialize keyboard shortcuts
    useKeyboardShortcuts({
        onToggleDarkMode: toggleDarkMode,
        onShowShortcuts: () => setShowShortcutsModal(true),
        onCloseModal: () => {
            setShowWelcomeModal(false);
            setShowShortcutsModal(false);
        }
    });

    const handleLogout = () => {
        logout();
        toast.success('👋 Logged out successfully');
    };

    return (
        <div className="App">
            <Navbar expand="lg" sticky="top">
                <Container>
                    <Navbar.Brand as={Link} to="/">Smart Traffic Detection</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/">Home</Nav.Link>
                            <Nav.Link as={Link} to="/features">Features</Nav.Link>
                            <Nav.Link as={Link} to="/detect">Detection</Nav.Link>
                            <Nav.Link as={Link} to="/live" className="live-nav-link">🎬 Live</Nav.Link>
                            <Nav.Link as={Link} to="/dashboard">📊 Dashboard</Nav.Link>
                            <Nav.Link as={Link} to="/about">About</Nav.Link>
                            <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
                        </Nav>
                        <Nav className="align-items-center">
                            {isAuthenticated ? (
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="outline-primary" id="user-dropdown" className="user-dropdown">
                                        👤 {user?.username}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Header>
                                            <small className="text-muted">{user?.email}</small>
                                        </Dropdown.Header>
                                        <Dropdown.Item as={Link} to="/profile">👤 My Profile</Dropdown.Item>
                                        <Dropdown.Item as={Link} to="/history">📜 My History</Dropdown.Item>
                                        <Dropdown.Item as={Link} to="/dashboard">📊 Dashboard</Dropdown.Item>
                                        <Dropdown.Item as={Link} to="/settings">⚙️ Settings</Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger">
                                            🚪 Logout
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            ) : (
                                <Nav.Link as={Link} to="/auth" className="auth-link">
                                    🔐 Login
                                </Nav.Link>
                            )}
                            <Button
                                className="dark-mode-toggle ms-2"
                                onClick={toggleDarkMode}
                                aria-label="Toggle dark mode"
                            >
                                {darkMode ? '☀️' : '🌙'}
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <PageTransitionWrapper />

            {/* Floating Action Button */}
            <Link to="/detect" className="fab" title="Start Detection">
                📷
                <span className="fab-tooltip">Quick Detect</span>
            </Link>

            <footer>
                <Container className="text-center">
                    <p>© {new Date().getFullYear()} Smart Traffic Detection • Built with ❤️ by Himanshu Sharma</p>
                </Container>
            </footer>

            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={darkMode ? 'dark' : 'light'}
            />

            <Modal show={showWelcomeModal} onHide={handleCloseWelcomeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Welcome! 👋</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p><strong>🚦 Smart Traffic Detection System</strong></p>
                    <p>Explore AI-powered traffic sign recognition. Use the camera button at the bottom right for quick access!</p>
                    <p className="text-muted mb-0"><small>💡 Tip: Press <kbd>Alt</kbd>+<kbd>K</kbd> anytime to see keyboard shortcuts</small></p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleCloseWelcomeModal}>
                        🚀 Get Started
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Keyboard Shortcuts Modal */}
            <Modal show={showShortcutsModal} onHide={() => setShowShortcutsModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>⌨️ Keyboard Shortcuts</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <KeyboardShortcutsDisplay />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowShortcutsModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

// Simple CSS-based page transition component (React 19 compatible)
function PageTransitionWrapper() {
    const location = useLocation();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [transitionStage, setTransitionStage] = useState('fade-in');

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname) {
            setTransitionStage('fade-out');
        }
    }, [location, displayLocation]);

    const handleAnimationEnd = () => {
        if (transitionStage === 'fade-out') {
            setTransitionStage('fade-in');
            setDisplayLocation(location);
            // Scroll to top on page change
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <main
            className={`page-content ${transitionStage}`}
            onAnimationEnd={handleAnimationEnd}
        >
            <Routes location={displayLocation}>
                <Route path="/" element={<Home />} />
                <Route path="/features" element={<Features />} />
                <Route path="/detect" element={<Detection />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/results" element={<Results />} />
                <Route path="/live" element={<LiveDetection />} />
                <Route path="/video" element={<VideoDetection />} />
                <Route path="/batch" element={<BatchProcessing />} />
                <Route path="/compare" element={<CompareMode />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/api-docs" element={<APIDocs />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                {/* Protected Routes - require login */}
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                } />
                <Route path="/history" element={
                    <ProtectedRoute>
                        <History />
                    </ProtectedRoute>
                } />
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                } />
            </Routes>
        </main>
    );
}

export default App;
