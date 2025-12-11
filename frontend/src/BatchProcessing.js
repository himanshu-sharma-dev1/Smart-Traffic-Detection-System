import React, { useState, useRef } from 'react';
import { Container, Row, Col, Button, Card, Alert, Badge, Spinner, ProgressBar, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const BatchProcessing = () => {
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 10) {
            toast.warning('Maximum 10 files allowed. Using first 10.');
            selectedFiles.splice(10);
        }

        const validFiles = selectedFiles.filter(file =>
            file.type.startsWith('image/')
        );

        if (validFiles.length < selectedFiles.length) {
            toast.warning('Some files were not images and were excluded.');
        }

        setFiles(validFiles);
        setResults([]);
        setProgress(0);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const processAllImages = async () => {
        if (files.length === 0) {
            toast.error('Please select files first');
            return;
        }

        setProcessing(true);
        setResults([]);
        setProgress(0);

        const newResults = [];

        for (let i = 0; i < files.length; i++) {
            setCurrentIndex(i);

            try {
                const formData = new FormData();
                formData.append('file', files[i]);

                const response = await axios.post('http://localhost:8000/detect', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                newResults.push({
                    fileName: files[i].name,
                    status: 'success',
                    detections: response.data.detections,
                    image: `data:image/jpeg;base64,${response.data.image}`,
                    objectCount: response.data.detections.length
                });

            } catch (error) {
                console.error(`Error processing ${files[i].name}:`, error);
                newResults.push({
                    fileName: files[i].name,
                    status: 'error',
                    error: error.message,
                    detections: [],
                    objectCount: 0
                });
            }

            setProgress(Math.round(((i + 1) / files.length) * 100));
            setResults([...newResults]);
        }

        setProcessing(false);
        toast.success(`🎉 Batch processing complete! ${newResults.filter(r => r.status === 'success').length}/${files.length} successful`);
    };

    const clearAll = () => {
        setFiles([]);
        setResults([]);
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const totalObjects = results.reduce((sum, r) => sum + r.objectCount, 0);
    const successCount = results.filter(r => r.status === 'success').length;

    return (
        <>
            {/* Mini Hero */}
            <div className="mini-hero">
                <Container>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        📁 Batch Processing
                    </motion.h1>
                    <motion.p
                        className="lead mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Process multiple images at once
                    </motion.p>
                </Container>
            </div>

            <Container className="my-5">
                <Row className="justify-content-center">
                    <Col lg={10}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="shadow-lg mb-4">
                                <Card.Body className="p-4">
                                    {/* File Upload Area */}
                                    <div
                                        className="batch-upload-area mb-4"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <div style={{ fontSize: '3rem' }}>📂</div>
                                        <h5>Click to select multiple images</h5>
                                        <p className="text-muted mb-0">
                                            Up to 10 images • JPG, PNG, WebP supported
                                        </p>
                                    </div>

                                    {/* Selected Files */}
                                    {files.length > 0 && (
                                        <div className="mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h5 className="mb-0">
                                                    <Badge bg="primary" className="me-2">{files.length}</Badge>
                                                    Files Selected
                                                </h5>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={clearAll}
                                                    disabled={processing}
                                                >
                                                    Clear All
                                                </Button>
                                            </div>

                                            <div className="batch-file-list">
                                                {files.map((file, index) => (
                                                    <div key={index} className="batch-file-item">
                                                        <span>📄 {file.name}</span>
                                                        <span className="text-muted">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                        {!processing && (
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="text-danger p-0"
                                                                onClick={() => removeFile(index)}
                                                            >
                                                                ✕
                                                            </Button>
                                                        )}
                                                        {processing && currentIndex === index && (
                                                            <Spinner size="sm" variant="primary" />
                                                        )}
                                                        {results[index] && (
                                                            <Badge bg={results[index].status === 'success' ? 'success' : 'danger'}>
                                                                {results[index].status === 'success'
                                                                    ? `${results[index].objectCount} objects`
                                                                    : 'Failed'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    {processing && (
                                        <div className="mb-4">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Processing {currentIndex + 1} of {files.length}...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <ProgressBar
                                                now={progress}
                                                animated
                                                striped
                                                variant="success"
                                            />
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="d-flex justify-content-center gap-3">
                                        <Button
                                            variant="success"
                                            size="lg"
                                            onClick={processAllImages}
                                            disabled={files.length === 0 || processing}
                                            className="ripple-button"
                                        >
                                            {processing ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                '🚀 Process All Images'
                                            )}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Results Summary */}
                            {results.length > 0 && !processing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Card className="shadow-lg mb-4">
                                        <Card.Body className="p-4">
                                            <h4 className="mb-4">📊 Results Summary</h4>

                                            {/* Stats */}
                                            <Row className="mb-4 text-center">
                                                <Col md={4}>
                                                    <div className="batch-stat">
                                                        <h2 className="text-success">{successCount}</h2>
                                                        <small className="text-muted">Successful</small>
                                                    </div>
                                                </Col>
                                                <Col md={4}>
                                                    <div className="batch-stat">
                                                        <h2 className="text-primary">{totalObjects}</h2>
                                                        <small className="text-muted">Total Objects</small>
                                                    </div>
                                                </Col>
                                                <Col md={4}>
                                                    <div className="batch-stat">
                                                        <h2 className="text-danger">{files.length - successCount}</h2>
                                                        <small className="text-muted">Failed</small>
                                                    </div>
                                                </Col>
                                            </Row>

                                            {/* Results Table */}
                                            <Table responsive hover className="batch-results-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Preview</th>
                                                        <th>File Name</th>
                                                        <th>Objects</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <AnimatePresence>
                                                        {results.map((result, index) => (
                                                            <motion.tr
                                                                key={index}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                            >
                                                                <td>{index + 1}</td>
                                                                <td>
                                                                    {result.image && (
                                                                        <img
                                                                            src={result.image}
                                                                            alt={result.fileName}
                                                                            className="batch-thumbnail"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td>{result.fileName}</td>
                                                                <td>
                                                                    {result.detections.length > 0 ? (
                                                                        <div className="d-flex flex-wrap gap-1">
                                                                            {[...new Set(result.detections.map(d => d.label))].map((label, i) => (
                                                                                <Badge key={i} bg="secondary" className="small">
                                                                                    {label}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted">None</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <Badge bg={result.status === 'success' ? 'success' : 'danger'}>
                                                                        {result.status === 'success' ? '✓ Success' : '✕ Failed'}
                                                                    </Badge>
                                                                </td>
                                                            </motion.tr>
                                                        ))}
                                                    </AnimatePresence>
                                                </tbody>
                                            </Table>
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
                                <Button as={Link} to="/compare" variant="outline-info">
                                    🔀 Compare Mode
                                </Button>
                            </div>
                        </motion.div>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default BatchProcessing;
