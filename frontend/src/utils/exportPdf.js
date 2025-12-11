/**
 * PDF Export Utility
 * Uses jspdf for client-side PDF generation
 */

/**
 * Export detection history to PDF
 * @param {Array} detections - Array of detection objects
 */
export const exportHistoryToPdf = async (detections) => {
    // Dynamically import jspdf to reduce bundle size
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Colors
    const primaryColor = [52, 152, 219];  // Blue
    const secondaryColor = [46, 204, 113]; // Green
    const darkColor = [44, 62, 80];        // Dark gray
    const lightGray = [245, 245, 245];

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo and Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('Smart Traffic Detection', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Detection History Report', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 40, { align: 'center' });

    // Summary stats boxes
    const totalObjects = detections.reduce((sum, d) => sum + (d.object_count || 0), 0);
    const avgConfidence = detections.length > 0
        ? (detections.reduce((sum, d) => sum + (d.avg_confidence || 0), 0) / detections.length * 100).toFixed(1)
        : 0;

    let y = 55;
    const boxWidth = 55;
    const boxHeight = 20;

    // Stat box 1
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, y, boxWidth, boxHeight, 3, 3, 'F');
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.text('Total Detections', 15 + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${detections.length}`, 15 + boxWidth / 2, y + 16, { align: 'center' });

    // Stat box 2
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(75, y, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...darkColor);
    doc.text('Total Objects', 75 + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text(`${totalObjects}`, 75 + boxWidth / 2, y + 16, { align: 'center' });

    // Stat box 3
    doc.setFillColor(255, 248, 240);
    doc.roundedRect(135, y, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...darkColor);
    doc.text('Avg Confidence', 135 + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text(`${avgConfidence}%`, 135 + boxWidth / 2, y + 16, { align: 'center' });

    // Table header - with more spacing after stat boxes
    y = 95;
    doc.setFillColor(...primaryColor);
    doc.rect(15, y, pageWidth - 30, 12, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 20, y + 8);
    doc.text('Date', 40, y + 8);
    doc.text('Source', 80, y + 8);
    doc.text('Objects', 110, y + 8);
    doc.text('Confidence', 140, y + 8);
    doc.text('Top Detection', 170, y + 8);

    // Table rows - start after header with proper spacing
    doc.setFont(undefined, 'normal');
    y += 16;
    detections.forEach((detection, index) => {
        if (y > 270) {
            doc.addPage();
            // Repeat header on new page
            doc.setFillColor(...primaryColor);
            doc.rect(15, 10, pageWidth - 30, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('#', 20, 18);
            doc.text('Date', 40, 18);
            doc.text('Source', 80, 18);
            doc.text('Objects', 110, 18);
            doc.text('Confidence', 140, 18);
            doc.text('Top Detection', 170, 18);
            doc.setFont(undefined, 'normal');
            y = 28;
        }

        // Alternating row colors
        if (index % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(15, y - 5, pageWidth - 30, 10, 'F');
        }

        const topLabel = detection.detections?.[0]?.label || '-';
        const confidence = ((detection.avg_confidence || 0) * 100).toFixed(0) + '%';
        const date = new Date(detection.created_at).toLocaleDateString();

        doc.setTextColor(...darkColor);
        doc.setFontSize(9);
        doc.text(`${index + 1}`, 20, y);
        doc.text(date, 40, y);
        doc.text(detection.source || 'upload', 80, y);
        doc.text(`${detection.object_count || 0}`, 110, y);
        doc.text(confidence, 140, y);
        doc.text(topLabel.substring(0, 12), 170, y);

        y += 10;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...darkColor);
        doc.rect(0, 285, pageWidth, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(
            `Page ${i} of ${pageCount}  |  Smart Traffic Detection System  |  ${new Date().toLocaleDateString()}`,
            pageWidth / 2,
            292,
            { align: 'center' }
        );
    }

    // Save
    doc.save(`detection-history-${Date.now()}.pdf`);
};

/**
 * Export dashboard analytics to PDF
 * @param {Object} stats - Dashboard statistics
 * @param {HTMLElement} chartContainer - Optional chart container to capture
 */
export const exportDashboardToPdf = async (stats, chartContainer = null) => {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(52, 152, 219);
    doc.text('📊 Analytics Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    // Stats summary
    let y = 50;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary Statistics', 20, y);

    y += 15;
    doc.setFontSize(11);

    const statItems = [
        { label: 'Total Detections', value: stats.totalDetections || 0 },
        { label: 'Total Objects Found', value: stats.totalObjects || 0 },
        { label: 'Average Confidence', value: `${stats.avgConfidence || 0}%` },
        { label: 'Most Common Object', value: stats.topObject || '-' },
        { label: 'Detection Sessions', value: stats.sessionsCount || 0 }
    ];

    statItems.forEach(item => {
        doc.setFont(undefined, 'bold');
        doc.text(`${item.label}:`, 25, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${item.value}`, 90, y);
        y += 10;
    });

    // If chart container provided, try to capture it
    if (chartContainer) {
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartContainer, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            y += 10;
            doc.addImage(imgData, 'PNG', 20, y, 170, 100);
        } catch (error) {
            console.warn('Could not capture chart:', error);
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
        'Smart Traffic Detection System | Analytics Report',
        pageWidth / 2,
        290,
        { align: 'center' }
    );

    doc.save(`analytics-report-${Date.now()}.pdf`);
};

export default { exportHistoryToPdf, exportDashboardToPdf };
