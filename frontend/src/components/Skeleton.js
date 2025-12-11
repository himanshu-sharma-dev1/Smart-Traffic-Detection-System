import React from 'react';

/**
 * Reusable Skeleton Loading Components
 * Usage: <Skeleton type="text" /> or <Skeleton type="card" />
 */

// Basic skeleton line
export const SkeletonLine = ({ width = '100%', height = '1rem', className = '' }) => (
    <div
        className={`skeleton ${className}`}
        style={{ width, height }}
    />
);

// Skeleton text block (multiple lines)
export const SkeletonText = ({ lines = 3, className = '' }) => (
    <div className={className}>
        {[...Array(lines)].map((_, i) => (
            <SkeletonLine
                key={i}
                width={i === lines - 1 ? '60%' : '100%'}
                className="skeleton-text"
            />
        ))}
    </div>
);

// Skeleton title
export const SkeletonTitle = ({ width = '60%', className = '' }) => (
    <div
        className={`skeleton skeleton-title ${className}`}
        style={{ width }}
    />
);

// Skeleton circle (for avatars)
export const SkeletonCircle = ({ size = 60, className = '' }) => (
    <div
        className={`skeleton ${className}`}
        style={{
            width: size,
            height: size,
            borderRadius: '50%'
        }}
    />
);

// Skeleton card
export const SkeletonCard = ({ height = 150, className = '' }) => (
    <div
        className={`skeleton skeleton-card ${className}`}
        style={{ height }}
    />
);

// Skeleton image
export const SkeletonImage = ({ height = 200, className = '' }) => (
    <div
        className={`skeleton skeleton-image ${className}`}
        style={{ height }}
    />
);

// Skeleton table row
export const SkeletonTableRow = ({ columns = 4, className = '' }) => (
    <tr className={className}>
        {[...Array(columns)].map((_, i) => (
            <td key={i}>
                <SkeletonLine width={i === 0 ? '80%' : '60%'} />
            </td>
        ))}
    </tr>
);

// Skeleton stat card (for dashboards)
export const SkeletonStatCard = ({ className = '' }) => (
    <div className={`card stat-card-profile ${className}`}>
        <div className="card-body text-center p-3">
            <SkeletonCircle size={50} className="mx-auto mb-3" />
            <SkeletonLine width="40%" height="1.5rem" className="mx-auto mb-2" />
            <SkeletonLine width="60%" height="0.8rem" className="mx-auto" />
        </div>
    </div>
);

// Skeleton detection card
export const SkeletonDetectionCard = ({ className = '' }) => (
    <div className={`card ${className}`}>
        <div className="card-body d-flex align-items-center">
            <SkeletonImage height={80} className="me-3" style={{ width: 100 }} />
            <div className="flex-grow-1">
                <SkeletonTitle width="40%" />
                <SkeletonLine width="60%" height="0.8rem" />
                <SkeletonLine width="30%" height="0.8rem" />
            </div>
        </div>
    </div>
);

// Composite skeleton for profile page
export const SkeletonProfile = () => (
    <div className="row g-4">
        <div className="col-lg-4">
            <div className="card p-4 text-center">
                <SkeletonCircle size={100} className="mx-auto mb-3" />
                <SkeletonTitle width="50%" className="mx-auto" />
                <SkeletonLine width="70%" className="mx-auto mb-3" />
                <SkeletonLine width="80%" height="2rem" className="mx-auto" />
            </div>
        </div>
        <div className="col-lg-8">
            <div className="row g-3 mb-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="col-sm-6 col-md-3">
                        <SkeletonStatCard />
                    </div>
                ))}
            </div>
            <SkeletonCard height={100} className="mb-3" />
            <SkeletonCard height={80} />
        </div>
    </div>
);

// Composite skeleton for history page
export const SkeletonHistory = ({ count = 5 }) => (
    <div>
        {[...Array(count)].map((_, i) => (
            <SkeletonDetectionCard key={i} className="mb-3" />
        ))}
    </div>
);

// Composite skeleton for dashboard
export const SkeletonDashboard = () => (
    <div>
        <div className="row g-3 mb-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="col-sm-6 col-md-3">
                    <SkeletonStatCard />
                </div>
            ))}
        </div>
        <div className="row g-4">
            <div className="col-md-6">
                <SkeletonCard height={300} />
            </div>
            <div className="col-md-6">
                <SkeletonCard height={300} />
            </div>
        </div>
    </div>
);

export default {
    Line: SkeletonLine,
    Text: SkeletonText,
    Title: SkeletonTitle,
    Circle: SkeletonCircle,
    Card: SkeletonCard,
    Image: SkeletonImage,
    TableRow: SkeletonTableRow,
    StatCard: SkeletonStatCard,
    DetectionCard: SkeletonDetectionCard,
    Profile: SkeletonProfile,
    History: SkeletonHistory,
    Dashboard: SkeletonDashboard
};
