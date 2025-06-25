/**
 * Export functionality
 * Handles exporting drawings and projects in various formats
 */

/**
 * Export drawing as image
 */
ElectricalCADApp.prototype.exportAsImage = function() {
    try {
        const canvas = document.getElementById('drawingCanvas');
        const link = document.createElement('a');
        link.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showNotification('Image exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting image:', error);
        this.showNotification('Error exporting image', 'error');
    }
};

// Draw the title block on a canvas context
ElectricalCADApp.prototype._drawTitleBlockOnCanvas = function(targetCtx, canvasWidth, canvasHeight, titleBlockData) {
    // --- Configuration for Title Block ---
    const blockPadding = 10; // pixels
    let blockWidth = titleBlockData.titleBlockWidth || 450;
    let blockHeight = titleBlockData.titleBlockHeight || 200;
    blockWidth = Math.min(blockWidth, canvasWidth * 0.9);
    blockHeight = Math.min(blockHeight, canvasHeight * 0.5);
    const xPos = canvasWidth - blockWidth - blockPadding;
    const yPos = canvasHeight - blockHeight - blockPadding;

    targetCtx.save();
    targetCtx.strokeStyle = '#000000';
    targetCtx.fillStyle = '#000000';
    targetCtx.lineWidth = 1;

    // --- Proportional font sizes ---
    const headerFontSize = Math.max(8, Math.round(blockHeight * 0.09)); // ~9% of block height
    const drawingTitleFontSize = Math.max(7, Math.round(blockHeight * 0.07)); // ~7%
    const tableHeaderFontSize = Math.max(7, Math.round(blockHeight * 0.06));
    const tableFontSize = Math.max(6, Math.round(blockHeight * 0.055));
    const noGbrFontSize = Math.max(8, Math.round(blockHeight * 0.13));

    // Outer rectangle
    targetCtx.strokeRect(xPos, yPos, blockWidth, blockHeight);

    // --- Header Text (PT PLN etc.) ---
    let currentY = yPos + headerFontSize + 2;
    targetCtx.font = `bold ${headerFontSize}px Arial`;
    targetCtx.textAlign = "center";
    targetCtx.fillText(titleBlockData.companyName, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.1;
    targetCtx.fillText(titleBlockData.projectUnit, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.1;
    targetCtx.fillText(titleBlockData.province, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.3;

    // --- Drawing Title ---
    const drawingTitleBoxHeight = drawingTitleFontSize * 2;
    targetCtx.strokeRect(xPos, currentY - drawingTitleFontSize * 0.8, blockWidth, drawingTitleBoxHeight);
    targetCtx.font = `${drawingTitleFontSize}px Arial`;
    targetCtx.fillText(titleBlockData.drawingTitle, xPos + blockWidth / 2, currentY + drawingTitleFontSize * 0.5);
    currentY += drawingTitleBoxHeight + 5;

    // --- Table ---
    const tableStartY = currentY;
    const numRows = titleBlockData.rows.length;
    const noGbrColWidth = blockWidth * 0.15;
    const mainTableWidth = blockWidth - noGbrColWidth;
    const adjustedColWidths = [mainTableWidth * 0.28, mainTableWidth * 0.35, mainTableWidth * 0.15, mainTableWidth * 0.22];
    const tableHeaderHeight = tableHeaderFontSize * 2.1;
    const tableRowHeight = (blockHeight - (tableStartY - yPos) - tableHeaderHeight - blockPadding) / numRows;

    targetCtx.font = `bold ${tableHeaderFontSize}px Arial`;
    targetCtx.textAlign = "left";

    // Draw table headers
    let currentX = xPos;
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[0], tableHeaderHeight);
    currentX += adjustedColWidths[0];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[1], tableHeaderHeight); targetCtx.fillText("NAMA", currentX + 3, tableStartY + tableHeaderHeight * 0.7);
    currentX += adjustedColWidths[1];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[2], tableHeaderHeight); targetCtx.fillText("PARAF", currentX + 3, tableStartY + tableHeaderHeight * 0.7);
    currentX += adjustedColWidths[2];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[3], tableHeaderHeight); targetCtx.fillText("JABATAN", currentX + 3, tableStartY + tableHeaderHeight * 0.7);

    currentY = tableStartY + tableHeaderHeight;
    targetCtx.font = `${tableFontSize}px Arial`;

    // Draw table rows
    titleBlockData.rows.forEach(rowData => {
        currentX = xPos;
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[0], tableRowHeight); targetCtx.fillText(rowData.label, currentX + 3, currentY + tableRowHeight * 0.65);
        currentX += adjustedColWidths[0];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[1], tableRowHeight); targetCtx.fillText(rowData.nama, currentX + 3, currentY + tableRowHeight * 0.65);
        currentX += adjustedColWidths[1];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[2], tableRowHeight); targetCtx.fillText(rowData.paraf, currentX + 3, currentY + tableRowHeight * 0.65);
        currentX += adjustedColWidths[2];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[3], tableRowHeight); targetCtx.fillText(rowData.jabatan, currentX + 3, currentY + tableRowHeight * 0.65);
        currentY += tableRowHeight;
    });

    // --- Drawing Number (NO.GBR) ---
    const noGbrX = xPos + mainTableWidth;
    targetCtx.font = `bold ${tableHeaderFontSize}px Arial`;
    targetCtx.textAlign = "center";
    targetCtx.strokeRect(noGbrX, tableStartY, noGbrColWidth, tableHeaderHeight);
    targetCtx.fillText("NO.GBR", noGbrX + noGbrColWidth / 2, tableStartY + tableHeaderHeight * 0.7);

    targetCtx.font = `bold ${noGbrFontSize}px Arial`;
    const noGbrContentY = tableStartY + tableHeaderHeight;
    const noGbrContentHeight = blockHeight - (tableStartY - yPos) - tableHeaderHeight - blockPadding;
    targetCtx.strokeRect(noGbrX, noGbrContentY, noGbrColWidth, noGbrContentHeight);
    targetCtx.fillText(titleBlockData.drawingNumber, noGbrX + noGbrColWidth / 2, noGbrContentY + noGbrContentHeight / 2 + noGbrFontSize * 0.35);

    targetCtx.restore();
};

