import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const About = () => {
    const timeline = [
        {
            date: 'Phase 1',
            title: 'Research & Planning',
            description: 'Analyzed traffic detection requirements and selected Google Cloud Vision AI for optimal accuracy.'
        },
        {
            date: 'Phase 2',
            title: 'Backend Development',
            description: 'Built FastAPI server with image processing capabilities using OpenCV and NumPy.'
        },
        {
            date: 'Phase 3',
            title: 'Frontend Development',
            description: 'Created responsive React application with real-time webcam integration and canvas rendering.'
        },
        {
            date: 'Phase 4',
            title: 'Integration & Testing',
            description: 'Connected frontend with backend API, implemented error handling and user feedback systems.'
        }
    ];

    const techStack = {
        frontend: [
            { name: 'React.js', icon: '⚛️' },
            { name: 'React Bootstrap', icon: '🎨' },
            { name: 'React Router', icon: '🔀' },
            { name: 'Axios', icon: '📡' },
        ],
        backend: [
            { name: 'Python', icon: '🐍' },
            { name: 'FastAPI', icon: '⚡' },
            { name: 'OpenCV', icon: '📷' },
            { name: 'NumPy', icon: '🔢' },
        ],
        cloud: [
            { name: 'Google Vision AI', icon: '🔮' },
            { name: 'Cloud APIs', icon: '☁️' },
        ]
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <h1>💡 About This Project</h1>
                    <p className="lead mb-0">The story behind Smart Traffic Detection System</p>
                </Container>
            </div>

            <Container className="my-5">
                {/* Mission Section */}
                <Row className="mb-5">
                    <Col lg={8} className="mx-auto text-center">
                        <h2 className="mb-4">🎯 Our Mission</h2>
                        <p className="lead">
                            To contribute to safer and more efficient transportation systems
                            through innovative AI solutions that make roads safer for everyone.
                        </p>
                    </Col>
                </Row>

                {/* About Content */}
                <Row className="mb-5">
                    <Col md={6}>
                        <Card className="h-100 glass-card p-4">
                            <h3 className="mb-3">🚦 What We Do</h3>
                            <p>
                                This project demonstrates the power of cloud-based AI for real-world applications,
                                specifically in the domain of traffic management and road safety.
                            </p>
                            <p>
                                By integrating with Google Cloud Vision AI, our system can accurately identify
                                a wide range of traffic signs, providing valuable information for autonomous
                                vehicles, driver assistance systems, or traffic monitoring.
                            </p>
                        </Card>
                    </Col>
                    <Col md={6}>
                        <Card className="h-100 glass-card p-4">
                            <h3 className="mb-3">⚙️ How It Works</h3>
                            <p>
                                <strong>1. Capture:</strong> Users can capture images via webcam or upload existing images.
                            </p>
                            <p>
                                <strong>2. Process:</strong> The FastAPI backend sends the image to Google Cloud Vision AI.
                            </p>
                            <p>
                                <strong>3. Analyze:</strong> AI detects and classifies traffic signs with confidence scores.
                            </p>
                            <p>
                                <strong>4. Display:</strong> Results are rendered with dynamic bounding boxes on canvas.
                            </p>
                        </Card>
                    </Col>
                </Row>

                {/* Tech Stack */}
                <div className="mb-5">
                    <h2 className="text-center mb-4">🛠️ Technology Stack</h2>
                    <Row className="g-4">
                        <Col md={4}>
                            <Card className="h-100 text-center p-4">
                                <h4 className="text-primary mb-3">Frontend</h4>
                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                    {techStack.frontend.map((tech, idx) => (
                                        <span key={idx} className="tech-item">
                                            <span className="tech-icon">{tech.icon}</span> {tech.name}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 text-center p-4">
                                <h4 className="text-success mb-3">Backend</h4>
                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                    {techStack.backend.map((tech, idx) => (
                                        <span key={idx} className="tech-item">
                                            <span className="tech-icon">{tech.icon}</span> {tech.name}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 text-center p-4">
                                <h4 className="text-info mb-3">Cloud Services</h4>
                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                    {techStack.cloud.map((tech, idx) => (
                                        <span key={idx} className="tech-item">
                                            <span className="tech-icon">{tech.icon}</span> {tech.name}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>

                {/* Development Timeline */}
                <div className="mb-5">
                    <h2 className="text-center mb-5">📅 Development Journey</h2>
                    <div className="timeline">
                        {timeline.map((item, idx) => (
                            <div key={idx} className="timeline-item">
                                <div className="timeline-content">
                                    <div className="timeline-date">{item.date}</div>
                                    <h5>{item.title}</h5>
                                    <p className="mb-0">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Developer Card */}
                <div className="mb-5">
                    <h2 className="text-center mb-4">👨‍💻 Meet the Developer</h2>
                    <Row className="justify-content-center">
                        <Col md={6} lg={4}>
                            <div className="team-card">
                                <div className="team-avatar">👨‍💻</div>
                                <h4 className="team-name">Himanshu Sharma</h4>
                                <p className="team-role">Full Stack Developer</p>
                                <p className="text-muted">
                                    Passionate about building AI-powered applications
                                    that solve real-world problems.
                                </p>
                                <div className="social-links">
                                    <a href="https://github.com" className="social-link" target="_blank" rel="noopener noreferrer" title="GitHub">
                                        💻
                                    </a>
                                    <a href="https://linkedin.com" className="social-link" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                                        💼
                                    </a>
                                    <a href="mailto:info@smarttraffic.com" className="social-link" title="Email">
                                        📧
                                    </a>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Future Vision */}
                <Card className="bg-primary-subtle p-5 text-center">
                    <h3 className="mb-3">🔮 Future Vision</h3>
                    <p className="lead mb-0">
                        We envision a world where AI seamlessly integrates with transportation infrastructure,
                        making roads safer, reducing congestion, and contributing to sustainable urban development.
                    </p>
                </Card>
            </Container>
        </>
    );
};

export default About;
