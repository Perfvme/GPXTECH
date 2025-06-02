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