// Draw the title block on a jsPDF instance
ElectricalCADApp.prototype._drawTitleBlockOnPDF = function(pdf, pageHeight, pageWidth, titleBlockData) {
    // --- Configuration --- (using points for PDF units)
    const marginPt = 20; // Margin from page edge
    let blockWidthPt = titleBlockData.titleBlockWidth || 450;
    let blockHeightPt = titleBlockData.titleBlockHeight || 200;
    blockWidthPt = Math.min(blockWidthPt, pageWidth * 0.9);
    blockHeightPt = Math.min(blockHeightPt, pageHeight * 0.5);
    const xPosPt = pageWidth - blockWidthPt - marginPt;
    const yPosPt = pageHeight - blockHeightPt - marginPt;

    pdf.saveGraphicsState();
    pdf.setDrawColor(0); // Black
    pdf.setFillColor(0); // Black
    pdf.setLineWidth(0.5); // points

    // --- Proportional font sizes ---
    const headerFontSizePt = Math.max(8, Math.round(blockHeightPt * 0.09));
    const drawingTitleFontSizePt = Math.max(7, Math.round(blockHeightPt * 0.07));
    const tableHeaderFontSizePt = Math.max(7, Math.round(blockHeightPt * 0.06));
    const tableFontSizePt = Math.max(6, Math.round(blockHeightPt * 0.055));
    const noGbrFontSizePt = Math.max(8, Math.round(blockHeightPt * 0.13));

    // Outer rectangle
    pdf.rect(xPosPt, yPosPt, blockWidthPt, blockHeightPt, 'S');

    // --- Header Text ---
    let currentYPt = yPosPt + headerFontSizePt + 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(headerFontSizePt);
    pdf.text(titleBlockData.companyName, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.1;
    pdf.text(titleBlockData.projectUnit, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.1;
    pdf.text(titleBlockData.province, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.3;

    // --- Drawing Title ---
    const drawingTitleBoxHeightPt = drawingTitleFontSizePt * 2;
    pdf.rect(xPosPt, currentYPt - drawingTitleFontSizePt * 0.8, blockWidthPt, drawingTitleBoxHeightPt, 'S');
    pdf.setFontSize(drawingTitleFontSizePt);
    pdf.text(titleBlockData.drawingTitle, xPosPt + blockWidthPt / 2, currentYPt + drawingTitleFontSizePt * 0.5, { align: 'center' });
    currentYPt += drawingTitleBoxHeightPt + 5;

    // --- Table ---
    const tableStartYPt = currentYPt;
    const noGbrColWidthPt = blockWidthPt * 0.15;
    const mainTableWidthPt = blockWidthPt - noGbrColWidthPt;
    const colWidthsPt = [mainTableWidthPt * 0.28, mainTableWidthPt * 0.35, mainTableWidthPt * 0.15, mainTableWidthPt * 0.22];
    const tableHeaderHeightPt = tableHeaderFontSizePt * 2.1;
    const tableRowHeightPt = (blockHeightPt - (tableStartYPt - yPosPt) - tableHeaderHeightPt - 5) / titleBlockData.rows.length;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(tableHeaderFontSizePt);

    let currentXPt = xPosPt;
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[0], tableHeaderHeightPt, 'S');
    currentXPt += colWidthsPt[0];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[1], tableHeaderHeightPt, 'S'); pdf.text("NAMA", currentXPt + 3, tableStartYPt + tableHeaderHeightPt * 0.7);
    currentXPt += colWidthsPt[1];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[2], tableHeaderHeightPt, 'S'); pdf.text("PARAF", currentXPt + 3, tableStartYPt + tableHeaderHeightPt * 0.7);
    currentXPt += colWidthsPt[2];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[3], tableHeaderHeightPt, 'S'); pdf.text("JABATAN", currentXPt + 3, tableStartYPt + tableHeaderHeightPt * 0.7);

    currentYPt = tableStartYPt + tableHeaderHeightPt;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(tableFontSizePt);

    titleBlockData.rows.forEach(rowData => {
        currentXPt = xPosPt;
        pdf.rect(currentXPt, currentYPt, colWidthsPt[0], tableRowHeightPt, 'S'); pdf.text(rowData.label, currentXPt + 3, currentYPt + tableRowHeightPt * 0.65);
        currentXPt += colWidthsPt[0];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[1], tableRowHeightPt, 'S'); pdf.text(rowData.nama, currentXPt + 3, currentYPt + tableRowHeightPt * 0.65);
        currentXPt += colWidthsPt[1];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[2], tableRowHeightPt, 'S'); pdf.text(rowData.paraf, currentXPt + 3, currentYPt + tableRowHeightPt * 0.65);
        currentXPt += colWidthsPt[2];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[3], tableRowHeightPt, 'S'); pdf.text(rowData.jabatan, currentXPt + 3, currentYPt + tableRowHeightPt * 0.65);
        currentYPt += tableRowHeightPt;
    });

    // --- Drawing Number (NO.GBR) ---
    const noGbrXPt = xPosPt + mainTableWidthPt;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(tableHeaderFontSizePt);
    pdf.rect(noGbrXPt, tableStartYPt, noGbrColWidthPt, tableHeaderHeightPt, 'S');
    pdf.text("NO.GBR", noGbrXPt + noGbrColWidthPt / 2, tableStartYPt + tableHeaderHeightPt * 0.7, { align: 'center' });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(noGbrFontSizePt);
    const noGbrContentYPt = tableStartYPt + tableHeaderHeightPt;
    const noGbrContentHeightPt = blockHeightPt - (tableStartYPt - yPosPt) - tableHeaderHeightPt - 5;
    pdf.rect(noGbrXPt, noGbrContentYPt, noGbrColWidthPt, noGbrContentHeightPt, 'S');
    pdf.text(titleBlockData.drawingNumber, noGbrXPt + noGbrColWidthPt / 2, noGbrContentYPt + noGbrContentHeightPt / 2 + noGbrFontSizePt * 0.35, { align: 'center' });

    pdf.restoreGraphicsState();
};

