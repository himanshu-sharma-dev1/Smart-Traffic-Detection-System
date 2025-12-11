import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge, ProgressBar, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';

function Profile() {
    const { user, isAuthenticated, updateProfile, changePassword, fetchUserStats, logout } = useAuth();
    const navigate = useNavigate();

    // States
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit mode states
    const [editMode, setEditMode] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    // Profile image states
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = React.useRef(null);

    // Password change states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Delete account modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Load profile image from localStorage
    useEffect(() => {
        const savedImage = localStorage.getItem('profileImage');
        if (savedImage) {
            setProfileImage(savedImage);
        }
    }, []);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
        }
    }, [isAuthenticated, navigate]);

    // Fetch user stats on mount
    useEffect(() => {
        const loadStats = async () => {
            if (isAuthenticated) {
                const result = await fetchUserStats();
                if (result.success) {
                    setStats(result.data);
                }
                setLoading(false);
            }
        };
        loadStats();
    }, [isAuthenticated, fetchUserStats]);

    // Initialize edit form
    useEffect(() => {
        if (user) {
            setNewUsername(user.username);
        }
    }, [user]);

    // Handle profile update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!newUsername.trim()) {
            toast.error('Username cannot be empty');
            return;
        }

        setSaving(true);
        const result = await updateProfile({ username: newUsername });
        setSaving(false);

        if (result.success) {
            toast.success('✅ Profile updated successfully!');
            setEditMode(false);
        } else {
            toast.error(result.error);
        }
    };

    // Handle profile image upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // Compress image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);

                // Save to localStorage
                localStorage.setItem('profileImage', compressed);
                setProfileImage(compressed);
                toast.success('📷 Profile photo updated!');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Remove profile image
    const removeImage = () => {
        localStorage.removeItem('profileImage');
        setProfileImage(null);
        toast.info('Profile photo removed');
    };

    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        setSaving(true);
        const result = await changePassword(currentPassword, newPassword);
        setSaving(false);

        if (result.success) {
            toast.success('🔐 Password changed successfully!');
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setPasswordError(result.error);
        }
    };

    // Handle account deletion - permanently delete
    const handleDeleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

            await fetch(`${API_URL}/api/auth/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            logout();
            toast.info('👋 Account permanently deleted. Goodbye!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to delete account');
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate account age
    const getAccountAge = () => {
        if (!user?.created_at) return 0;
        const created = new Date(user.created_at);
        const now = new Date();
        const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        return days;
    };

    if (!isAuthenticated || loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading profile...</p>
            </Container>
        );
    }

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
                        <h1>👤 My Profile</h1>
                        <p>Manage your account and view your detection statistics</p>
                    </motion.div>
                </Container>
            </div>

            <Container className="py-5">
                <Row className="g-4">
                    {/* Profile Card */}
                    <Col lg={4}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="profile-card h-100">
                                <Card.Body className="text-center p-4">
                                    {/* Avatar */}
                                    <div className="profile-avatar mb-4">
                                        <div
                                            className="avatar-circle position-relative"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt="Profile"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                            ) : (
                                                user?.username?.charAt(0).toUpperCase() || 'U'
                                            )}
                                            <div
                                                className="avatar-overlay"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    background: 'var(--primary)',
                                                    borderRadius: '50%',
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '2px solid white'
                                                }}
                                            >
                                                📷
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                        />
                                        {profileImage && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={removeImage}
                                                className="text-danger mt-2"
                                            >
                                                Remove Photo
                                            </Button>
                                        )}
                                        <Badge
                                            bg={user?.is_active ? 'success' : 'secondary'}
                                            className="avatar-badge mt-2"
                                        >
                                            {user?.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    {/* User Info */}
                                    {editMode ? (
                                        <Form onSubmit={handleUpdateProfile}>
                                            <Form.Group className="mb-3">
                                                <Form.Control
                                                    type="text"
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    placeholder="Username"
                                                    className="text-center"
                                                />
                                            </Form.Group>
                                            <div className="d-flex gap-2 justify-content-center">
                                                <Button
                                                    type="submit"
                                                    variant="success"
                                                    disabled={saving}
                                                    size="sm"
                                                >
                                                    {saving ? <Spinner size="sm" /> : '✓ Save'}
                                                </Button>
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => {
                                                        setEditMode(false);
                                                        setNewUsername(user?.username || '');
                                                    }}
                                                    size="sm"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </Form>
                                    ) : (
                                        <>
                                            <h4 className="mb-1">{user?.username}</h4>
                                            <p className="text-muted mb-3">{user?.email}</p>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => setEditMode(true)}
                                            >
                                                ✏️ Edit Profile
                                            </Button>
                                        </>
                                    )}

                                    <hr className="my-4" />

                                    {/* Account Info */}
                                    <div className="account-info text-start">
                                        <div className="info-row">
                                            <span className="info-label">📅 Member Since</span>
                                            <span className="info-value">{formatDate(user?.created_at)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">⏱️ Account Age</span>
                                            <span className="info-value">{getAccountAge()} days</span>
                                        </div>
                                    </div>

                                    <hr className="my-4" />

                                    {/* Actions */}
                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => setShowPasswordModal(true)}
                                        >
                                            🔐 Change Password
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            onClick={() => setShowDeleteModal(true)}
                                        >
                                            🗑️ Delete Account
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Stats Cards */}
                    <Col lg={8}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h5 className="mb-4">📊 Your Detection Statistics</h5>

                            <Row className="g-3 mb-4">
                                <Col sm={6} md={3}>
                                    <Card className="stat-card-profile text-center">
                                        <Card.Body>
                                            <div className="stat-icon-wrapper bg-primary-subtle">📷</div>
                                            <h3 className="stat-number-lg">{stats?.total_detections || 0}</h3>
                                            <small className="text-muted">Total Detections</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} md={3}>
                                    <Card className="stat-card-profile text-center">
                                        <Card.Body>
                                            <div className="stat-icon-wrapper bg-success-subtle">🎯</div>
                                            <h3 className="stat-number-lg">{stats?.total_objects || 0}</h3>
                                            <small className="text-muted">Objects Found</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} md={3}>
                                    <Card className="stat-card-profile text-center">
                                        <Card.Body>
                                            <div className="stat-icon-wrapper bg-warning-subtle">💯</div>
                                            <h3 className="stat-number-lg">{stats?.avg_confidence || 0}%</h3>
                                            <small className="text-muted">Avg Confidence</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} md={3}>
                                    <Card className="stat-card-profile text-center">
                                        <Card.Body>
                                            <div className="stat-icon-wrapper bg-info-subtle">🏆</div>
                                            <h3 className="stat-number-lg text-truncate" title={stats?.top_object || '-'}>
                                                {stats?.top_object || '-'}
                                            </h3>
                                            <small className="text-muted">Top Detection</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Activity Indicator */}
                            <Card className="mb-4">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0">🔥 Detection Activity</h6>
                                        <small className="text-muted">
                                            Last: {formatDate(stats?.last_detection) || 'No detections yet'}
                                        </small>
                                    </div>
                                    <ProgressBar
                                        now={Math.min((stats?.total_detections || 0) * 2, 100)}
                                        variant="success"
                                        animated
                                        label={`${stats?.total_detections || 0} detections`}
                                    />
                                    <small className="text-muted d-block mt-2">
                                        {stats?.total_detections >= 50 ? '🌟 Power User!' :
                                            stats?.total_detections >= 10 ? '🚀 Getting started!' :
                                                '💡 Start detecting to build your history!'}
                                    </small>
                                </Card.Body>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <Card.Body>
                                    <h6 className="mb-3">⚡ Quick Actions</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        <Button as={Link} to="/detect" variant="primary">
                                            📸 New Detection
                                        </Button>
                                        <Button as={Link} to="/live" variant="success">
                                            🎬 Live Detection
                                        </Button>
                                        <Button as={Link} to="/history" variant="outline-primary">
                                            📜 View History
                                        </Button>
                                        <Button as={Link} to="/dashboard" variant="outline-secondary">
                                            📊 Dashboard
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Container>

            {/* Password Change Modal */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>🔐 Change Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePasswordChange}>
                        {passwordError && (
                            <Alert variant="danger" className="mb-3">
                                {passwordError}
                            </Alert>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                        </Form.Group>
                        <div className="d-flex gap-2 justify-content-end">
                            <Button
                                variant="outline-secondary"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? <Spinner size="sm" /> : 'Change Password'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Delete Account Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton className="border-danger">
                    <Modal.Title className="text-danger">🗑️ Delete Account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="warning">
                        <strong>Are you sure?</strong> This will permanently delete your account and all your detection history.
                    </Alert>
                    <p>This will:</p>
                    <ul>
                        <li>Log you out immediately</li>
                        <li>Disable your login</li>
                        <li>Keep your data for potential reactivation</li>
                    </ul>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAccount}>
                        Yes, Delete Forever
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default Profile;
