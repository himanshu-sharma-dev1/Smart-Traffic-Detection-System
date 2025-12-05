
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Modal, Button } from 'react-bootstrap';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Detection from './Detection';
import RealTimeDetection from './RealTimeDetection';
import Dashboard from './Dashboard';
import Home from './Home';
import About from './About';
import Features from './Features';
import Contact from './Contact';
import Results from './Results';
import './App.css';

function App() {
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            setShowWelcomeModal(true);
            localStorage.setItem('hasVisited', 'true');
        }
    }, []);

    const handleCloseWelcomeModal = () => {
        setShowWelcomeModal(false);
    };

    return (
        <Router>
            <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
                <Container>
                    <Navbar.Brand as={Link} to="/">Smart Traffic Detection</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/">Home</Nav.Link>
                            <Nav.Link as={Link} to="/features">Features</Nav.Link>
                            <Nav.Link as={Link} to="/detect">Detection</Nav.Link>
                            <Nav.Link as={Link} to="/realtime">Real-Time Stream</Nav.Link>
                            <Nav.Link as={Link} to="/dashboard">Analytics</Nav.Link>
                            <Nav.Link as={Link} to="/about">About Us</Nav.Link>
                            <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <AnimatedRoutes />

            <footer className="bg-dark text-white text-center py-3 mt-5">
                <Container>
                    <p>&copy; {new Date().getFullYear()} Smart Traffic Detection. All rights reserved.</p>
                </Container>
            </footer>

            <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

            <Modal show={showWelcomeModal} onHide={handleCloseWelcomeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Welcome to Smart Traffic Management! 👋</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Explore the future of traffic sign recognition powered by cutting-edge AI.</p>
                    <p>Navigate through our interactive pages, learn about our features, and try out the live detection system.</p>
                    <p>We hope you enjoy your experience!</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleCloseWelcomeModal}>
                        Get Started
                    </Button>
                </Modal.Footer>
            </Modal>
        </Router>
    );
}

function AnimatedRoutes() {
    const location = useLocation();
    const nodeRef = useRef(null); // Create a ref for the transitioning node

    return (
        <TransitionGroup component={null}>
            <CSSTransition key={location.key} classNames="page-slide" timeout={500} nodeRef={nodeRef}>
                <div ref={nodeRef} className="page-wrapper">
                    <Routes location={location}>
                        <Route path="/" element={<Home />} />
                        <Route path="/features" element={<Features />} />
                        <Route path="/detect" element={<Detection />} />
                        <Route path="/realtime" element={<RealTimeDetection />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/results" element={<Results />} />
                    </Routes>
                </div>
            </CSSTransition>
        </TransitionGroup>
    );
}

export default App;