// Export canvas as JPG with title block if enabled
ElectricalCADApp.prototype.exportCanvasAsJPG = async function() {
    try {
        const mainCanvas = this.drawingEngine.canvas;
        const legendElement = document.getElementById('legend');
        let legendImage = null;
        let legendWasCaptured = false;
        // Super-sampling factor for high quality
        const scaleFactor = 2;
        // Ensure at least Full HD
        const minW = 1920, minH = 1080;
        let exportWidth = Math.max(mainCanvas.width, minW) * scaleFactor;
        let exportHeight = Math.max(mainCanvas.height, minH) * scaleFactor;
        // Fit drawing to export area, preserve aspect ratio
        let drawW = exportWidth, drawH = exportHeight;
        const aspectCanvas = mainCanvas.width / mainCanvas.height;
        const aspectExport = exportWidth / exportHeight;
        if (aspectCanvas > aspectExport) {
            drawW = exportWidth;
            drawH = exportWidth / aspectCanvas;
        } else {
            drawH = exportHeight;
            drawW = exportHeight * aspectCanvas;
        }
        const offsetX = (exportWidth - drawW) / 2;
        const offsetY = (exportHeight - drawH) / 2;

        if (legendElement) {
            try {
                const legendCanvasCapture = await window.html2canvas(legendElement, {
                    backgroundColor: null, // For transparency
                    useCORS: true,
                    logging: false,
                    scale: scaleFactor
                });
                legendImage = new window.Image();
                legendImage.src = legendCanvasCapture.toDataURL();
                await new Promise(resolve => { legendImage.onload = resolve; legendImage.onerror = resolve; });
                legendWasCaptured = legendImage.complete && legendImage.naturalWidth > 0;
                if (legendWasCaptured) {
                    this.showNotification('Legend captured for export.', 'success');
                } else {
                    this.showNotification('Legend image not loaded, exporting without it.', 'warning');
                }
            } catch (e) {
                console.error("Error capturing legend with html2canvas for JPG:", e);
                this.showNotification('Could not capture legend, exporting without it.', 'warning');
                legendImage = null;
            }
        }

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.imageSmoothingEnabled = true;
        exportCtx.imageSmoothingQuality = 'high';
        exportCtx.fillStyle = '#FFFFFF';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        // Draw main content scaled to fit
        exportCtx.drawImage(mainCanvas, 0, 0, mainCanvas.width, mainCanvas.height, offsetX, offsetY, drawW, drawH);
        const titleBlockData = this.currentProject.titleBlockData;
        if (titleBlockData.includeInExport) {
            this._drawTitleBlockOnCanvas(exportCtx, exportWidth, exportHeight, titleBlockData);
        }
        if (legendImage && legendImage.complete && legendImage.naturalWidth > 0) {
            const mainCanvasRect = mainCanvas.getBoundingClientRect();
            const legendRect = legendElement.getBoundingClientRect();
            const legendRelX = (legendRect.left - mainCanvasRect.left) * (drawW / mainCanvas.width) + offsetX;
            const legendRelY = (legendRect.top - mainCanvasRect.top) * (drawH / mainCanvas.height) + offsetY;
            exportCtx.drawImage(legendImage, legendRelX, legendRelY, legendImage.width, legendImage.height);
            exportCtx.save();
            exportCtx.strokeStyle = 'black';
            exportCtx.lineWidth = 2 * scaleFactor;
            exportCtx.strokeRect(legendRelX, legendRelY, legendImage.width, legendImage.height);
            exportCtx.restore();
        }
        const dataUrl = exportCanvas.toDataURL('image/jpeg', 1.0);
        const link = document.createElement('a');
        link.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}_canvas.jpg`;
        link.href = dataUrl;
        link.click();
        this.showNotification('Canvas exported as JPG.', 'success');
    } catch (error) {
        console.error('Error exporting canvas as JPG:', error);
        this.showNotification('Error exporting canvas as JPG', 'error');
    }
};

// Export canvas as PDF with title block if enabled
ElectricalCADApp.prototype.exportCanvasAsPDF = async function() {
    if (!window.jspdf) {
        this.showNotification('jsPDF library not loaded.', 'error');
        return;
    }
    if (!window.html2canvas) {
        this.showNotification('html2canvas library not loaded.', 'error');
        return;
    }
    this.showNotification('Generating PDF... please wait.', 'info');
    try {
        const mainCanvas = this.drawingEngine.canvas;
        const legendElement = document.getElementById('legend');
        const { jsPDF } = window.jspdf;
        let legendImage = null;
        let legendImageDataUrl = null;
        let legendWasCaptured = false;

        if (legendElement) {
            try {
                const legendCanvasCapture = await window.html2canvas(legendElement, {
                    backgroundColor: null, // For transparency
                    useCORS: true,
                    logging: false
                });
                legendImage = new window.Image();
                legendImageDataUrl = legendCanvasCapture.toDataURL('image/png');
                legendImage.src = legendImageDataUrl;
                await new Promise(resolve => { legendImage.onload = resolve; legendImage.onerror = resolve; });
                legendWasCaptured = legendImage.complete && legendImage.naturalWidth > 0;
                if (legendWasCaptured) {
                    this.showNotification('Legend captured for export.', 'success');
                } else {
                    this.showNotification('Legend image not loaded, exporting without it.', 'warning');
                }
            } catch (e) {
                console.error("Error capturing legend with html2canvas for PDF:", e);
                this.showNotification('Could not capture legend, exporting without it.', 'warning');
                legendImage = null;
            }
        }

        // Determine PDF orientation and dimensions
        let pdfWidth, pdfHeight, orientation;
        if (mainCanvas.width > mainCanvas.height) { orientation = 'l'; pdfWidth = 841.89; pdfHeight = 595.28; } 
        else { orientation = 'p'; pdfWidth = 595.28; pdfHeight = 841.89; }

        const pdf = new jsPDF({ orientation: orientation, unit: 'pt', format: 'a4' });
        const margin = 20;
        let availableWidth = pdfWidth - 2 * margin;
        let availableHeight = pdfHeight - 2 * margin;

        // Check if title block should be included and adjust available space
        const titleBlockData = this.currentProject.titleBlockData;
        let titleBlockHeightPt = 0;
        if (titleBlockData.includeInExport) {
            titleBlockHeightPt = pdfHeight * 0.20; // From _drawTitleBlockOnPDF config
            availableHeight -= (titleBlockHeightPt + 10); // Reduce available height for drawing, +10 for spacing
        }

        // Use html2canvas to capture the main drawing
        const drawingCaptureCanvas = await window.html2canvas(mainCanvas, { backgroundColor: '#ffffff', useCORS: true, logging: false });
        const drawingImgData = drawingCaptureCanvas.toDataURL('image/png');

        let imgDisplayWidth, imgDisplayHeight;
        const canvasAspectRatio = mainCanvas.width / mainCanvas.height;
        const availableAspectRatio = availableWidth / availableHeight;

        if (canvasAspectRatio > availableAspectRatio) {
            imgDisplayWidth = availableWidth;
            imgDisplayHeight = imgDisplayWidth / canvasAspectRatio;
        } else {
            imgDisplayHeight = availableHeight;
            imgDisplayWidth = imgDisplayHeight * canvasAspectRatio;
        }
        
        pdf.setFontSize(16);
        pdf.text(this.currentProject.name, margin, margin + 10);
        pdf.addImage(drawingImgData, 'PNG', margin, margin + 30, imgDisplayWidth, imgDisplayHeight);

        // Draw title block if checked
        if (titleBlockData.includeInExport) {
            this._drawTitleBlockOnPDF(pdf, pdfHeight, pdfWidth, titleBlockData);
        }

        if (legendImage && legendImage.complete && legendImage.naturalWidth > 0 && legendImageDataUrl) {
            const mainCanvasRect = mainCanvas.getBoundingClientRect();
            const legendRect = legendElement.getBoundingClientRect();
            const legendRelX_px = legendRect.left - mainCanvasRect.left;
            const legendRelY_px = legendRect.top - mainCanvasRect.top;
            const pdfScaleX = imgDisplayWidth / mainCanvas.width;
            const pdfScaleY = imgDisplayHeight / mainCanvas.height;
            const legendPdfX = margin + (legendRelX_px * pdfScaleX);
            const legendPdfY = (margin + 30) + (legendRelY_px * pdfScaleY);
            const legendPdfWidth = legendImage.width * pdfScaleX;
            const legendPdfHeight = legendImage.height * pdfScaleY;
            console.log('Legend rect:', legendRect);
            console.log('Canvas rect:', mainCanvasRect);
            console.log('Legend relative position:', legendRelX_px, legendRelY_px);
            pdf.addImage(legendImageDataUrl, 'PNG', legendPdfX, legendPdfY, legendPdfWidth, legendPdfHeight);
        }

        const filename = `${this.currentProject.name}_canvas.pdf`;
        pdf.save(filename);
        this.showNotification('Canvas exported as PDF.', 'success');
    } catch (error) {
        console.error('Error exporting canvas as PDF:', error);
        this.showNotification('Error exporting canvas as PDF', 'error');
    }
};

/**
 * Get split regions based on split markers
 */
ElectricalCADApp.prototype.getSplitRegions = function() {
    const splitMarkers = this.drawingEngine.elements.splitMarkers;
    if (splitMarkers.length === 0) {
        this.showNotification('No split markers found. Use the split tool to add split markers first.', 'warning');
        return null;
    }
    
    // Sort markers by position
    const verticalMarkers = splitMarkers.filter(m => m.orientation === 'vertical').sort((a, b) => a.position - b.position);
    const horizontalMarkers = splitMarkers.filter(m => m.orientation === 'horizontal').sort((a, b) => a.position - b.position);
    
    // Get canvas bounds
    const bounds = this.getDrawingBounds();
    
    // Create regions
    const regions = [];
    
    // Calculate vertical splits
    const vSplits = [bounds.minX];
    verticalMarkers.forEach(marker => vSplits.push(marker.position));
    vSplits.push(bounds.maxX);
    
    // Calculate horizontal splits
    const hSplits = [bounds.minY];
    horizontalMarkers.forEach(marker => hSplits.push(marker.position));
    hSplits.push(bounds.maxY);
    
    // Generate regions with overlaps
    for (let i = 0; i < vSplits.length - 1; i++) {
        for (let j = 0; j < hSplits.length - 1; j++) {
            const overlapDist = this.drawingEngine.splitState.overlapDistance;
            
            regions.push({
                x: vSplits[i] - (i > 0 ? overlapDist : 0),
                y: hSplits[j] - (j > 0 ? overlapDist : 0),
                width: (vSplits[i + 1] - vSplits[i]) + (i > 0 ? overlapDist : 0) + (i < vSplits.length - 2 ? overlapDist : 0),
                height: (hSplits[j + 1] - hSplits[j]) + (j > 0 ? overlapDist : 0) + (j < hSplits.length - 2 ? overlapDist : 0),
                pageNumber: regions.length + 1,
                row: j,
                col: i
            });
        }
    }
    
    return regions;
};

/**
 * Get drawing bounds
 */
ElectricalCADApp.prototype.getDrawingBounds = function() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Check poles
    this.drawingEngine.elements.poles.forEach(pole => {
        minX = Math.min(minX, pole.x - 20);
        minY = Math.min(minY, pole.y - 20);
        maxX = Math.max(maxX, pole.x + 20);
        maxY = Math.max(maxY, pole.y + 20);
    });
    
    // Check lines
    this.drawingEngine.elements.lines.forEach(line => {
        minX = Math.min(minX, line.startX, line.endX);
        minY = Math.min(minY, line.startY, line.endY);
        maxX = Math.max(maxX, line.startX, line.endX);
        maxY = Math.max(maxY, line.startY, line.endY);
    });
    
    // Add padding
    const padding = 50;
    return {
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding,
        width: maxX - minX + 2 * padding,
        height: maxY - minY + 2 * padding
    };
};

/**
 * Export split drawing as JPG files
 */
ElectricalCADApp.prototype.exportSplitDrawingAsJPG = async function() {
    const regions = this.getSplitRegions();
    if (!regions) return;
    
    this.showNotification(`Exporting ${regions.length} split pages as JPG...`, 'info');
    
    // Capture legend once for all pages
    const legendElement = document.getElementById('legend');
    let legendImage = null;
    let legendWasCaptured = false;
    
    if (legendElement && !legendElement.classList.contains('minimized')) {
        try {
            const legendCanvasCapture = await window.html2canvas(legendElement, {
                backgroundColor: null,
                useCORS: true,
                logging: false,
                scale: 2
            });
            legendImage = new window.Image();
            legendImage.src = legendCanvasCapture.toDataURL();
            await new Promise(resolve => { 
                legendImage.onload = resolve; 
                legendImage.onerror = resolve; 
            });
            legendWasCaptured = legendImage.complete && legendImage.naturalWidth > 0;
        } catch (e) {
            console.error("Error capturing legend for split export:", e);
        }
    }
    
    try {
        for (const region of regions) {
            // Create landscape A4 canvas
            const scaleFactor = 2; // For high quality
            const a4LandscapeWidth = 1170 * scaleFactor; // A4 landscape width at 96 DPI
            const a4LandscapeHeight = 827 * scaleFactor; // A4 landscape height at 96 DPI
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = a4LandscapeWidth;
            tempCanvas.height = a4LandscapeHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Set white background
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Calculate drawing area (center area, leaving space for legend and title block)
            const margin = 40 * scaleFactor;
            const legendSpace = 200 * scaleFactor; // Space for legend on left
            const titleBlockSpace = 180 * scaleFactor; // Space for title block on right
            const bottomSpace = 120 * scaleFactor; // Space at bottom for legend and title block
            
            const drawingAreaX = margin + legendSpace;
            const drawingAreaY = margin;
            const drawingAreaWidth = a4LandscapeWidth - (margin * 2) - legendSpace - titleBlockSpace;
            const drawingAreaHeight = a4LandscapeHeight - (margin * 2) - bottomSpace;
            
            // Calculate scale to fit region content in drawing area
            const contentScale = Math.min(drawingAreaWidth / (region.width * scaleFactor), 
                                        drawingAreaHeight / (region.height * scaleFactor));
            
            const scaledContentWidth = region.width * scaleFactor * contentScale;
            const scaledContentHeight = region.height * scaleFactor * contentScale;
            
            // Center the content in the drawing area
            const contentX = drawingAreaX + (drawingAreaWidth - scaledContentWidth) / 2;
            const contentY = drawingAreaY + (drawingAreaHeight - scaledContentHeight) / 2;
            
            // Draw the region content
            tempCtx.save();
            tempCtx.translate(contentX, contentY);
            tempCtx.scale(contentScale, contentScale);
            tempCtx.scale(scaleFactor, scaleFactor);
            tempCtx.translate(-region.x, -region.y);
            
            // Draw grid if enabled
            if (this.drawingEngine.showGrid) {
                this.drawGridForExport(tempCtx, region);
            }
            
            // Draw elements in this region
            this.drawRegionElements(tempCtx, region);
            
            // Draw continuation indicators
            this.drawContinuationIndicators(tempCtx, region, regions);
            
            tempCtx.restore();
            
            // Add title block if enabled (bottom right)
            const titleBlockData = this.currentProject.titleBlockData;
            if (titleBlockData.includeInExport) {
                const titleBlockWidth = (titleBlockData.titleBlockWidth || 450) * scaleFactor;
                const titleBlockHeight = (titleBlockData.titleBlockHeight || 200) * scaleFactor;
                const titleBlockX = a4LandscapeWidth - titleBlockWidth - margin;
                const titleBlockY = a4LandscapeHeight - titleBlockHeight - margin;
                
                tempCtx.save();
                tempCtx.translate(titleBlockX, titleBlockY);
                tempCtx.scale(scaleFactor, scaleFactor);
                this._drawTitleBlockOnCanvas(tempCtx, titleBlockData.titleBlockHeight || 200, titleBlockData.titleBlockWidth || 450, titleBlockData);
                tempCtx.restore();
            }
            
            // Add legend to each page (bottom left)
            if (legendWasCaptured && legendImage) {
                const legendScale = scaleFactor * 0.6; // Appropriate scale for A4
                const legendWidth = legendImage.width * legendScale;
                const legendHeight = legendImage.height * legendScale;
                const legendX = margin;
                const legendY = a4LandscapeHeight - legendHeight - margin;
                
                tempCtx.save();
                tempCtx.globalAlpha = 0.95;
                tempCtx.drawImage(legendImage, legendX, legendY, legendWidth, legendHeight);
                
                // Add border around legend
                tempCtx.strokeStyle = '#ddd';
                tempCtx.lineWidth = 1 * scaleFactor;
                tempCtx.strokeRect(legendX, legendY, legendWidth, legendHeight);
                tempCtx.restore();
            }
            
            // Add page information (top right)
            tempCtx.save();
            tempCtx.font = `${12 * scaleFactor}px Arial`;
            tempCtx.fillStyle = '#666';
            tempCtx.textAlign = 'right';
            tempCtx.fillText(`Page ${region.pageNumber} of ${regions.length}`, 
                a4LandscapeWidth - margin, margin + 20 * scaleFactor);
            tempCtx.restore();
            
            // Export as JPG
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.download = `${this.currentProject.name}_page_${region.pageNumber}.jpg`;
            link.href = dataUrl;
            link.click();
        }
        
        const titleBlockIncluded = this.currentProject.titleBlockData.includeInExport;
        const featuresText = legendWasCaptured && titleBlockIncluded ? 'legend and title block' :
                            legendWasCaptured ? 'legend' :
                            titleBlockIncluded ? 'title block' : '';
        const successMessage = featuresText ? 
            `Successfully exported ${regions.length} JPG files with ${featuresText}` :
            `Successfully exported ${regions.length} JPG files`;
        this.showNotification(successMessage, 'success');
    } catch (error) {
        console.error('Error exporting split JPG:', error);
        this.showNotification('Error exporting split JPG files', 'error');
    }
};

/**
 * Export split drawing as PDF
 */
ElectricalCADApp.prototype.exportSplitDrawingAsPDF = async function() {
    if (!window.jspdf) {
        this.showNotification('jsPDF library not loaded.', 'error');
        return;
    }
    
    const regions = this.getSplitRegions();
    if (!regions) return;
    
    this.showNotification(`Generating PDF with ${regions.length} pages...`, 'info');
    
    // Capture legend once for all pages
    const legendElement = document.getElementById('legend');
    let legendImage = null;
    let legendWasCaptured = false;
    
    if (legendElement && !legendElement.classList.contains('minimized')) {
        try {
            const legendCanvasCapture = await window.html2canvas(legendElement, {
                backgroundColor: null,
                useCORS: true,
                logging: false,
                scale: 2
            });
            legendImage = new window.Image();
            legendImage.src = legendCanvasCapture.toDataURL();
            await new Promise(resolve => { 
                legendImage.onload = resolve; 
                legendImage.onerror = resolve; 
            });
            legendWasCaptured = legendImage.complete && legendImage.naturalWidth > 0;
        } catch (e) {
            console.error("Error capturing legend for split export:", e);
        }
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });
        
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            
            if (i > 0) {
                pdf.addPage();
            }
            
            // Create landscape A4 canvas
            const scaleFactor = 2;
            const a4LandscapeWidth = 1170 * scaleFactor; // A4 landscape width at 96 DPI
            const a4LandscapeHeight = 827 * scaleFactor; // A4 landscape height at 96 DPI
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = a4LandscapeWidth;
            tempCanvas.height = a4LandscapeHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // White background
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Calculate drawing area (center area, leaving space for legend and title block)
            const margin = 40 * scaleFactor;
            const legendSpace = 200 * scaleFactor; // Space for legend on left
            const titleBlockSpace = 180 * scaleFactor; // Space for title block on right
            const bottomSpace = 120 * scaleFactor; // Space at bottom for legend and title block
            
            const drawingAreaX = margin + legendSpace;
            const drawingAreaY = margin;
            const drawingAreaWidth = a4LandscapeWidth - (margin * 2) - legendSpace - titleBlockSpace;
            const drawingAreaHeight = a4LandscapeHeight - (margin * 2) - bottomSpace;
            
            // Calculate scale to fit region content in drawing area
            const contentScale = Math.min(drawingAreaWidth / (region.width * scaleFactor), 
                                        drawingAreaHeight / (region.height * scaleFactor));
            
            const scaledContentWidth = region.width * scaleFactor * contentScale;
            const scaledContentHeight = region.height * scaleFactor * contentScale;
            
            // Center the content in the drawing area
            const contentX = drawingAreaX + (drawingAreaWidth - scaledContentWidth) / 2;
            const contentY = drawingAreaY + (drawingAreaHeight - scaledContentHeight) / 2;
            
            // Draw the region content
            tempCtx.save();
            tempCtx.translate(contentX, contentY);
            tempCtx.scale(contentScale, contentScale);
            tempCtx.scale(scaleFactor, scaleFactor);
            tempCtx.translate(-region.x, -region.y);
            
            // Draw grid if enabled
            if (this.drawingEngine.showGrid) {
                this.drawGridForExport(tempCtx, region);
            }
            
            // Draw elements
            this.drawRegionElements(tempCtx, region);
            
            // Draw continuation indicators
            this.drawContinuationIndicators(tempCtx, region, regions);
            
            tempCtx.restore();
            
            // Add title block if enabled (bottom right)
            const titleBlockData = this.currentProject.titleBlockData;
            if (titleBlockData.includeInExport) {
                const titleBlockWidth = (titleBlockData.titleBlockWidth || 450) * scaleFactor;
                const titleBlockHeight = (titleBlockData.titleBlockHeight || 200) * scaleFactor;
                const titleBlockX = a4LandscapeWidth - titleBlockWidth - margin;
                const titleBlockY = a4LandscapeHeight - titleBlockHeight - margin;
                
                tempCtx.save();
                tempCtx.translate(titleBlockX, titleBlockY);
                tempCtx.scale(scaleFactor, scaleFactor);
                this._drawTitleBlockOnCanvas(tempCtx, titleBlockData.titleBlockHeight || 200, titleBlockData.titleBlockWidth || 450, titleBlockData);
                tempCtx.restore();
            }
            
            // Add legend to each page (bottom left)
            if (legendWasCaptured && legendImage) {
                const legendScale = scaleFactor * 0.4; // Smaller for PDF to save space
                const legendWidth = legendImage.width * legendScale;
                const legendHeight = legendImage.height * legendScale;
                const legendX = margin;
                const legendY = a4LandscapeHeight - legendHeight - margin;
                
                tempCtx.save();
                tempCtx.globalAlpha = 0.95;
                tempCtx.drawImage(legendImage, legendX, legendY, legendWidth, legendHeight);
                
                // Add border around legend
                tempCtx.strokeStyle = '#ddd';
                tempCtx.lineWidth = 1 * scaleFactor;
                tempCtx.strokeRect(legendX, legendY, legendWidth, legendHeight);
                tempCtx.restore();
            }
            
            // Add page information (top right)
            tempCtx.save();
            tempCtx.font = `${12 * scaleFactor}px Arial`;
            tempCtx.fillStyle = '#666';
            tempCtx.textAlign = 'right';
            tempCtx.fillText(`Page ${region.pageNumber} of ${regions.length}`, 
                a4LandscapeWidth - margin, margin + 20 * scaleFactor);
            tempCtx.restore();
            
            // Add to PDF - full page since we're using A4 canvas
            const imgData = tempCanvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Add page number in PDF (in addition to the one on canvas)
            pdf.setFontSize(10);
            pdf.text(`Page ${region.pageNumber} of ${regions.length}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
        }
        
        const filename = `${this.currentProject.name}_split.pdf`;
        pdf.save(filename);
        const titleBlockIncluded = this.currentProject.titleBlockData.includeInExport;
        const featuresText = legendWasCaptured && titleBlockIncluded ? 'legend and title block' :
                            legendWasCaptured ? 'legend' :
                            titleBlockIncluded ? 'title block' : '';
        const successMessage = featuresText ? 
            `Split drawing exported as PDF with ${featuresText}.` :
            'Split drawing exported as PDF.';
        this.showNotification(successMessage, 'success');
    } catch (error) {
        console.error('Error exporting split PDF:', error);
        this.showNotification('Error exporting split PDF', 'error');
    }
};

