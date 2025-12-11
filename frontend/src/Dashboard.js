import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState([]);
    const [timeRange, setTimeRange] = useState('all'); // 'today', 'week', 'all'
    const [summary, setSummary] = useState({
        totalDetections: 0,
        totalObjects: 0,
        avgConfidence: 0,
        topObject: '-',
        sessionsCount: 0
    });

    // Chart colors
    const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

    useEffect(() => {
        loadStats();
    }, [timeRange]);

    const loadStats = () => {
        try {
            const rawStats = JSON.parse(localStorage.getItem('detectionStats') || '[]');

            // Filter by time range
            let filtered = rawStats;
            const now = new Date();

            if (timeRange === 'today') {
                const today = now.toLocaleDateString();
                filtered = rawStats.filter(s => s.date === today);
            } else if (timeRange === 'week') {
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                filtered = rawStats.filter(s => new Date(s.timestamp) >= weekAgo);
            }

            setStats(filtered);
            calculateSummary(filtered);
        } catch (e) {
            console.error('Error loading stats:', e);
            setStats([]);
        }
    };

    const calculateSummary = (data) => {
        if (data.length === 0) {
            setSummary({
                totalDetections: 0,
                totalObjects: 0,
                avgConfidence: 0,
                topObject: '-',
                sessionsCount: 0
            });
            return;
        }

        const totalObjects = data.reduce((sum, s) => sum + s.objectCount, 0);

        // Calculate average confidence
        let allConfidences = [];
        data.forEach(s => {
            s.objects?.forEach(obj => {
                allConfidences.push(obj.score);
            });
        });
        const avgConfidence = allConfidences.length > 0
            ? (allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) * 100
            : 0;

        // Find top object
        const objectCounts = {};
        data.forEach(s => {
            s.objects?.forEach(obj => {
                objectCounts[obj.class] = (objectCounts[obj.class] || 0) + 1;
            });
        });
        const topObject = Object.entries(objectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        // Count unique sessions (group by hour)
        const uniqueSessions = new Set(data.map(s => s.date + '-' + s.hour));

        setSummary({
            totalDetections: data.length,
            totalObjects,
            avgConfidence: avgConfidence.toFixed(1),
            topObject,
            sessionsCount: uniqueSessions.size
        });
    };

    // Prepare data for timeline chart
    const getTimelineData = () => {
        const grouped = {};
        stats.forEach(s => {
            const key = s.date + ' ' + s.hour + ':00';
            if (!grouped[key]) {
                grouped[key] = { time: key, count: 0, objects: 0 };
            }
            grouped[key].count++;
            grouped[key].objects += s.objectCount;
        });
        return Object.values(grouped).slice(-24); // Last 24 data points
    };

    // Prepare data for object distribution
    const getObjectDistribution = () => {
        const counts = {};
        stats.forEach(s => {
            s.objects?.forEach(obj => {
                counts[obj.class] = (counts[obj.class] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 8);
    };

    // Get confidence distribution
    const getConfidenceData = () => {
        const buckets = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 };
        stats.forEach(s => {
            s.objects?.forEach(obj => {
                const conf = obj.score * 100;
                if (conf < 20) buckets['0-20%']++;
                else if (conf < 40) buckets['20-40%']++;
                else if (conf < 60) buckets['40-60%']++;
                else if (conf < 80) buckets['60-80%']++;
                else buckets['80-100%']++;
            });
        });
        return Object.entries(buckets).map(([range, count]) => ({ range, count }));
    };

    // Get hourly activity
    const getHourlyActivity = () => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        stats.forEach(s => {
            if (s.hour !== undefined) {
                hours[s.hour].count++;
            }
        });
        return hours;
    };

    const clearStats = () => {
        if (window.confirm('Are you sure you want to clear all analytics data?')) {
            localStorage.removeItem('detectionStats');
            setStats([]);
            setSummary({
                totalDetections: 0,
                totalObjects: 0,
                avgConfidence: 0,
                topObject: '-',
                sessionsCount: 0
            });
            toast.success('Analytics data cleared');
        }
    };

    // Generate sample data for demo
    const generateSampleData = () => {
        const sampleStats = [];
        const now = new Date();
        const classes = ['car', 'person', 'truck', 'bicycle', 'traffic light', 'stop sign'];

        for (let i = 0; i < 100; i++) {
            const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const objectCount = Math.floor(Math.random() * 5) + 1;
            const objects = Array(objectCount).fill(null).map(() => ({
                class: classes[Math.floor(Math.random() * classes.length)],
                score: 0.5 + Math.random() * 0.5
            }));

            sampleStats.push({
                timestamp: timestamp.toISOString(),
                date: timestamp.toLocaleDateString(),
                hour: timestamp.getHours(),
                objectCount,
                trackedCount: objectCount + Math.floor(Math.random() * 3),
                objects
            });
        }

        localStorage.setItem('detectionStats', JSON.stringify(sampleStats));
        loadStats();
        toast.success('Sample data generated!');
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
                        📊 Analytics Dashboard
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Track your detection statistics and trends
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Controls */}
                    <Row className="mb-4">
                        <Col md={6}>
                            <Form.Select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="w-auto"
                            >
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="all">All Time</option>
                            </Form.Select>
                        </Col>
                        <Col md={6} className="text-end">
                            <Button
                                variant="outline-secondary"
                                onClick={generateSampleData}
                                className="me-2"
                            >
                                Generate Demo Data
                            </Button>
                            <Button
                                variant="outline-danger"
                                onClick={clearStats}
                            >
                                Clear Data
                            </Button>
                        </Col>
                    </Row>

                    {stats.length === 0 ? (
                        <Alert variant="info" className="text-center py-5">
                            <h4>📈 No Detection Data Yet</h4>
                            <p className="mb-3">Start detecting objects in Live Mode to see analytics here!</p>
                            <Button as={Link} to="/live" variant="primary">
                                🎬 Go to Live Detection
                            </Button>
                            <p className="mt-3 mb-0">
                                <small>Or click "Generate Demo Data" to see sample charts</small>
                            </p>
                        </Alert>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <Row className="g-4 mb-5">
                                <Col md={3} sm={6}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <Card className="dashboard-stat-card h-100 border-0 shadow-sm">
                                            <Card.Body className="text-center">
                                                <div className="stat-icon bg-primary-subtle text-primary">
                                                    📷
                                                </div>
                                                <h2 className="mb-0">{summary.totalDetections}</h2>
                                                <small className="text-muted">Total Detections</small>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                                <Col md={3} sm={6}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <Card className="dashboard-stat-card h-100 border-0 shadow-sm">
                                            <Card.Body className="text-center">
                                                <div className="stat-icon bg-success-subtle text-success">
                                                    🎯
                                                </div>
                                                <h2 className="mb-0">{summary.totalObjects}</h2>
                                                <small className="text-muted">Objects Detected</small>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                                <Col md={3} sm={6}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <Card className="dashboard-stat-card h-100 border-0 shadow-sm">
                                            <Card.Body className="text-center">
                                                <div className="stat-icon bg-warning-subtle text-warning">
                                                    💯
                                                </div>
                                                <h2 className="mb-0">{summary.avgConfidence}%</h2>
                                                <small className="text-muted">Avg Confidence</small>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                                <Col md={3} sm={6}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <Card className="dashboard-stat-card h-100 border-0 shadow-sm">
                                            <Card.Body className="text-center">
                                                <div className="stat-icon bg-info-subtle text-info">
                                                    🏆
                                                </div>
                                                <h2 className="mb-0 text-truncate">{summary.topObject}</h2>
                                                <small className="text-muted">Top Object</small>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                            </Row>

                            {/* Charts Row 1 */}
                            <Row className="g-4 mb-4">
                                <Col lg={8}>
                                    <Card className="shadow-sm h-100">
                                        <Card.Header className="bg-transparent">
                                            <h6 className="mb-0">📈 Detection Timeline</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={getTimelineData()}>
                                                    <defs>
                                                        <linearGradient id="colorObjects" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#3498db" stopOpacity={0.1} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="time"
                                                        tick={{ fontSize: 12 }}
                                                        interval="preserveStartEnd"
                                                    />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="objects"
                                                        stroke="#3498db"
                                                        fillOpacity={1}
                                                        fill="url(#colorObjects)"
                                                        name="Objects"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={4}>
                                    <Card className="shadow-sm h-100">
                                        <Card.Header className="bg-transparent">
                                            <h6 className="mb-0">🥧 Object Distribution</h6>
                                        </Card.Header>
                                        <Card.Body className="d-flex align-items-center">
                                            <ResponsiveContainer width="100%" height={250}>
                                                <PieChart>
                                                    <Pie
                                                        data={getObjectDistribution()}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                        labelLine={false}
                                                    >
                                                        {getObjectDistribution().map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Charts Row 2 */}
                            <Row className="g-4 mb-4">
                                <Col lg={6}>
                                    <Card className="shadow-sm h-100">
                                        <Card.Header className="bg-transparent">
                                            <h6 className="mb-0">💯 Confidence Distribution</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <BarChart data={getConfidenceData()}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar
                                                        dataKey="count"
                                                        fill="#2ecc71"
                                                        radius={[4, 4, 0, 0]}
                                                        name="Count"
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={6}>
                                    <Card className="shadow-sm h-100">
                                        <Card.Header className="bg-transparent">
                                            <h6 className="mb-0">🕐 Hourly Activity</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <LineChart data={getHourlyActivity()}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="hour"
                                                        tick={{ fontSize: 12 }}
                                                        tickFormatter={(h) => `${h}:00`}
                                                    />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip labelFormatter={(h) => `${h}:00`} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke="#9b59b6"
                                                        strokeWidth={2}
                                                        dot={{ fill: '#9b59b6' }}
                                                        name="Detections"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Object List */}
                            <Card className="shadow-sm">
                                <Card.Header className="bg-transparent">
                                    <h6 className="mb-0">🏷️ Object Types Detected</h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-flex flex-wrap gap-2">
                                        {getObjectDistribution().map((obj, i) => (
                                            <Badge
                                                key={i}
                                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                                className="p-2"
                                            >
                                                {obj.name}: {obj.value}
                                            </Badge>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        </>
                    )}

                    {/* Navigation */}
                    <div className="text-center mt-4">
                        <Button as={Link} to="/live" variant="primary" className="me-2">
                            🎬 Live Detection
                        </Button>
                        <Button as={Link} to="/history" variant="outline-secondary" className="me-2">
                            📜 History
                        </Button>
                        <Button as={Link} to="/detect" variant="outline-primary">
                            📸 Upload Image
                        </Button>
                    </div>
                </motion.div>
            </Container>
        </>
    );
};

export default Dashboard;
