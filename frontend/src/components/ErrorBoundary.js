/**
 * ErrorBoundary - Generic Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI.
 */

import React, { Component } from 'react';
import { Alert, Button, Container, Card } from 'react-bootstrap';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (could also send to error reporting service)
        this.setState({ error, errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // TODO: Send to error monitoring service like Sentry
        // if (window.Sentry) {
        //     window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Container className="py-5">
                    <Card className="text-center shadow-sm">
                        <Card.Body className="p-5">
                            <div className="mb-4">
                                <span style={{ fontSize: '4rem' }}>😵</span>
                            </div>
                            <Alert variant="danger" className="mb-4">
                                <Alert.Heading>
                                    {this.props.title || 'Oops! Something went wrong'}
                                </Alert.Heading>
                                <p className="mb-0">
                                    {this.props.message ||
                                        'An unexpected error occurred. Please try again.'}
                                </p>
                            </Alert>

                            <div className="d-flex justify-content-center gap-3">
                                <Button
                                    variant="outline-primary"
                                    onClick={this.handleRetry}
                                >
                                    🔄 Try Again
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={this.handleReload}
                                >
                                    🔃 Reload Page
                                </Button>
                            </div>

                            {/* Show error details in development mode */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-4 text-start">
                                    <summary className="text-muted cursor-pointer">
                                        🔧 Developer Details (click to expand)
                                    </summary>
                                    <pre
                                        className="mt-3 p-3 bg-dark text-light rounded overflow-auto"
                                        style={{ fontSize: '0.8rem', maxHeight: '300px' }}
                                    >
                                        <strong>Error:</strong> {this.state.error.toString()}
                                        {'\n\n'}
                                        <strong>Component Stack:</strong>
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