/**
 * Draw elements within a region
 */
ElectricalCADApp.prototype.drawRegionElements = function(ctx, region) {
    // Apply drawing engine transformations
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = 1;
    
    // Draw lines
    this.drawingEngine.elements.lines.forEach(line => {
        // Check if line intersects with region
        if (this.lineIntersectsRegion(line, region)) {
            this.drawLineForExport(ctx, line);
        }
    });
    
    // Draw poles
    this.drawingEngine.elements.poles.forEach(pole => {
        // Check if pole is in region
        if (pole.x >= region.x && pole.x <= region.x + region.width &&
            pole.y >= region.y && pole.y <= region.y + region.height) {
            ctx.save();
            ctx.translate(pole.x, pole.y);
            
            // Draw pole symbol
            this.drawPoleForExport(ctx, pole.type);
            
            // Draw accessories and labels
            if (pole.hasGrounding) {
                this.drawGroundingForExport(ctx);
            }
            if (pole.hasGuywire) {
                this.drawGuywireForExport(ctx);
            }
            
            if (this.drawingEngine.showNameLabels && pole.name) {
                const style = this.drawingEngine.poleLabelStyle;
                
                // Set up font matching main drawing engine
                const fontStyle = style.textStyle === 'bold italic' ? 'bold italic' : 
                                 style.textStyle === 'bold' ? 'bold' : 
                                 style.textStyle === 'italic' ? 'italic' : 'normal';
                ctx.font = `${fontStyle} ${style.textSize}px ${style.font}`;
                ctx.textAlign = 'center';
                
                // Draw background if enabled
                if (style.showBackground) {
                    const textMetrics = ctx.measureText(pole.name);
                    const textWidth = textMetrics.width;
                    const textHeight = style.textSize;
                    
                    ctx.globalAlpha = style.backgroundOpacity / 100;
                    ctx.fillStyle = style.backgroundColor;
                    ctx.fillRect(-textWidth/2 - 2, style.textOffset - textHeight/2 - 1, textWidth + 4, textHeight + 2);
                    ctx.globalAlpha = 1;
                }
                
                // Draw text
                ctx.fillStyle = style.textColor;
                ctx.fillText(pole.name, 0, style.textOffset);
            }
            
            ctx.restore();
        }
    });
    
    // Draw dimensions
    if (this.drawingEngine.showDimensions) {
        this.drawingEngine.elements.dimensions.forEach(dimension => {
            // Simple check - improve this based on dimension type
            const inRegion = dimension.points.some(point => 
                point.x >= region.x && point.x <= region.x + region.width &&
                point.y >= region.y && point.y <= region.y + region.height
            );
            if (inRegion) {
                this.drawDimensionForExport(ctx, dimension);
            }
        });
    }
};

