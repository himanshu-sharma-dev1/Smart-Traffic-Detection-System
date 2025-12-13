/**
 * DetectionTimeline - Visual history of detections
 * 
 * Shows a scrollable list of recent detection events with:
 * - Timestamp
 * - Object type and count
 * - Confidence score
 * - Click to highlight in video
 */

import React, { useRef, useEffect } from 'react';

const DetectionTimeline = ({ events, onEventClick, maxEvents = 50 }) => {
    const timelineRef = useRef(null);

    // Auto-scroll to bottom when new events added
    useEffect(() => {
        if (timelineRef.current) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
        }
    }, [events]);

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getObjectColor = (type) => {
        const colors = {
            'person': '#FF6B6B',
            'car': '#4ECDC4',
            'truck': '#45B7D1',
            'bus': '#96CEB4',
            'motorcycle': '#FFEAA7',
            'bicycle': '#DDA0DD',
            'dog': '#F8B500',
            'cat': '#FF8C00',
            'default': '#95A5A6'
        };
        return colors[type?.toLowerCase()] || colors.default;
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return '#27AE60';
        if (confidence >= 60) return '#F39C12';
        return '#E74C3C';
    };

    // Group events by type for summary
    const getEventSummary = (detections) => {
        const counts = {};
        detections.forEach(d => {
            const type = d.type || d.class || 'object';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');
    };

    if (!events || events.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.icon}>📋</span>
                    <span style={styles.title}>Detection Timeline</span>
                </div>
                <div style={styles.empty}>
                    <p>No detections yet</p>
                    <p style={styles.hint}>Start detection to see events here</p>
                </div>
            </div>
        );
    }

    // Take only the most recent events
    const recentEvents = events.slice(-maxEvents);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>📋</span>
                <span style={styles.title}>Detection Timeline</span>
                <span style={styles.count}>{events.length} events</span>
            </div>

            <div style={styles.timeline} ref={timelineRef}>
                {recentEvents.map((event, index) => (
                    <div
                        key={event.id || index}
                        style={styles.event}
                        onClick={() => onEventClick && onEventClick(event)}
                    >
                        <div style={styles.eventTime}>
                            {formatTime(event.timestamp)}
                        </div>

                        <div style={styles.eventDot}>
                            <div style={{
                                ...styles.dot,
                                backgroundColor: getObjectColor(event.detections?.[0]?.type)
                            }} />
                            {index < recentEvents.length - 1 && (
                                <div style={styles.line} />
                            )}
                        </div>

                        <div style={styles.eventContent}>
                            <div style={styles.eventTitle}>
                                {event.detections?.length || 0} object{event.detections?.length !== 1 ? 's' : ''} detected
                            </div>
                            <div style={styles.eventSummary}>
                                {getEventSummary(event.detections || [])}
                            </div>
                            {event.detections?.[0]?.confidence && (
                                <div style={styles.confidence}>
                                    <span style={{
                                        ...styles.confidenceBadge,
                                        backgroundColor: getConfidenceColor(event.detections[0].confidence)
                                    }}>
                                        {Math.round(event.detections[0].confidence)}% conf
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: 'rgba(30, 30, 40, 0.95)',
        borderRadius: '12px',
        padding: '0',
        height: '300px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    icon: {
        fontSize: '18px',
    },
    title: {
        color: '#fff',
        fontWeight: '600',
        fontSize: '14px',
        flex: 1,
    },
    count: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '12px',
    },
    timeline: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
    },
    event: {
        display: 'flex',
        gap: '12px',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '8px',
        transition: 'background-color 0.2s',
        marginBottom: '4px',
    },
    eventTime: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '11px',
        width: '70px',
        flexShrink: 0,
        paddingTop: '2px',
    },
    eventDot: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '20px',
    },
    dot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    line: {
        width: '2px',
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: '4px',
        minHeight: '20px',
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        color: '#fff',
        fontSize: '13px',
        fontWeight: '500',
    },
    eventSummary: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        marginTop: '2px',
    },
    confidence: {
        marginTop: '4px',
    },
    confidenceBadge: {
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        color: '#fff',
        fontWeight: '500',
    },
    empty: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '14px',
    },
    hint: {
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.3)',
        marginTop: '4px',
    },
};

export default DetectionTimeline;
