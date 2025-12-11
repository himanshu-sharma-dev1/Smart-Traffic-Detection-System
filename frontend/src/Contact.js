import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [validated, setValidated] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const form = event.currentTarget;

        if (form.checkValidity() === false) {
            event.stopPropagation();
            setValidated(true);
            toast.error('Please fill in all required fields!');
            return;
        }

        // Simulate form submission
        setSubmitted(true);
        toast.success('🎉 Message sent successfully! We\'ll get back to you soon.');

        // Reset form after delay
        setTimeout(() => {
            setFormData({ name: '', email: '', subject: '', message: '' });
            setValidated(false);
            setSubmitted(false);
        }, 3000);
    };

    const contactInfo = [
        { icon: '📧', label: 'Email', value: 'info@smarttraffic.com' },
        { icon: '📍', label: 'Location', value: 'Tech Hub, Innovation City' },
        { icon: '🕐', label: 'Response Time', value: 'Within 24 hours' }
    ];

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <h1>📬 Get In Touch</h1>
                    <p className="lead mb-0">Have questions or feedback? We'd love to hear from you!</p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="g-4">
                    {/* Contact Form */}
                    <Col lg={7}>
                        <Card className="shadow-sm p-4">
                            <h3 className="mb-4">💬 Send us a Message</h3>

                            {submitted && (
                                <Alert variant="success" className="mb-4">
                                    ✅ Thank you for your message! We'll respond shortly.
                                </Alert>
                            )}

                            <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3" controlId="formName">
                                            <Form.Label>Your Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="John Doe"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                Please enter your name.
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3" controlId="formEmail">
                                            <Form.Label>Email Address *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                placeholder="john@example.com"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                Please enter a valid email.
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3" controlId="formSubject">
                                    <Form.Label>Subject *</Form.Label>
                                    <Form.Select
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select a topic...</option>
                                        <option value="general">General Inquiry</option>
                                        <option value="technical">Technical Support</option>
                                        <option value="feedback">Feedback</option>
                                        <option value="partnership">Partnership Opportunity</option>
                                        <option value="other">Other</option>
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        Please select a subject.
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="formMessage">
                                    <Form.Label>Message *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Tell us how we can help you..."
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        minLength={10}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        Please enter a message (min 10 characters).
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 ripple-button"
                                    disabled={submitted}
                                >
                                    {submitted ? '✅ Sent!' : '🚀 Send Message'}
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    {/* Contact Info Sidebar */}
                    <Col lg={5}>
                        <Card className="shadow-sm p-4 mb-4">
                            <h3 className="mb-4">📞 Contact Information</h3>
                            {contactInfo.map((info, idx) => (
                                <div key={idx} className="d-flex align-items-center mb-3">
                                    <span className="me-3" style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                                    <div>
                                        <small className="text-muted d-block">{info.label}</small>
                                        <strong>{info.value}</strong>
                                    </div>
                                </div>
                            ))}
                        </Card>

                        <Card className="shadow-sm p-4 mb-4 bg-primary-subtle">
                            <h4 className="mb-3">🤝 Connect With Us</h4>
                            <p className="mb-3">Follow our journey and stay updated with the latest developments.</p>
                            <div className="social-links justify-content-start">
                                <a href="https://github.com" className="social-link" target="_blank" rel="noopener noreferrer">
                                    💻
                                </a>
                                <a href="https://linkedin.com" className="social-link" target="_blank" rel="noopener noreferrer">
                                    💼
                                </a>
                                <a href="https://twitter.com" className="social-link" target="_blank" rel="noopener noreferrer">
                                    🐦
                                </a>
                            </div>
                        </Card>

                        <Card className="shadow-sm p-4 bg-success-subtle">
                            <h4 className="mb-3">💡 Quick Tips</h4>
                            <ul className="mb-0">
                                <li>For technical issues, include browser and OS details</li>
                                <li>Attach screenshots if reporting a bug</li>
                                <li>Check our Features page for common questions</li>
                            </ul>
                        </Card>
                    </Col>
                </Row>

                {/* FAQ Section */}
                <div className="mt-5 pt-5">
                    <h2 className="text-center mb-4">❓ Frequently Asked Questions</h2>
                    <Row className="g-4 justify-content-center">
                        <Col md={6}>
                            <Card className="h-100 p-4">
                                <h5>🔒 Is my data secure?</h5>
                                <p className="mb-0 text-muted">
                                    Yes! Images are processed in real-time and are not stored on our servers.
                                    All processing is done securely via Google Cloud.
                                </p>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="h-100 p-4">
                                <h5>📷 What devices are supported?</h5>
                                <p className="mb-0 text-muted">
                                    Any device with a webcam and modern browser (Chrome, Firefox, Safari, Edge)
                                    is supported for real-time detection.
                                </p>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="h-100 p-4">
                                <h5>🎯 How accurate is the detection?</h5>
                                <p className="mb-0 text-muted">
                                    Our system achieves 99.2% accuracy using Google Cloud Vision AI,
                                    with confidence scores provided for each detection.
                                </p>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="h-100 p-4">
                                <h5>💰 Is this service free?</h5>
                                <p className="mb-0 text-muted">
                                    This is currently a demonstration project.
                                    For enterprise deployments, please contact us for pricing.
                                </p>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Container>
        </>
    );
};

export default Contact;