/**
 * Draw continuation indicators
 */
ElectricalCADApp.prototype.drawContinuationIndicators = function(ctx, region, allRegions) {
    ctx.save();
    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#888';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const overlapDist = this.drawingEngine.splitState.overlapDistance;
    const arrowSize = 10;
    
    // Check if there are adjacent regions
    const hasLeft = region.col > 0;
    const hasRight = allRegions.some(r => r.col === region.col + 1 && r.row === region.row);
    const hasTop = region.row > 0;
    const hasBottom = allRegions.some(r => r.row === region.row + 1 && r.col === region.col);
    
    // Draw continuation indicators
    if (hasLeft) {
        ctx.beginPath();
        ctx.moveTo(region.x + overlapDist, region.y);
        ctx.lineTo(region.x + overlapDist, region.y + region.height);
        ctx.stroke();
        
        // Arrow
        ctx.beginPath();
        ctx.moveTo(region.x + overlapDist, region.y + region.height / 2);
        ctx.lineTo(region.x + overlapDist - arrowSize, region.y + region.height / 2 - arrowSize);
        ctx.moveTo(region.x + overlapDist, region.y + region.height / 2);
        ctx.lineTo(region.x + overlapDist - arrowSize, region.y + region.height / 2 + arrowSize);
        ctx.stroke();
        
        ctx.fillText('← Continued from left', region.x + overlapDist + 50, region.y + 20);
    }
    
    if (hasRight) {
        ctx.beginPath();
        ctx.moveTo(region.x + region.width - overlapDist, region.y);
        ctx.lineTo(region.x + region.width - overlapDist, region.y + region.height);
        ctx.stroke();
        
        // Arrow
        ctx.beginPath();
        ctx.moveTo(region.x + region.width - overlapDist, region.y + region.height / 2);
        ctx.lineTo(region.x + region.width - overlapDist + arrowSize, region.y + region.height / 2 - arrowSize);
        ctx.moveTo(region.x + region.width - overlapDist, region.y + region.height / 2);
        ctx.lineTo(region.x + region.width - overlapDist + arrowSize, region.y + region.height / 2 + arrowSize);
        ctx.stroke();
        
        ctx.fillText('Continues to right →', region.x + region.width - overlapDist - 50, region.y + 20);
    }
    
    if (hasTop) {
        ctx.beginPath();
        ctx.moveTo(region.x, region.y + overlapDist);
        ctx.lineTo(region.x + region.width, region.y + overlapDist);
        ctx.stroke();
        
        // Arrow
        ctx.beginPath();
        ctx.moveTo(region.x + region.width / 2, region.y + overlapDist);
        ctx.lineTo(region.x + region.width / 2 - arrowSize, region.y + overlapDist - arrowSize);
        ctx.moveTo(region.x + region.width / 2, region.y + overlapDist);
        ctx.lineTo(region.x + region.width / 2 + arrowSize, region.y + overlapDist - arrowSize);
        ctx.stroke();
        
        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillText('↑ Continued from above', region.x + 20, region.y + overlapDist + 20);
        ctx.restore();
    }
    
    if (hasBottom) {
        ctx.beginPath();
        ctx.moveTo(region.x, region.y + region.height - overlapDist);
        ctx.lineTo(region.x + region.width, region.y + region.height - overlapDist);
        ctx.stroke();
        
        // Arrow
        ctx.beginPath();
        ctx.moveTo(region.x + region.width / 2, region.y + region.height - overlapDist);
        ctx.lineTo(region.x + region.width / 2 - arrowSize, region.y + region.height - overlapDist + arrowSize);
        ctx.moveTo(region.x + region.width / 2, region.y + region.height - overlapDist);
        ctx.lineTo(region.x + region.width / 2 + arrowSize, region.y + region.height - overlapDist + arrowSize);
        ctx.stroke();
        
        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillText('↓ Continues below', region.x + 20, region.y + region.height - overlapDist - 10);
        ctx.restore();
    }
    
    ctx.restore();
};

