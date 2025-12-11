import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Alert, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const CompareMode = () => {
    const [leftImage, setLeftImage] = useState(null);
    const [rightImage, setRightImage] = useState(null);
    const [leftResults, setLeftResults] = useState(null);
    const [rightResults, setRightResults] = useState(null);
    const [leftLoading, setLeftLoading] = useState(false);
    const [rightLoading, setRightLoading] = useState(false);
    const [leftFile, setLeftFile] = useState(null);
    const [rightFile, setRightFile] = useState(null);

    const leftInputRef = useRef(null);
    const rightInputRef = useRef(null);
    const leftCanvasRef = useRef(null);
    const rightCanvasRef = useRef(null);

    const handleImageSelect = (side, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (side === 'left') {
                setLeftImage(reader.result);
                setLeftFile(file);
                setLeftResults(null);
            } else {
                setRightImage(reader.result);
                setRightFile(file);
                setRightResults(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const detectImage = async (side) => {
        const file = side === 'left' ? leftFile : rightFile;
        const setLoading = side === 'left' ? setLeftLoading : setRightLoading;
        const setResults = side === 'left' ? setLeftResults : setRightResults;

        if (!file) {
            toast.error(`Please select ${side} image first`);
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post('http://localhost:8000/detect', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResults({
                detections: response.data.detections,
                image: `data:image/jpeg;base64,${response.data.image}`
            });

            toast.success(`${side.charAt(0).toUpperCase() + side.slice(1)} image analyzed!`);
        } catch (error) {
            console.error(`Error detecting ${side}:`, error);
            toast.error(`Failed to analyze ${side} image`);
        } finally {
            setLoading(false);
        }
    };

    const detectBoth = async () => {
        if (!leftFile || !rightFile) {
            toast.error('Please select both images first');
            return;
        }
        await Promise.all([detectImage('left'), detectImage('right')]);
    };

    // Draw results on canvas
    const drawResults = (canvasRef, image, detections) => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            detections.forEach((det, index) => {
                const [x_min, y_min, x_max, y_max] = det.box;
                const colors = ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12'];
                const color = colors[index % colors.length];

                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);

                const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
                ctx.font = 'bold 14px Poppins';
                const textWidth = ctx.measureText(label).width;

                ctx.fillStyle = color;
                ctx.fillRect(x_min, y_min - 25, textWidth + 10, 22);
                ctx.fillStyle = 'white';
                ctx.fillText(label, x_min + 5, y_min - 8);
            });
        };
        img.src = image;
    };

    useEffect(() => {
        if (leftResults) {
            drawResults(leftCanvasRef, leftResults.image, leftResults.detections);
        }
    }, [leftResults]);

    useEffect(() => {
        if (rightResults) {
            drawResults(rightCanvasRef, rightResults.image, rightResults.detections);
        }
    }, [rightResults]);

    const clearAll = () => {
        setLeftImage(null);
        setRightImage(null);
        setLeftResults(null);
        setRightResults(null);
        setLeftFile(null);
        setRightFile(null);
        if (leftInputRef.current) leftInputRef.current.value = '';
        if (rightInputRef.current) rightInputRef.current.value = '';
    };

    const getComparison = () => {
        if (!leftResults || !rightResults) return null;

        const leftCount = leftResults.detections.length;
        const rightCount = rightResults.detections.length;
        const leftLabels = new Set(leftResults.detections.map(d => d.label));
        const rightLabels = new Set(rightResults.detections.map(d => d.label));

        const commonLabels = [...leftLabels].filter(l => rightLabels.has(l));
        const onlyLeft = [...leftLabels].filter(l => !rightLabels.has(l));
        const onlyRight = [...rightLabels].filter(l => !leftLabels.has(l));

        return { leftCount, rightCount, commonLabels, onlyLeft, onlyRight };
    };

    const comparison = getComparison();

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        🔀 Comparison Mode
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Compare detection results side-by-side
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Comparison Grid */}
                    <Row className="g-4 mb-4">
                        {/* Left Image */}
                        <Col md={6}>
                            <Card className="shadow-lg h-100">
                                <Card.Header className="bg-primary text-white">
                                    <h5 className="mb-0">📷 Image A</h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <input
                                        ref={leftInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageSelect('left', e)}
                                        style={{ display: 'none' }}
                                    />

                                    <div
                                        className="compare-upload-area mb-3"
                                        onClick={() => leftInputRef.current?.click()}
                                    >
                                        {leftResults ? (
                                            <canvas ref={leftCanvasRef} className="compare-canvas" />
                                        ) : leftImage ? (
                                            <img src={leftImage} alt="Left" className="compare-preview" />
                                        ) : (
                                            <div className="compare-placeholder">
                                                <div style={{ fontSize: '2rem' }}>📤</div>
                                                <p>Click to upload</p>
                                            </div>
                                        )}
                                    </div>

                                    {leftResults && (
                                        <div className="detection-summary mb-3">
                                            <Badge bg="success" className="me-2">
                                                {leftResults.detections.length} objects
                                            </Badge>
                                            {[...new Set(leftResults.detections.map(d => d.label))].map((label, i) => (
                                                <Badge key={i} bg="secondary" className="me-1">
                                                    {label}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        variant="primary"
                                        onClick={() => detectImage('left')}
                                        disabled={!leftFile || leftLoading}
                                        className="w-100"
                                    >
                                        {leftLoading ? (
                                            <><Spinner size="sm" className="me-2" /> Analyzing...</>
                                        ) : (
                                            '🔍 Analyze Image A'
                                        )}
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Right Image */}
                        <Col md={6}>
                            <Card className="shadow-lg h-100">
                                <Card.Header className="bg-info text-white">
                                    <h5 className="mb-0">📷 Image B</h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <input
                                        ref={rightInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageSelect('right', e)}
                                        style={{ display: 'none' }}
                                    />

                                    <div
                                        className="compare-upload-area mb-3"
                                        onClick={() => rightInputRef.current?.click()}
                                    >
                                        {rightResults ? (
                                            <canvas ref={rightCanvasRef} className="compare-canvas" />
                                        ) : rightImage ? (
                                            <img src={rightImage} alt="Right" className="compare-preview" />
                                        ) : (
                                            <div className="compare-placeholder">
                                                <div style={{ fontSize: '2rem' }}>📤</div>
                                                <p>Click to upload</p>
                                            </div>
                                        )}
                                    </div>

                                    {rightResults && (
                                        <div className="detection-summary mb-3">
                                            <Badge bg="success" className="me-2">
                                                {rightResults.detections.length} objects
                                            </Badge>
                                            {[...new Set(rightResults.detections.map(d => d.label))].map((label, i) => (
                                                <Badge key={i} bg="secondary" className="me-1">
                                                    {label}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        variant="info"
                                        onClick={() => detectImage('right')}
                                        disabled={!rightFile || rightLoading}
                                        className="w-100 text-white"
                                    >
                                        {rightLoading ? (
                                            <><Spinner size="sm" className="me-2" /> Analyzing...</>
                                        ) : (
                                            '🔍 Analyze Image B'
                                        )}
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="text-center mb-4">
                        <Button
                            variant="success"
                            size="lg"
                            onClick={detectBoth}
                            disabled={!leftFile || !rightFile || leftLoading || rightLoading}
                            className="me-3 ripple-button"
                        >
                            🔄 Analyze Both
                        </Button>
                        <Button
                            variant="outline-danger"
                            size="lg"
                            onClick={clearAll}
                        >
                            🗑️ Clear All
                        </Button>
                    </div>

                    {/* Comparison Results */}
                    {comparison && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="shadow-lg">
                                <Card.Header className="bg-success text-white">
                                    <h5 className="mb-0">📊 Comparison Results</h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <Row className="text-center mb-4">
                                        <Col md={4}>
                                            <div className="compare-stat bg-primary-subtle p-3 rounded">
                                                <h3 className="text-primary">{comparison.leftCount}</h3>
                                                <small>Objects in Image A</small>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="compare-stat bg-success-subtle p-3 rounded">
                                                <h3 className="text-success">{comparison.commonLabels.length}</h3>
                                                <small>Common Object Types</small>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="compare-stat bg-info-subtle p-3 rounded">
                                                <h3 className="text-info">{comparison.rightCount}</h3>
                                                <small>Objects in Image B</small>
                                            </div>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col md={4}>
                                            <h6>🔵 Only in Image A:</h6>
                                            {comparison.onlyLeft.length > 0 ? (
                                                comparison.onlyLeft.map((label, i) => (
                                                    <Badge key={i} bg="primary" className="me-1 mb-1">{label}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted">None</span>
                                            )}
                                        </Col>
                                        <Col md={4}>
                                            <h6>🟢 In Both:</h6>
                                            {comparison.commonLabels.length > 0 ? (
                                                comparison.commonLabels.map((label, i) => (
                                                    <Badge key={i} bg="success" className="me-1 mb-1">{label}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted">None</span>
                                            )}
                                        </Col>
                                        <Col md={4}>
                                            <h6>🔷 Only in Image B:</h6>
                                            {comparison.onlyRight.length > 0 ? (
                                                comparison.onlyRight.map((label, i) => (
                                                    <Badge key={i} bg="info" className="me-1 mb-1">{label}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted">None</span>
                                            )}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    )}

                    {/* Navigation */}
                    <div className="text-center mt-4">
                        <Button as={Link} to="/detect" variant="outline-primary" className="me-2">
                            📸 Single Image
                        </Button>
                        <Button as={Link} to="/live" variant="outline-success" className="me-2">
                            🎬 Live Mode
                        </Button>
                        <Button as={Link} to="/batch" variant="outline-warning">
                            📁 Batch Processing
                        </Button>
                    </div>
                </motion.div>
            </Container>
        </>
    );
};

export default CompareMode;
