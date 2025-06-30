import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Carousel, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
    const [heroTextVisible, setHeroTextVisible] = useState(false);

    useEffect(() => {
        setHeroTextVisible(true);
    }, []);

    return (
        <>
            {/* Hero Section */}
            <div className="hero-section text-white text-center py-5 mb-5">
                <Container>
                    <h1 className={`display-3 fw-bold mb-3 ${heroTextVisible ? 'animate-fade-in-up' : ''}`}>Navigate Smarter, Drive Safer 🚦</h1>
                    <p className={`lead mb-4 ${heroTextVisible ? 'animate-fade-in-up delay-1' : ''}`}>Revolutionizing Traffic Detection with AI-powered vision.</p>
                    <div className={heroTextVisible ? 'animate-fade-in-up delay-2' : ''}>
                        <Button variant="light" size="lg" as={Link} to="/detect" className="me-3">Get Started</Button>
                        <Button variant="outline-light" size="lg" as={Link} to="/features">Learn More</Button>
                    </div>
                </Container>
            </div>

            {/* Image Carousel - Award-Winning Landscapes & Traffic */}
            <Container className="my-5">
                <h2 className="text-center mb-4 display-5">Our Vision in Action: A Glimpse into the Future</h2>
                <Carousel fade indicators={false} controls={true}>
                    <Carousel.Item>
                        <img
                            className="d-block w-100 rounded shadow"
                            src="/homeImg.jpg"
                            alt="Traffic Flow Landscape"
                            style={{ maxHeight: '500px', objectFit: 'cover' }}
                        />
                        <Carousel.Caption className="bg-dark bg-opacity-75 rounded p-3">
                            <h3>Seamless Urban Mobility</h3>
                            <p>Optimizing traffic flow in dynamic cityscapes.</p>
                        </Carousel.Caption>
                    </Carousel.Item>
                    <Carousel.Item>
                        <img
                            className="d-block w-100 rounded shadow"
                            src="/home2.png"
                            alt="Road Safety Landscape"
                            style={{ maxHeight: '500px', objectFit: 'cover' }}
                        />
                        <Carousel.Caption className="bg-dark bg-opacity-75 rounded p-3">
                            <h3>Enhanced Road Safety</h3>
                            <p>Proactive detection for safer journeys, day and night.</p>
                        </Carousel.Caption>
                    </Carousel.Item>
                    <Carousel.Item>
                        <img
                            className="d-block w-100 rounded shadow"
                            src="/endPage.jpg"
                            alt="Smart City Infrastructure"
                            style={{ maxHeight: '500px', objectFit: 'cover' }}
                        />
                        <Carousel.Caption className="bg-dark bg-opacity-75 rounded p-3">
                            <h3>Building Smart Cities</h3>
                            <p>Intelligent infrastructure for a connected tomorrow.</p>
                        </Carousel.Caption>
                    </Carousel.Item>
                </Carousel>
            </Container>

            {/* Section 1: The Power of AI in Traffic */}
            <Container className="my-5 py-5 bg-light rounded shadow-sm">
                <Row className="align-items-center">
                    <Col md={6}>
                        <h2 className="display-5 mb-4">Unlocking Traffic Intelligence with AI</h2>
                        <p className="lead">Our system goes beyond simple detection. It understands the context of traffic signs, providing real-time data that can be used for dynamic traffic light control, autonomous vehicle navigation, and urban planning.</p>
                        <p>Imagine a city where traffic flows seamlessly, accidents are minimized, and commuters spend less time stuck in jams. This is the future we are building.</p>
                    </Col>
                    <Col md={6}>
                        <img src="/homeImg.jpg" alt="AI in Traffic" className="img-fluid rounded shadow" />
                    </Col>
                </Row>
            </Container>

            {/* Section 2: Focus on Traffic Signs (Now with EV image) */}
            <Container className="my-5 py-5 bg-primary bg-opacity-10 rounded shadow-sm">
                <Row className="align-items-center">
                    <Col md={6}>
                        <img src="/home2.png" alt="Electric Vehicle" className="img-fluid rounded shadow" />
                    </Col>
                    <Col md={6}>
                        <h2 className="display-5 mb-4">Precision in Every Pixel: Traffic Sign Recognition</h2>
                        <p className="lead">From stop signs to speed limits, our advanced vision system accurately identifies and categorizes a vast array of traffic signs, even in challenging weather conditions or low light.</p>
                        <p>This precision is crucial for automated driving systems and for providing timely alerts to human drivers, significantly reducing the risk of road incidents.</p>
                    </Col>
                </Row>
            </Container>

            {/* Section 3: Electric Vehicles Integration (Now with Traffic Signs image) */}
            <Container className="my-5 py-5">
                <Row className="align-items-center flex-row-reverse">
                    <Col md={6}>
                        <h2 className="display-5 mb-4">Seamless Integration with Electric Vehicles 🚗⚡</h2>
                        <p className="lead">As the world shifts towards sustainable transportation, our system is designed to seamlessly integrate with the next generation of electric and autonomous vehicles.</p>
                        <p>Providing critical real-time environmental and traffic data, we empower EVs to navigate more efficiently, optimize battery usage, and enhance passenger safety.</p>
                    </Col>
                    <Col md={6}>
                        <img src="/speedlimit60.png" alt="Traffic Signs" className="img-fluid rounded shadow" />
                    </Col>
                </Row>
            </Container>

            {/* Section 4: Global Impact */}
            <Container className="my-5 py-5 bg-info bg-opacity-10 rounded shadow-sm">
                <Row className="align-items-center">
                    <Col md={6}>
                        <img src="/endPage.jpg" alt="Global City" className="img-fluid rounded shadow" />
                    </Col>
                    <Col md={6}>
                        <h2 className="display-5 mb-4">Driving Global Change, One Sign at a Time</h2>
                        <p className="lead">Our technology has the potential to transform urban landscapes worldwide, contributing to smarter cities, reduced carbon footprints, and a safer environment for all road users.</p>
                        <p>Join us in shaping the future of intelligent transportation systems.</p>
                    </Col>
                </Row>
            </Container>

            {/* Section 5: Benefits and Impact */}
            <Container className="my-5 py-5">
                <h2 className="mb-4">Why Choose Smart Traffic Detection?</h2>
                <Row className="text-center">
                    <Col md={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body>
                                <h3 className="text-primary">Reduced Congestion</h3>
                                <p>Optimize traffic light timings and route planning.</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body>
                                <h3 className="text-success">Fewer Accidents</h3>
                                <p>Proactive alerts and better situational awareness.</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body>
                                <h3 className="text-warning">Environmental Benefits</h3>
                                <p>Less idling, lower emissions, and greener cities.</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Call to Action: Verify Sign */}
            <Container className="my-5 py-5 text-center">
                <h2 className="display-4 mb-4">Ready to See it in Action?</h2>
                <p className="lead mb-5">Experience the power of AI-driven traffic sign recognition yourself. Upload an image or use your webcam to verify signs instantly.</p>
                <Button variant="success" size="lg" as={Link} to="/detect" className="pulse-button">
                    Verify a Sign Now! <span role="img" aria-label="magnifying glass">🔍</span>
                </Button>
            </Container>
        </>
    );
};

export default Home;