/**
 * Check if line intersects with region
 */
ElectricalCADApp.prototype.lineIntersectsRegion = function(line, region) {
    // Simple bounding box check - could be improved with actual line intersection
    const lineMinX = Math.min(line.startX, line.endX);
    const lineMaxX = Math.max(line.startX, line.endX);
    const lineMinY = Math.min(line.startY, line.endY);
    const lineMaxY = Math.max(line.startY, line.endY);
    
    return !(lineMaxX < region.x || lineMinX > region.x + region.width ||
             lineMaxY < region.y || lineMinY > region.y + region.height);
};

/**
 * Get pole method name from type
 */
ElectricalCADApp.prototype.getPoleMethodName = function(type) {
    const typeMap = {
        'tiang-baja-existing': 'TiangBajaExisting',
        'tiang-baja-rencana': 'TiangBajaRencana',
        'tiang-beton-existing': 'TiangBetonExisting',
        'tiang-beton-rencana': 'TiangBetonRencana',
        'gardu-portal': 'GarduPortal'
    };
    return typeMap[type] || '';
};

/**
 * Draw line for export without dependencies on drawing engine state
 */
ElectricalCADApp.prototype.drawLineForExport = function(ctx, line) {
    ctx.save();
    
    // Set line style based on type to match main drawing engine
    switch (line.type) {
        case 'sutm-rencana':
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 0.6;
            ctx.setLineDash([5, 5]);
            break;
        case 'sutm-existing':
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 0.6;
            ctx.setLineDash([]);
            break;
        case 'sutr-rencana':
            ctx.strokeStyle = '#0000ff';
            ctx.lineWidth = 0.6;
            ctx.setLineDash([5, 5]);
            break;
        case 'sutr-existing':
            ctx.strokeStyle = '#0000ff';
            ctx.lineWidth = 0.6;
            ctx.setLineDash([]);
            break;
        default:
            // Fallback to custom style or defaults
            ctx.strokeStyle = line.style?.color || '#000';
            ctx.lineWidth = line.style?.thickness || 1;
            if (line.style?.dashed) {
                ctx.setLineDash([5, 5]);
            }
            break;
    }
    
    ctx.beginPath();
    ctx.moveTo(line.startX, line.startY);
    ctx.lineTo(line.endX, line.endY);
    ctx.stroke();
    ctx.restore();
};

