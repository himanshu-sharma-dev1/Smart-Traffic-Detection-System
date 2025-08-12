import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const features = [
    {
      icon: 'bi-camera-video',
      title: 'Real-Time Detection',
      description: 'Analyze traffic signs instantly using your webcam feed. Our AI processes frames in real-time for immediate feedback.',
    },
    {
      icon: 'bi-cloud-arrow-up',
      title: 'Image Upload',
      description: 'Have a specific image? Upload it directly from your device and let our model identify all relevant traffic signs.',
    },
    {
      icon: 'bi-bounding-box-circles',
      title: 'Dynamic Bounding Boxes',
      description: 'Visualize detection results with precise bounding boxes drawn directly onto your image, complete with labels and confidence scores.',
    },
    {
      icon: 'bi-bar-chart-line',
      title: 'High Accuracy',
      description: 'Powered by Google Cloud Vision AI, our system provides highly accurate and reliable traffic sign recognition.',
    },
  ];

  return (
    <>
      {/* New Hero Section */}
      <Container className="text-center py-5">
        <h1 className="display-4 fw-bold mt-5">Navigate Smarter, Drive Safer.</h1>
        <p className="lead text-muted mb-4">
          The future of traffic analysis is here. Use the power of AI to recognize and understand traffic signs from your camera or images.
        </p>
        <Button variant="primary" size="lg" as={Link} to="/detect">
          Get Started
        </Button>
      </Container>

      {/* Features Grid */}
      <Container className="my-5">
        <h2 className="text-center mb-5">Core Features</h2>
        <Row className="g-4">
          {features.map((feature, index) => (
            <Col md={6} lg={3} key={index}>
              <Card className="h-100 text-center p-3 feature-card">
                <Card.Body>
                  <i className={`bi ${feature.icon} feature-icon`}></i>
                  <Card.Title as="h3" className="h5 fw-bold my-3">{feature.title}</Card.Title>
                  <Card.Text className="text-muted">{feature.description}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
};

export default Home;