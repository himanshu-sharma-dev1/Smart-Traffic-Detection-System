
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const About = () => {
    return (
        <Container className="my-5">
            <Row>
                <Col>
                    <h1 className="mb-4">About Smart Traffic Detection 💡</h1>
                    <p>This project aims to demonstrate the power of cloud-based AI for real-world applications, specifically in the domain of traffic management and road safety.</p>
                    <p>By integrating with Google Cloud Vision AI, our system can accurately identify a wide range of traffic signs, providing valuable information for autonomous vehicles, driver assistance systems, or traffic monitoring.</p>
                    <p>The frontend is built with React, utilizing modern UI libraries like React Bootstrap to provide a responsive and engaging user experience. The backend is a FastAPI application that handles image processing and communication with the Google Cloud Vision API.</p>
                    <h3 className="mt-5">Our Mission:</h3>
                    <p>To contribute to safer and more efficient transportation systems through innovative AI solutions.</p>
                </Col>
            </Row>
        </Container>
    );
};

export default About;
