import React from 'react';
import { Button, Badge } from 'react-bootstrap';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * PWA Install Button Component
 * Shows install button when app is installable
 */
const PWAInstallButton = ({ className = '' }) => {
    const { isInstallable, isInstalled, installApp } = usePWAInstall();

    if (isInstalled) {
        return (
            <Badge bg="success" className={`pwa-badge ${className}`}>
                ✓ Installed
            </Badge>
        );
    }

    if (!isInstallable) {
        return null;
    }

    return (
        <Button
            variant="outline-primary"
            size="sm"
            onClick={installApp}
            className={`pwa-install-btn ${className}`}
        >
            📲 Install App
        </Button>
    );
};

export default PWAInstallButton;
