import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, ListGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';

function Settings() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    // Settings state
    const [settings, setSettings] = useState({
        theme: 'system', // 'light', 'dark', 'system'
        detectionSound: true,
        autoSaveHistory: true,
        showConfidenceLabels: true,
        notificationsEnabled: false,
        language: 'en'
    });

    // Modal states
    const [showExportModal, setShowExportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
        }
    }, [isAuthenticated, navigate]);

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('userSettings', JSON.stringify(newSettings));
        toast.success('✅ Settings saved!', { autoClose: 1500 });
    };

    // Handle setting change
    const handleChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);

        // Apply theme immediately
        if (key === 'theme') {
            applyTheme(value);
        }
    };

    // Apply theme
    const applyTheme = (theme) => {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('dark-mode', prefersDark);
        } else {
            document.body.classList.toggle('dark-mode', theme === 'dark');
        }
        localStorage.setItem('darkMode', theme === 'dark' ? 'true' : 'false');
    };

    // Export user data
    const exportData = async (format) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/detections?limit=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');

            const data = await response.json();

            let exportContent;
            let filename;
            let mimeType;

            if (format === 'json') {
                exportContent = JSON.stringify(data, null, 2);
                filename = `traffic-detection-export-${Date.now()}.json`;
                mimeType = 'application/json';
            } else {
                // CSV format
                const headers = ['ID', 'Date', 'Source', 'Objects', 'Avg Confidence'];
                const rows = data.detections.map(d => [
                    d.id,
                    new Date(d.created_at).toLocaleString(),
                    d.source,
                    d.object_count,
                    (d.avg_confidence * 100).toFixed(1) + '%'
                ]);
                exportContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                filename = `traffic-detection-export-${Date.now()}.csv`;
                mimeType = 'text/csv';
            }

            // Download file
            const blob = new Blob([exportContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setShowExportModal(false);
            toast.success(`📥 Exported as ${format.toUpperCase()}!`);
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            logout();
            toast.info('👋 Account deleted. We\'re sorry to see you go!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to delete account');
        }
    };

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1>⚙️ Settings</h1>
                        <p>Customize your app experience</p>
                    </motion.div>
                </Container>
            </div>

            <Container className="py-5">
                <Row className="g-4">
                    {/* Appearance */}
                    <Col lg={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Card className="settings-card h-100">
                                <Card.Header>
                                    <h5 className="mb-0">🎨 Appearance</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Form.Group className="mb-4">
                                        <Form.Label>Theme</Form.Label>
                                        <Form.Select
                                            value={settings.theme}
                                            onChange={(e) => handleChange('theme', e.target.value)}
                                        >
                                            <option value="system">🌓 System Default</option>
                                            <option value="light">☀️ Light Mode</option>
                                            <option value="dark">🌙 Dark Mode</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            Choose your preferred color scheme
                                        </Form.Text>
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Language</Form.Label>
                                        <Form.Select
                                            value={settings.language}
                                            onChange={(e) => handleChange('language', e.target.value)}
                                        >
                                            <option value="en">🇺🇸 English</option>
                                            <option value="hi">🇮🇳 Hindi (Coming Soon)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Detection Settings */}
                    <Col lg={6}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            <Card className="settings-card h-100">
                                <Card.Header>
                                    <h5 className="mb-0">🎯 Detection</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Form.Check
                                        type="switch"
                                        id="detection-sound"
                                        label="🔊 Play sound on detection"
                                        checked={settings.detectionSound}
                                        onChange={(e) => handleChange('detectionSound', e.target.checked)}
                                        className="mb-3"
                                    />
                                    <Form.Check
                                        type="switch"
                                        id="auto-save"
                                        label="💾 Auto-save detection history"
                                        checked={settings.autoSaveHistory}
                                        onChange={(e) => handleChange('autoSaveHistory', e.target.checked)}
                                        className="mb-3"
                                    />
                                    <Form.Check
                                        type="switch"
                                        id="confidence-labels"
                                        label="📊 Show confidence labels"
                                        checked={settings.showConfidenceLabels}
                                        onChange={(e) => handleChange('showConfidenceLabels', e.target.checked)}
                                        className="mb-3"
                                    />
                                    <Form.Check
                                        type="switch"
                                        id="notifications"
                                        label="🔔 Enable notifications"
                                        checked={settings.notificationsEnabled}
                                        onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                                        className="mb-3"
                                    />
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Data & Privacy */}
                    <Col lg={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <Card className="settings-card h-100">
                                <Card.Header>
                                    <h5 className="mb-0">📦 Data & Privacy</h5>
                                </Card.Header>
                                <Card.Body>
                                    <ListGroup variant="flush">
                                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0">
                                            <div>
                                                <strong>Export Your Data</strong>
                                                <p className="text-muted mb-0 small">Download all your detections</p>
                                            </div>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => setShowExportModal(true)}
                                            >
                                                📥 Export
                                            </Button>
                                        </ListGroup.Item>
                                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0">
                                            <div>
                                                <strong>Clear Local Data</strong>
                                                <p className="text-muted mb-0 small">Remove cached data from browser</p>
                                            </div>
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => {
                                                    localStorage.removeItem('detectionStats');
                                                    toast.success('Local cache cleared!');
                                                }}
                                            >
                                                🗑️ Clear
                                            </Button>
                                        </ListGroup.Item>
                                    </ListGroup>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Account & Danger Zone */}
                    <Col lg={6}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                        >
                            <Card className="settings-card h-100 border-danger">
                                <Card.Header className="bg-danger text-white">
                                    <h5 className="mb-0">⚠️ Danger Zone</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Alert variant="warning" className="mb-3">
                                        <small>These actions are irreversible. Please proceed with caution.</small>
                                    </Alert>
                                    <Button
                                        variant="outline-danger"
                                        className="w-100"
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        🗑️ Delete My Account
                                    </Button>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Quick Links */}
                <motion.div
                    className="text-center mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Button as={Link} to="/profile" variant="outline-primary" className="me-2">
                        👤 Profile
                    </Button>
                    <Button as={Link} to="/dashboard" variant="outline-secondary">
                        📊 Dashboard
                    </Button>
                </motion.div>
            </Container>

            {/* Export Modal */}
            <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>📥 Export Your Data</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Choose your preferred format:</p>
                    <div className="d-grid gap-2">
                        <Button variant="primary" onClick={() => exportData('json')}>
                            📄 Export as JSON
                        </Button>
                        <Button variant="outline-primary" onClick={() => exportData('csv')}>
                            📊 Export as CSV
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Delete Account Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton className="border-danger">
                    <Modal.Title className="text-danger">⚠️ Delete Account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="danger">
                        <strong>This action cannot be undone!</strong>
                        <p className="mb-0">All your data, including detection history and settings, will be permanently deleted.</p>
                    </Alert>
                    <Form.Group className="mt-3">
                        <Form.Label>Type <strong>DELETE</strong> to confirm:</Form.Label>
                        <Form.Control
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                    >
                        Delete Forever
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default Settings;
