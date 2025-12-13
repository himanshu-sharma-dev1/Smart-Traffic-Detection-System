/**
 * DetectionErrorBoundary - Specialized Error Boundary for Detection Components
 * 
 * Handles errors specific to ML model loading, camera access, and detection
 * with more contextual error messages and recovery options.
 */

import React, { Component } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

class DetectionErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            errorType: null,
            error: null
        };
    }

    static getDerivedStateFromError(error) {
        // Determine error type for better messaging
        let errorType = 'unknown';
        const errorMessage = error.message?.toLowerCase() || '';

        if (errorMessage.includes('camera') || errorMessage.includes('mediadevices')) {
            errorType = 'camera';
        } else if (errorMessage.includes('model') || errorMessage.includes('tensorflow')) {
            errorType = 'model';
        } else if (errorMessage.includes('canvas') || errorMessage.includes('webgl')) {
            errorType = 'webgl';
        }

        return { hasError: true, errorType };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error });
        console.error('DetectionErrorBoundary caught:', error);
    }

    handleRetry = () => {
        this.setState({ hasError: false, errorType: null, error: null });
        // Call parent's retry handler if provided
        if (this.props.onRetry) {
            this.props.onRetry();
        }
    };

    getErrorContent() {
        switch (this.state.errorType) {
            case 'camera':
                return {
                    icon: '📷',
                    title: 'Camera Access Error',
                    message: 'Unable to access your camera. Please check permissions and try again.',
                    action: 'Grant Camera Access'
                };
            case 'model':
                return {
                    icon: '🧠',
                    title: 'Model Loading Error',
                    message: 'The AI model failed to load. This might be due to network issues.',
                    action: 'Reload Model'
                };
            case 'webgl':
                return {
                    icon: '🖥️',
                    title: 'Graphics Error',
                    message: 'WebGL is not supported or has crashed. Try using a different browser.',
                    action: 'Retry'
                };
            default:
                return {
                    icon: '⚠️',
                    title: 'Detection Error',
                    message: 'An error occurred during detection. Please try again.',
                    action: 'Retry Detection'
                };
        }
    }

    render() {
        if (this.state.hasError) {
            const content = this.getErrorContent();

            return (
                <Card className="text-center p-4 m-3">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>
                        {content.icon}
                    </div>
                    <Alert variant="warning" className="mb-3">
                        <Alert.Heading>{content.title}</Alert.Heading>
                        <p className="mb-0">{content.message}</p>
                    </Alert>
                    <div className="d-flex justify-content-center gap-2">
                        <Button
                            variant="primary"
                            onClick={this.handleRetry}
                        >
                            🔄 {content.action}
                        </Button>
                        <Button
                            variant="outline-secondary"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </Button>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-3 text-start">
                            <small className="text-muted">
                                Debug: {this.state.error.toString()}
                            </small>
                        </div>
                    )}
                </Card>
            );
        }

        return this.props.children;
    }
}

export default DetectionErrorBoundary;
