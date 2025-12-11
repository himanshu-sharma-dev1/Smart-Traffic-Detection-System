import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Pagination, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { SkeletonCard, SkeletonStatCard } from './components/Skeleton';
import { exportHistoryToPdf } from './utils/exportPdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const History = () => {
    const { isAuthenticated, token } = useAuth();

    // Data states
    const [detections, setDetections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    // Filter states
    const [sourceFilter, setSourceFilter] = useState('');

    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Fetch detections from API
    const fetchDetections = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            if (sourceFilter) {
                params.append('source', sourceFilter);
            }

            const response = await axios.get(`${API_URL}/api/detections?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDetections(response.data.detections);
            setTotalCount(response.data.total);
        } catch (error) {
            console.error('Failed to fetch detections:', error);
            toast.error('Failed to load detection history');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, token, currentPage, itemsPerPage, sourceFilter]);

    useEffect(() => {
        fetchDetections();
    }, [fetchDetections]);

    // Delete single detection
    const deleteItem = async (id) => {
        setDeleting(true);
        try {
            await axios.delete(`${API_URL}/api/detections/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove from local state
            setDetections(prev => prev.filter(d => d.id !== id));
            setTotalCount(prev => prev - 1);
            toast.success('Detection deleted');

            // Close modal if open
            if (showModal && selectedItem?.id === id) {
                setShowModal(false);
            }
        } catch (error) {
            toast.error('Failed to delete detection');
        } finally {
            setDeleting(false);
        }
    };

    // Clear all history
    const clearAllHistory = async () => {
        if (!window.confirm('Are you sure you want to delete all detection history?')) {
            return;
        }

        setDeleting(true);
        try {
            await axios.delete(`${API_URL}/api/detections`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDetections([]);
            setTotalCount(0);
            toast.success('All history cleared');
        } catch (error) {
            toast.error('Failed to clear history');
        } finally {
            setDeleting(false);
        }
    };

    const viewDetails = (item) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const getConfidenceColor = (confidence) => {
        const conf = confidence > 1 ? confidence / 100 : confidence;
        if (conf >= 0.9) return 'success';
        if (conf >= 0.7) return 'info';
        if (conf >= 0.5) return 'warning';
        return 'danger';
    };

    const getSourceBadge = (source) => {
        const badges = {
            'upload': { color: 'primary', icon: '📤' },
            'live': { color: 'success', icon: '🎬' },
            'batch': { color: 'info', icon: '📁' }
        };
        const badge = badges[source] || { color: 'secondary', icon: '📷' };
        return (
            <Badge bg={badge.color} className="source-badge">
                {badge.icon} {source}
            </Badge>
        );
    };

    // Pagination
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const items = [];
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            items.push(
                <Pagination.First key="first" onClick={() => setCurrentPage(1)} />,
                <Pagination.Prev key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
            );
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <Pagination.Item
                    key={i}
                    active={i === currentPage}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </Pagination.Item>
            );
        }

        if (endPage < totalPages) {
            items.push(
                <Pagination.Next key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />,
                <Pagination.Last key="last" onClick={() => setCurrentPage(totalPages)} />
            );
        }

        return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: -100 }
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        📜 Detection History
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        View and manage your past detection results
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                {/* Stats Bar */}
                <motion.div
                    className="history-stats mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Row className="align-items-center">
                        <Col md={4}>
                            <h5 className="mb-0">
                                <Badge bg="primary" className="me-2">{totalCount}</Badge>
                                Detection{totalCount !== 1 ? 's' : ''} Saved
                            </h5>
                        </Col>
                        <Col md={4} className="text-center mt-3 mt-md-0">
                            <Form.Select
                                size="sm"
                                value={sourceFilter}
                                onChange={(e) => {
                                    setSourceFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{ maxWidth: 200, margin: '0 auto' }}
                            >
                                <option value="">All Sources</option>
                                <option value="upload">📤 Upload</option>
                                <option value="live">🎬 Live</option>
                                <option value="batch">📁 Batch</option>
                            </Form.Select>
                        </Col>
                        <Col md={4} className="text-md-end mt-3 mt-md-0">
                            {detections.length > 0 && (
                                <>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => {
                                            exportHistoryToPdf(detections);
                                            toast.success('📄 PDF exported!');
                                        }}
                                    >
                                        📄 Export PDF
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={clearAllHistory}
                                        disabled={deleting}
                                    >
                                        {deleting ? <Spinner size="sm" /> : '🗑️ Clear All'}
                                    </Button>
                                </>
                            )}
                        </Col>
                    </Row>
                </motion.div>

                {/* Loading State */}
                {loading ? (
                    <Row className="g-4">
                        {[...Array(6)].map((_, i) => (
                            <Col md={6} lg={4} key={i}>
                                <SkeletonCard height={280} />
                            </Col>
                        ))}
                    </Row>
                ) : detections.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="text-center p-5">
                            <Card.Body>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                                <h4>No Detection History Yet</h4>
                                <p className="text-muted mb-4">
                                    Your detection results will appear here after you analyze images.
                                </p>
                                <Button as={Link} to="/detect" variant="primary" size="lg">
                                    🎯 Start Detecting
                                </Button>
                            </Card.Body>
                        </Card>
                    </motion.div>
                ) : (
                    <>
                        <Row className="g-4">
                            <AnimatePresence>
                                {detections.map((item, index) => (
                                    <Col md={6} lg={4} key={item.id}>
                                        <motion.div
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            layout
                                        >
                                            <Card className="history-card h-100">
                                                <div className="history-card-image">
                                                    {item.thumbnail ? (
                                                        <img
                                                            src={`data:image/jpeg;base64,${item.thumbnail}`}
                                                            alt={`Detection ${index + 1}`}
                                                        />
                                                    ) : (
                                                        <div className="no-thumbnail">
                                                            <span>📷</span>
                                                        </div>
                                                    )}
                                                    <div className="history-card-overlay">
                                                        <Badge bg="dark" className="detection-count">
                                                            {item.object_count} object{item.object_count !== 1 ? 's' : ''}
                                                        </Badge>
                                                        {getSourceBadge(item.source)}
                                                    </div>
                                                </div>
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <small className="text-muted">
                                                            🕐 {getTimeAgo(item.created_at)}
                                                        </small>
                                                        <Badge bg={getConfidenceColor(item.avg_confidence)}>
                                                            {(item.avg_confidence * 100).toFixed(0)}% avg
                                                        </Badge>
                                                    </div>
                                                    <div className="detected-labels mb-3">
                                                        {item.detections.slice(0, 3).map((det, i) => (
                                                            <Badge
                                                                key={i}
                                                                bg="secondary"
                                                                className="me-1 mb-1"
                                                            >
                                                                {det.label}
                                                            </Badge>
                                                        ))}
                                                        {item.detections.length > 3 && (
                                                            <Badge bg="light" text="dark">
                                                                +{item.detections.length - 3} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="flex-grow-1"
                                                            onClick={() => viewDetails(item)}
                                                        >
                                                            👁️ View
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => deleteItem(item.id)}
                                                            disabled={deleting}
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                ))}
                            </AnimatePresence>
                        </Row>

                        {/* Pagination */}
                        {renderPagination()}
                    </>
                )}

                {/* Quick Action */}
                <motion.div
                    className="text-center mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <Button as={Link} to="/detect" variant="success" size="lg" className="me-2">
                        📸 New Detection
                    </Button>
                    <Button as={Link} to="/live" variant="outline-success" size="lg">
                        🎬 Live Detection
                    </Button>
                </motion.div>
            </Container>

            {/* Detail Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detection Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <Row>
                            <Col md={6}>
                                {selectedItem.thumbnail ? (
                                    <img
                                        src={`data:image/jpeg;base64,${selectedItem.thumbnail}`}
                                        alt="Detection"
                                        className="img-fluid rounded mb-3"
                                    />
                                ) : (
                                    <div className="no-thumbnail-large mb-3">
                                        <span>📷 No preview</span>
                                    </div>
                                )}
                                <div className="d-flex gap-2 flex-wrap">
                                    {getSourceBadge(selectedItem.source)}
                                    <Badge bg={getConfidenceColor(selectedItem.avg_confidence)}>
                                        {(selectedItem.avg_confidence * 100).toFixed(1)}% avg confidence
                                    </Badge>
                                </div>
                            </Col>
                            <Col md={6}>
                                <h5>Detected Objects ({selectedItem.object_count})</h5>
                                <div className="list-group mb-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
                                    {selectedItem.detections.map((det, i) => (
                                        <div key={i} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{det.label}</span>
                                            <Badge bg={getConfidenceColor(det.confidence)}>
                                                {(det.confidence * 100).toFixed(1)}%
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <hr />
                                <small className="text-muted d-block">
                                    <strong>Detected:</strong> {new Date(selectedItem.created_at).toLocaleString()}
                                </small>
                                <small className="text-muted d-block">
                                    <strong>ID:</strong> {selectedItem.id}
                                </small>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-danger"
                        onClick={() => deleteItem(selectedItem?.id)}
                        disabled={deleting}
                    >
                        {deleting ? <Spinner size="sm" /> : '🗑️ Delete'}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default History;