/**
 * Draw pole for export
 */
ElectricalCADApp.prototype.drawPoleForExport = function(ctx, poleType) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = 1;
    
    switch(poleType) {
        case 'wooden':
        case 'tiang-beton-existing':
        case 'tiang-beton-rencana':
            this.drawWoodenPoleExport(ctx);
            break;
        case 'concrete':
            this.drawConcretePoleExport(ctx);
            break;
        case 'steel':
        case 'tiang-baja-existing':
        case 'tiang-baja-rencana':
            this.drawSteelPoleExport(ctx);
            break;
        case 'lattice':
        case 'gardu-portal':
            this.drawLatticeTowerExport(ctx);
            break;
        default:
            this.drawWoodenPoleExport(ctx);
    }
    ctx.restore();
};

/**
 * Export drawing methods for poles - matching main drawing engine symbols
 */
ElectricalCADApp.prototype.drawWoodenPoleExport = function(ctx) {
    // For tiang-beton-existing and tiang-beton-rencana
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner black dot for beton types
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
};

ElectricalCADApp.prototype.drawConcretePoleExport = function(ctx) {
    // Alternative concrete pole style
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner white dot
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
};

ElectricalCADApp.prototype.drawSteelPoleExport = function(ctx) {
    // For tiang-baja-existing and tiang-baja-rencana
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
};

