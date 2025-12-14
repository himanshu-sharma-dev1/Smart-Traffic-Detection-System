import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Carousel, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Lazy load images component
const LazyImage = ({ src, alt, className, style }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        const element = document.getElementById(`lazy-${src}`);
        if (element) observer.observe(element);

        return () => observer.disconnect();
    }, [src]);

    return (
        <div id={`lazy-${src}`} className={`lazy-image-container ${className || ''}`} style={style}>
            {!isLoaded && <div className="lazy-image-placeholder skeleton" />}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
};

// Animation variants for Framer Motion
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const fadeInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const fadeInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1
        }
    }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" }
    }
};

const Home = () => {
    const [heroTextVisible, setHeroTextVisible] = useState(false);

    useEffect(() => {
        setHeroTextVisible(true);
    }, []);

    const stats = [
        { number: '98.1%', label: 'Plate Detection (mAP50)', icon: '🎯' },
        { number: '91.5%', label: 'Traffic Signs (mAP50)', icon: '🚦' },
        { number: '16+', label: 'FPS Real-time', icon: '⚡' },
        { number: '3', label: 'AI Models', icon: '🧠' }
    ];

    const benefits = [
        {
            icon: '🚦',
            title: 'Reduced Congestion',
            description: 'Optimize traffic light timings and route planning with AI-driven insights.',
            color: '#3498db'
        },
        {
            icon: '🛡️',
            title: 'Fewer Accidents',
            description: 'Proactive alerts and better situational awareness for safer roads.',
            color: '#2ecc71'
        },
        {
            icon: '🌱',
            title: 'Eco-Friendly',
            description: 'Less idling, lower emissions, and greener cities for future generations.',
            color: '#27ae60'
        }
    ];

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero-section">
                <Container>
                    <Row className="justify-content-center text-center">
                        <Col lg={10}>
                            <motion.h1
                                className="hero-title"
                                style={{ color: '#ffffff' }}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                Navigate Smarter, Drive Safer 🚦
                            </motion.h1>
                            <motion.p
                                className="hero-subtitle"
                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            >
                                Revolutionizing Traffic Detection with AI-powered vision technology
                            </motion.p>
                            <motion.div
                                className="hero-buttons"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                            >
                                <Button
                                    variant="light"
                                    size="lg"
                                    as={Link}
                                    to="/detect"
                                    className="hero-btn-primary"
                                >
                                    🎯 Get Started
                                </Button>
                                <Button
                                    variant="outline-light"
                                    size="lg"
                                    as={Link}
                                    to="/features"
                                    className="hero-btn-secondary"
                                >
                                    📖 Learn More
                                </Button>
                            </motion.div>
                        </Col>
                    </Row>
                </Container>

                <div className="hero-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section-wrapper">
                <Container>
                    <motion.div
                        className="stats-card"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                    >
                        <Row>
                            {stats.map((stat, index) => (
                                <Col xs={6} lg={3} key={index}>
                                    <motion.div
                                        className="stat-item"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                    >
                                        <div className="stat-icon">{stat.icon}</div>
                                        <div className="stat-number">{stat.number}</div>
                                        <div className="stat-label">{stat.label}</div>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </motion.div>
                </Container>
            </section>

            {/* Vision Carousel Section */}
            <motion.section
                className="carousel-section"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Container>
                    <div className="section-header">
                        <h2 className="section-title">
                            Our Vision in <span className="gradient-text">Action</span>
                        </h2>
                        <p className="section-subtitle">
                            A glimpse into the future of intelligent transportation
                        </p>
                    </div>
                    <Carousel fade indicators={true} controls={true} interval={5000} className="main-carousel">
                        <Carousel.Item>
                            <div className="carousel-image-wrapper">
                                <LazyImage
                                    src="/homeImg.jpg"
                                    alt="Traffic Flow"
                                    className="d-block w-100"
                                />
                                <div className="carousel-overlay"></div>
                            </div>
                            <Carousel.Caption>
                                <h3>🏙️ Seamless Urban Mobility</h3>
                                <p>Optimizing traffic flow in dynamic cityscapes</p>
                            </Carousel.Caption>
                        </Carousel.Item>
                        <Carousel.Item>
                            <div className="carousel-image-wrapper">
                                <LazyImage
                                    src="/home2.png"
                                    alt="Road Safety"
                                    className="d-block w-100"
                                />
                                <div className="carousel-overlay"></div>
                            </div>
                            <Carousel.Caption>
                                <h3>🛡️ Enhanced Road Safety</h3>
                                <p>Proactive detection for safer journeys</p>
                            </Carousel.Caption>
                        </Carousel.Item>
                        <Carousel.Item>
                            <div className="carousel-image-wrapper">
                                <LazyImage
                                    src="/endPage.jpg"
                                    alt="Smart City"
                                    className="d-block w-100"
                                />
                                <div className="carousel-overlay"></div>
                            </div>
                            <Carousel.Caption>
                                <h3>🌆 Building Smart Cities</h3>
                                <p>Intelligent infrastructure for tomorrow</p>
                            </Carousel.Caption>
                        </Carousel.Item>
                    </Carousel>
                </Container>
            </motion.section>

            {/* AI Power Section */}
            <section className="content-section content-section-light">
                <Container>
                    <Row className="align-items-center g-5">
                        <Col lg={6}>
                            <motion.div
                                className="content-text"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeInLeft}
                            >
                                <span className="section-badge">🧠 AI Technology</span>
                                <h2 className="content-title">
                                    Unlocking Traffic Intelligence with <span className="gradient-text">AI</span>
                                </h2>
                                <p className="content-lead">
                                    Our system goes beyond simple detection. It understands the context of traffic signs,
                                    providing real-time data for dynamic traffic control and autonomous navigation.
                                </p>
                                <p className="content-text-secondary">
                                    Imagine a city where traffic flows seamlessly, accidents are minimized,
                                    and commuters spend less time stuck in jams. This is the future we are building.
                                </p>
                                <Button variant="primary" as={Link} to="/features" className="content-btn">
                                    Explore Features →
                                </Button>
                            </motion.div>
                        </Col>
                        <Col lg={6}>
                            <motion.div
                                className="content-image"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeInRight}
                            >
                                <LazyImage src="/homeImg.jpg" alt="AI in Traffic" className="img-fluid" />
                                <div className="image-decoration"></div>
                            </motion.div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Precision Section */}
            <section className="content-section content-section-gradient">
                <Container>
                    <Row className="align-items-center g-5">
                        <Col lg={6} className="order-lg-2">
                            <motion.div
                                className="content-text"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeInRight}
                            >
                                <span className="section-badge">🎯 Precision</span>
                                <h2 className="content-title">
                                    Precision in Every Pixel
                                </h2>
                                <p className="content-lead">
                                    From stop signs to speed limits, our advanced vision system accurately identifies
                                    and categorizes traffic signs, even in challenging conditions.
                                </p>
                                <div className="tech-badges">
                                    <motion.span
                                        className="tech-badge"
                                        whileHover={{ scale: 1.05, y: -3 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        🧠 YOLOv8 Custom Models
                                    </motion.span>
                                    <motion.span
                                        className="tech-badge"
                                        whileHover={{ scale: 1.05, y: -3 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        ⚡ FastAPI
                                    </motion.span>
                                    <motion.span
                                        className="tech-badge"
                                        whileHover={{ scale: 1.05, y: -3 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        ⚛️ React + TensorFlow.js
                                    </motion.span>
                                </div>
                            </motion.div>
                        </Col>
                        <Col lg={6} className="order-lg-1">
                            <motion.div
                                className="content-image"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeInLeft}
                            >
                                <LazyImage src="/home2.png" alt="Traffic Detection" className="img-fluid" />
                                <div className="image-decoration"></div>
                            </motion.div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Benefits Section */}
            <section className="benefits-section">
                <Container>
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <h2 className="section-title">
                            Why Choose <span className="gradient-text">Smart Traffic Detection</span>?
                        </h2>
                        <p className="section-subtitle">
                            Powered by cutting-edge AI for maximum impact
                        </p>
                    </motion.div>
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                    >
                        <Row className="g-4">
                            {benefits.map((benefit, index) => (
                                <Col md={4} key={index}>
                                    <motion.div variants={scaleIn}>
                                        <Card className="benefit-card h-100">
                                            <Card.Body>
                                                <motion.div
                                                    className="benefit-icon"
                                                    style={{ background: `linear-gradient(135deg, ${benefit.color}, ${benefit.color}88)` }}
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    {benefit.icon}
                                                </motion.div>
                                                <Card.Title className="benefit-title">{benefit.title}</Card.Title>
                                                <Card.Text className="benefit-text">{benefit.description}</Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </motion.div>
                </Container>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <Container>
                    <motion.div
                        className="cta-content"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="cta-title">Ready to See it in Action? 🚀</h2>
                        <p className="cta-subtitle">
                            Experience the power of AI-driven traffic sign recognition yourself.
                            Upload an image or use your webcam to verify signs instantly.
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button variant="success" size="lg" as={Link} to="/detect" className="cta-button">
                                🔍 Verify a Sign Now!
                            </Button>
                        </motion.div>
                    </motion.div>
                </Container>
            </section>
        </div>
    );
};

export default Home;