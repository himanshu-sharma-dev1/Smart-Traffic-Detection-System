import React from 'react';
import { Container, Row, Col, Card, Badge, Table, Accordion } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const APIDocs = () => {
    const endpoints = [
        {
            category: 'Authentication',
            icon: '🔐',
            routes: [
                {
                    method: 'POST',
                    path: '/api/auth/register',
                    description: 'Create a new user account',
                    body: { username: 'string', email: 'string', password: 'string' },
                    response: { access_token: 'string', user: {} }
                },
                {
                    method: 'POST',
                    path: '/api/auth/login',
                    description: 'Login with email and password',
                    body: { email: 'string', password: 'string' },
                    response: { access_token: 'string', user: {} }
                },
                {
                    method: 'GET',
                    path: '/api/auth/me',
                    description: 'Get current user profile',
                    auth: true,
                    response: { id: 'string', username: 'string', email: 'string' }
                }
            ]
        },
        {
            category: 'Detection',
            icon: '🎯',
            routes: [
                {
                    method: 'POST',
                    path: '/detect',
                    description: 'Detect objects in an image (public)',
                    body: 'FormData with "file" field',
                    response: { image: 'base64', detections: [] }
                },
                {
                    method: 'POST',
                    path: '/api/detections',
                    description: 'Save detection to history',
                    auth: true,
                    body: { image_base64: 'string', detections: [], source: 'string' },
                    response: { id: 'string', created_at: 'datetime' }
                },
                {
                    method: 'GET',
                    path: '/api/detections',
                    description: 'Get user detection history',
                    auth: true,
                    params: { page: 'int', limit: 'int', source: 'string' },
                    response: { detections: [], total: 'int', page: 'int' }
                },
                {
                    method: 'GET',
                    path: '/api/detections/stats',
                    description: 'Get user detection statistics',
                    auth: true,
                    response: { total_detections: 'int', avg_confidence: 'float', top_object: 'string' }
                }
            ]
        },
        {
            category: 'System',
            icon: '⚙️',
            routes: [
                {
                    method: 'GET',
                    path: '/',
                    description: 'API health check',
                    response: { status: 'online', version: '2.0.0' }
                },
                {
                    method: 'GET',
                    path: '/ping',
                    description: 'Simple ping endpoint',
                    response: { status: 'ok' }
                },
                {
                    method: 'GET',
                    path: '/api/health',
                    description: 'Detailed health check',
                    response: { status: 'healthy', database: 'connected' }
                }
            ]
        }
    ];

    const getMethodBadge = (method) => {
        const colors = {
            GET: 'success',
            POST: 'primary',
            PUT: 'warning',
            DELETE: 'danger'
        };
        return <Badge bg={colors[method]} className="me-2">{method}</Badge>;
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        📚 API Documentation
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Complete REST API reference for developers
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Quick Links */}
                    <Card className="shadow-sm mb-4">
                        <Card.Body>
                            <Row className="align-items-center">
                                <Col md={8}>
                                    <h5 className="mb-1">🔗 Interactive API Docs</h5>
                                    <p className="text-muted mb-0">Try endpoints directly with Swagger UI</p>
                                </Col>
                                <Col md={4} className="text-end">
                                    <a
                                        href="http://localhost:8000/docs"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Open Swagger UI →
                                    </a>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Base URL */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header>
                            <h5 className="mb-0">🌐 Base URL</h5>
                        </Card.Header>
                        <Card.Body>
                            <code className="bg-dark text-success p-3 d-block rounded">
                                http://localhost:8000
                            </code>
                        </Card.Body>
                    </Card>

                    {/* Authentication */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header>
                            <h5 className="mb-0">🔑 Authentication</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>Protected endpoints require a Bearer token in the Authorization header:</p>
                            <code className="bg-dark text-warning p-3 d-block rounded">
                                Authorization: Bearer {'<access_token>'}
                            </code>
                            <p className="mt-3 mb-0 text-muted">
                                Get your token from the <code>/api/auth/login</code> or <code>/api/auth/register</code> endpoint.
                            </p>
                        </Card.Body>
                    </Card>

                    {/* Endpoints */}
                    <Accordion defaultActiveKey="0">
                        {endpoints.map((category, catIndex) => (
                            <Accordion.Item eventKey={catIndex.toString()} key={catIndex}>
                                <Accordion.Header>
                                    <span className="me-2">{category.icon}</span>
                                    <strong>{category.category}</strong>
                                    <Badge bg="secondary" className="ms-2">
                                        {category.routes.length} endpoints
                                    </Badge>
                                </Accordion.Header>
                                <Accordion.Body>
                                    {category.routes.map((route, routeIndex) => (
                                        <Card className="mb-3" key={routeIndex}>
                                            <Card.Header className="d-flex align-items-center">
                                                {getMethodBadge(route.method)}
                                                <code className="text-dark">{route.path}</code>
                                                {route.auth && (
                                                    <Badge bg="warning" text="dark" className="ms-auto">
                                                        🔒 Auth Required
                                                    </Badge>
                                                )}
                                            </Card.Header>
                                            <Card.Body>
                                                <p>{route.description}</p>

                                                {route.body && (
                                                    <>
                                                        <h6>Request Body:</h6>
                                                        <pre className="bg-light p-2 rounded">
                                                            {typeof route.body === 'string'
                                                                ? route.body
                                                                : JSON.stringify(route.body, null, 2)
                                                            }
                                                        </pre>
                                                    </>
                                                )}

                                                {route.params && (
                                                    <>
                                                        <h6>Query Parameters:</h6>
                                                        <pre className="bg-light p-2 rounded">
                                                            {JSON.stringify(route.params, null, 2)}
                                                        </pre>
                                                    </>
                                                )}

                                                <h6>Response:</h6>
                                                <pre className="bg-dark text-success p-2 rounded">
                                                    {JSON.stringify(route.response, null, 2)}
                                                </pre>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                </Accordion.Body>
                            </Accordion.Item>
                        ))}
                    </Accordion>

                    {/* Error Codes */}
                    <Card className="shadow-sm mt-4">
                        <Card.Header>
                            <h5 className="mb-0">⚠️ Error Codes</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><Badge bg="warning">400</Badge></td>
                                        <td>Bad Request - Invalid input</td>
                                    </tr>
                                    <tr>
                                        <td><Badge bg="danger">401</Badge></td>
                                        <td>Unauthorized - Invalid or missing token</td>
                                    </tr>
                                    <tr>
                                        <td><Badge bg="danger">403</Badge></td>
                                        <td>Forbidden - Access denied</td>
                                    </tr>
                                    <tr>
                                        <td><Badge bg="secondary">404</Badge></td>
                                        <td>Not Found - Resource doesn't exist</td>
                                    </tr>
                                    <tr>
                                        <td><Badge bg="info">409</Badge></td>
                                        <td>Conflict - Resource already exists</td>
                                    </tr>
                                    <tr>
                                        <td><Badge bg="dark">500</Badge></td>
                                        <td>Server Error - Something went wrong</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Navigation */}
                    <div className="text-center mt-4">
                        <Link to="/" className="btn btn-outline-primary me-2">
                            🏠 Home
                        </Link>
                        <a
                            href="http://localhost:8000/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary me-2"
                        >
                            📄 Swagger UI
                        </a>
                        <a
                            href="http://localhost:8000/redoc"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-secondary"
                        >
                            📖 ReDoc
                        </a>
                    </div>
                </motion.div>
            </Container>
        </>
    );
};

export default APIDocs;