ElectricalCADApp.prototype.drawLatticeTowerExport = function(ctx) {
    // For gardu-portal
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeRect(-4, -4, 8, 8);
    
    // Lightning bolt symbol
    ctx.fillStyle = '#000';
    ctx.font = '6px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 0);
};

/**
 * Draw grounding for export - matching main drawing engine style
 */
ElectricalCADApp.prototype.drawGroundingForExport = function(ctx) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    // Vertical line down
    ctx.moveTo(0, 4);
    ctx.lineTo(0, 9);
    // Horizontal lines (grounding symbol)
    ctx.moveTo(-3, 9);
    ctx.lineTo(3, 9);
    ctx.moveTo(-2, 10);
    ctx.lineTo(2, 10);
    ctx.moveTo(-1, 11);
    ctx.lineTo(1, 11);
    ctx.stroke();
    ctx.restore();
};

/**
 * Draw guywire for export - matching main drawing engine style
 */
ElectricalCADApp.prototype.drawGuywireForExport = function(ctx) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    // Diagonal lines representing guy wires
    ctx.moveTo(0, 0);
    ctx.lineTo(7.5, 7.5);
    ctx.moveTo(0, 0);
    ctx.lineTo(-7.5, 7.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

/**
 * Draw dimension for export
 */
ElectricalCADApp.prototype.drawDimensionForExport = function(ctx, dimension) {
    ctx.save();
    ctx.strokeStyle = '#0066cc';
    ctx.fillStyle = '#0066cc';
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    if (dimension.type === 'linear') {
        const start = dimension.points[0];
        const end = dimension.points[1];
        
        // Draw dimension line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw arrows
        this.drawArrowForExport(ctx, start.x, start.y, end.x, end.y);
        this.drawArrowForExport(ctx, end.x, end.y, start.x, start.y);
        
        // Draw text
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.fillText(distance.toFixed(1) + 'm', midX, midY - 5);
    }
    
    ctx.restore();
};

/**
 * Draw arrow for dimension export
 */
ElectricalCADApp.prototype.drawArrowForExport = function(ctx, fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 5;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(
        fromX + arrowLength * Math.cos(angle - arrowAngle),
        fromY + arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(
        fromX + arrowLength * Math.cos(angle + arrowAngle),
        fromY + arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
};

/**
 * Draw grid for export (within region bounds)
 */
ElectricalCADApp.prototype.drawGridForExport = function(ctx, region) {
    ctx.save();
    
    // Use the same grid size as the main drawing engine
    const gridSize = this.drawingEngine.gridSize || 10; // Default to 10 if not set
    
    // Calculate grid bounds within the region
    const startX = Math.floor(region.x / gridSize) * gridSize;
    const startY = Math.floor(region.y / gridSize) * gridSize;
    const endX = Math.ceil((region.x + region.width) / gridSize) * gridSize;
    const endY = Math.ceil((region.y + region.height) / gridSize) * gridSize;
    
    // Set grid style to match main drawing
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.15;
    ctx.beginPath();
    
    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
        if (x >= region.x && x <= region.x + region.width) {
            ctx.moveTo(x, Math.max(startY, region.y));
            ctx.lineTo(x, Math.min(endY, region.y + region.height));
        }
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
        if (y >= region.y && y <= region.y + region.height) {
            ctx.moveTo(Math.max(startX, region.x), y);
            ctx.lineTo(Math.min(endX, region.x + region.width), y);
        }
    }
    
    ctx.stroke();
    ctx.restore();
};