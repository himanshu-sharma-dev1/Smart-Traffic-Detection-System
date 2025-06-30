
import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Features = () => {
    const features = [
        {
            icon: '💡',
            title: 'AI-Powered Detection',
            description: 'Utilizes Google Cloud Vision AI for highly accurate traffic sign recognition.'
        },
        {
            icon: '⚡',
            title: 'Real-time Processing',
            description: 'Processes images from your webcam in real-time for immediate feedback.'
        },
        {
            icon: '🌐',
            title: 'Cloud Scalability',
            description: 'Leverages cloud infrastructure for scalable and robust performance.'
        },
        {
            icon: '📈',
            title: 'Enhanced Safety',
            description: 'Aids in improving road safety by identifying critical traffic information.'
        },
        {
            icon: '📱',
            title: 'Responsive Design',
            description: 'Optimized for seamless experience across various devices and screen sizes.'
        },
        {
            icon: '📊',
            title: 'Detailed Insights',
            description: 'Provides confidence scores for each detection, offering deeper insights.'
        }
    ];

    return (
        <Container className="my-5">
            <h1 className="text-center mb-5">Key Features ✨</h1>
            <Row xs={1} md={2} lg={3} className="g-4">
                {features.map((feature, idx) => (
                    <Col key={idx}>
                        <Card className="h-100 shadow-sm">
                            <Card.Body className="text-center">
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                                <Card.Title>{feature.title}</Card.Title>
                                <Card.Text>{feature.description}</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default Features;
