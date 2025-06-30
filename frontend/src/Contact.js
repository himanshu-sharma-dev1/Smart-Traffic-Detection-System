
import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';

const Contact = () => {
    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">Contact Us 📧</h1>
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <p className="text-center mb-4">Have questions or feedback? Reach out to us!</p>
                    <Form>
                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" placeholder="Enter your name" />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email address</Form.Label>
                            <Form.Control type="email" placeholder="Enter your email" />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formMessage">
                            <Form.Label>Message</Form.Label>
                            <Form.Control as="textarea" rows={5} placeholder="Your message" />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100">
                            Send Message
                        </Button>
                    </Form>
                    <p className="text-center mt-4">You can also reach us at: info@smarttraffic.com</p>
                </Col>
            </Row>
        </Container>
    );
};

export default Contact;
