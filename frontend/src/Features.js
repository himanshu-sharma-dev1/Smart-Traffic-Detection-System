import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Features = () => {
    const features = [
        {
            icon: '🧠',
            title: 'AI-Powered Detection',
            description: 'Custom YOLOv8 models trained on Indian traffic signs (91.5% mAP) and license plates (98.1% mAP).',
            color: '#3498db'
        },
        {
            icon: '⚡',
            title: 'Real-time Processing',
            description: 'Processes images from your webcam in real-time for immediate feedback under 15ms.',
            color: '#f39c12'
        },
        {
            icon: '☁️',
            title: 'Cloud Scalability',
            description: 'Leverages cloud infrastructure for scalable and robust performance at any load.',
            color: '#9b59b6'
        },
        {
            icon: '🛡️',
            title: 'Enhanced Safety',
            description: 'Aids in improving road safety by identifying critical traffic information instantly.',
            color: '#e74c3c'
        },
        {
            icon: '📱',
            title: 'Responsive Design',
            description: 'Optimized for seamless experience across various devices and screen sizes.',
            color: '#1abc9c'
        },
        {
            icon: '📊',
            title: 'Detailed Insights',
            description: 'Provides confidence scores for each detection, offering deeper analytical insights.',
            color: '#2ecc71'
        },
        {
            icon: '🎯',
            title: 'Precision Bounding',
            description: 'Dynamic bounding boxes drawn on canvas for accurate visual representation.',
            color: '#e67e22'
        },
        {
            icon: '🔒',
            title: 'Secure Processing',
            description: 'All image processing is done securely with CORS protection and validation.',
            color: '#34495e'
        },
        {
            icon: '🚀',
            title: 'Fast API Backend',
            description: 'Built with FastAPI for high-performance API endpoints and async processing.',
            color: '#16a085'
        }
    ];

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <h1>✨ Key Features</h1>
                    <p className="lead mb-0">Explore the capabilities of this AI-powered traffic detection system</p>
                </Container>
            </div>

            <Container className="my-5">
                <Row xs={1} md={2} lg={3} className="g-4">
                    {features.map((feature, idx) => (
                        <Col key={idx}>
                            <Card
                                className="h-100 feature-card"
                                style={{
                                    '--card-accent': feature.color,
                                    animationDelay: `${idx * 0.1}s`
                                }}
                            >
                                <Card.Body className="text-center">
                                    <div className="feature-icon">{feature.icon}</div>
                                    <Card.Title className="h5 mb-3">{feature.title}</Card.Title>
                                    <Card.Text>{feature.description}</Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Tech Stack Section */}
                <div className="text-center mt-5 pt-5">
                    <h2 className="mb-4">🛠️ Built With Modern Technology</h2>
                    <div className="tech-stack">
                        <div className="tech-item">
                            <span className="tech-icon">🐍</span> Python
                        </div>
                        <div className="tech-item">
                            <span className="tech-icon">⚡</span> FastAPI
                        </div>
                        <div className="tech-item">
                            <span className="tech-icon">⚛️</span> React.js
                        </div>
                        <div className="tech-item">
                            <span className="tech-icon">🧠</span> YOLOv8 + TensorFlow.js
                        </div>
                        <div className="tech-item">
                            <span className="tech-icon">🎨</span> Bootstrap 5
                        </div>
                        <div className="tech-item">
                            <span className="tech-icon">📷</span> EasyOCR
                        </div>
                    </div>
                </div>

                {/* Technical Highlights */}
                <div className="mt-5 pt-5">
                    <h2 className="text-center mb-4">🔬 Technical Highlights</h2>
                    <Row className="justify-content-center">
                        <Col md={10}>
                            <Card className="shadow-sm">
                                <Card.Body>
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>Capability</th>
                                                <th className="text-center">Implementation</th>
                                                <th className="text-center text-success">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Custom YOLOv8 Traffic Signs</td>
                                                <td className="text-center">85 Indian traffic sign classes</td>
                                                <td className="text-center text-success fw-bold">91.5% mAP50 ✓</td>
                                            </tr>
                                            <tr>
                                                <td>Custom YOLOv8 License Plates</td>
                                                <td className="text-center">Trained on 20K+ Indian plates</td>
                                                <td className="text-center text-success fw-bold">98.1% mAP50 ✓</td>
                                            </tr>
                                            <tr>
                                                <td>Model Precision</td>
                                                <td className="text-center">False positive rate minimized</td>
                                                <td className="text-center text-success fw-bold">82.2% ✓</td>
                                            </tr>
                                            <tr>
                                                <td>Model Recall</td>
                                                <td className="text-center">Detection coverage</td>
                                                <td className="text-center text-success fw-bold">92.7% ✓</td>
                                            </tr>
                                            <tr>
                                                <td>Triple-Model Detection</td>
                                                <td className="text-center">COCO-SSD + YOLOv8 Signs + Plates</td>
                                                <td className="text-center text-success">16+ FPS ✓</td>
                                            </tr>
                                            <tr>
                                                <td>Real-time Processing</td>
                                                <td className="text-center">TensorFlow.js in browser</td>
                                                <td className="text-center text-success">✓</td>
                                            </tr>
                                            <tr>
                                                <td>Object Tracking</td>
                                                <td className="text-center">SORT algorithm</td>
                                                <td className="text-center text-success">✓</td>
                                            </tr>
                                            <tr>
                                                <td>License Plate OCR</td>
                                                <td className="text-center">EasyOCR (no external API)</td>
                                                <td className="text-center text-success">✓</td>
                                            </tr>
                                            <tr>
                                                <td>Traffic Density Heatmap</td>
                                                <td className="text-center">Grid-based accumulator</td>
                                                <td className="text-center text-success">✓</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Container>
        </>
    );
};

export default Features;
