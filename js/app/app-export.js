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
    const blockWidthRatio = 0.35; // Percentage of canvas width
    const blockHeightRatio = 0.20; // Percentage of canvas height
    const blockPadding = 10; // pixels
    let blockWidth = Math.min(450, canvasWidth * blockWidthRatio); // Max width
    let blockHeight = Math.min(200, canvasHeight * blockHeightRatio); // Max height

    const xPos = canvasWidth - blockWidth - blockPadding;
    const yPos = canvasHeight - blockHeight - blockPadding;

    targetCtx.save();
    targetCtx.strokeStyle = '#000000';
    targetCtx.fillStyle = '#000000';
    targetCtx.lineWidth = 1;
    targetCtx.font = "bold 10px Arial"; // Default font

    // Outer rectangle
    targetCtx.strokeRect(xPos, yPos, blockWidth, blockHeight);

    // --- Header Text (PT PLN etc.) ---
    let currentY = yPos + 15;
    const headerFontSize = Math.max(8, Math.min(10, blockWidth * 0.025));
    targetCtx.font = `bold ${headerFontSize}px Arial`;
    targetCtx.textAlign = "center";
    targetCtx.fillText(titleBlockData.companyName, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.2;
    targetCtx.fillText(titleBlockData.projectUnit, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.2;
    targetCtx.fillText(titleBlockData.province, xPos + blockWidth / 2, currentY);
    currentY += headerFontSize * 1.5; // More space before next section

    // --- Drawing Title ---
    targetCtx.strokeRect(xPos, currentY - headerFontSize*0.8, blockWidth, headerFontSize * 2); // Box for drawing title
    const drawingTitleFontSize = Math.max(7, Math.min(9, blockWidth * 0.022));
    targetCtx.font = `${drawingTitleFontSize}px Arial`;
    targetCtx.fillText(titleBlockData.drawingTitle, xPos + blockWidth / 2, currentY + drawingTitleFontSize*0.5);
    currentY += headerFontSize * 2 + 5;

    // --- Table ---
    const tableStartY = currentY;
    const numCols = 4; // LABEL, NAMA, PARAF, JABATAN
    const numRows = titleBlockData.rows.length;
    const colWidths = [blockWidth * 0.25, blockWidth * 0.28, blockWidth * 0.15, blockWidth * 0.32];
    const noGbrColWidth = blockWidth * 0.15; // For drawing number, separate from main table content width
    const mainTableWidth = blockWidth - noGbrColWidth;
    
    // Adjust colWidths for the main table part
    const adjustedColWidths = [mainTableWidth * 0.28, mainTableWidth * 0.35, mainTableWidth * 0.15, mainTableWidth * 0.22];

    const tableHeaderHeight = 20;
    const tableRowHeight = (blockHeight - (tableStartY - yPos) - tableHeaderHeight - blockPadding) / numRows;
    
    targetCtx.font = "bold 8px Arial";
    targetCtx.textAlign = "left";

    // Draw table headers
    let currentX = xPos;
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[0], tableHeaderHeight); // Empty for "DIRENCANA" etc.
    currentX += adjustedColWidths[0];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[1], tableHeaderHeight); targetCtx.fillText("NAMA", currentX + 3, tableStartY + 12);
    currentX += adjustedColWidths[1];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[2], tableHeaderHeight); targetCtx.fillText("PARAF", currentX + 3, tableStartY + 12);
    currentX += adjustedColWidths[2];
    targetCtx.strokeRect(currentX, tableStartY, adjustedColWidths[3], tableHeaderHeight); targetCtx.fillText("JABATAN", currentX + 3, tableStartY + 12);
    
    currentY = tableStartY + tableHeaderHeight;
    targetCtx.font = "8px Arial";

    // Draw table rows
    titleBlockData.rows.forEach(rowData => {
        currentX = xPos;
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[0], tableRowHeight); targetCtx.fillText(rowData.label, currentX + 3, currentY + tableRowHeight/2 + 3);
        currentX += adjustedColWidths[0];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[1], tableRowHeight); targetCtx.fillText(rowData.nama, currentX + 3, currentY + tableRowHeight/2 + 3);
        currentX += adjustedColWidths[1];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[2], tableRowHeight); targetCtx.fillText(rowData.paraf, currentX + 3, currentY + tableRowHeight/2 + 3);
        currentX += adjustedColWidths[2];
        targetCtx.strokeRect(currentX, currentY, adjustedColWidths[3], tableRowHeight); targetCtx.fillText(rowData.jabatan, currentX + 3, currentY + tableRowHeight/2 + 3);
        currentY += tableRowHeight;
    });

    // --- Drawing Number (NO.GBR) ---
    const noGbrX = xPos + mainTableWidth;
    targetCtx.font = "bold 8px Arial";
    targetCtx.textAlign = "center";
    targetCtx.strokeRect(noGbrX, tableStartY, noGbrColWidth, tableHeaderHeight); 
    targetCtx.fillText("NO.GBR", noGbrX + noGbrColWidth/2, tableStartY + 12);

    targetCtx.font = "bold 32px Arial"; // Large font for the number
    const noGbrContentY = tableStartY + tableHeaderHeight;
    const noGbrContentHeight = blockHeight - (tableStartY - yPos) - tableHeaderHeight - blockPadding;
    targetCtx.strokeRect(noGbrX, noGbrContentY, noGbrColWidth, noGbrContentHeight);
    targetCtx.fillText(titleBlockData.drawingNumber, noGbrX + noGbrColWidth/2, noGbrContentY + noGbrContentHeight/2 + 10);

    targetCtx.restore();
};

// Draw the title block on a jsPDF instance
ElectricalCADApp.prototype._drawTitleBlockOnPDF = function(pdf, pageHeight, pageWidth, titleBlockData) {
    // --- Configuration --- (using points for PDF units)
    const blockWidthPt = pageWidth * 0.33; // Example: 33% of page width
    const blockHeightPt = pageHeight * 0.18; // Example: 18% of page height
    const marginPt = 20; // Margin from page edge
    
    const xPosPt = pageWidth - blockWidthPt - marginPt;
    const yPosPt = pageHeight - blockHeightPt - marginPt;

    pdf.saveGraphicsState();
    pdf.setDrawColor(0); // Black
    pdf.setFillColor(0); // Black
    pdf.setLineWidth(0.5); // points
    pdf.setFont("helvetica", "bold"); // Default

    // Outer rectangle
    pdf.rect(xPosPt, yPosPt, blockWidthPt, blockHeightPt, 'S'); // Stroke

    // --- Header Text ---
    let currentYPt = yPosPt + 15;
    const headerFontSizePt = Math.min(10, blockWidthPt * 0.025);
    pdf.setFontSize(headerFontSizePt);
    pdf.text(titleBlockData.companyName, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.2;
    pdf.text(titleBlockData.projectUnit, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.2;
    pdf.text(titleBlockData.province, xPosPt + blockWidthPt / 2, currentYPt, { align: 'center' });
    currentYPt += headerFontSizePt * 1.5;

    // --- Drawing Title ---
    const drawingTitleBoxY = currentYPt - headerFontSizePt * 0.8;
    const drawingTitleBoxHeight = headerFontSizePt * 2;
    pdf.rect(xPosPt, drawingTitleBoxY, blockWidthPt, drawingTitleBoxHeight, 'S');
    const drawingTitleFontSizePt = Math.min(9, blockWidthPt * 0.022);
    pdf.setFontSize(drawingTitleFontSizePt);
    pdf.text(titleBlockData.drawingTitle, xPosPt + blockWidthPt / 2, drawingTitleBoxY + drawingTitleBoxHeight / 2 + drawingTitleFontSizePt/3, { align: 'center' });
    currentYPt += drawingTitleBoxHeight + 5;

    // --- Table ---
    const tableStartYPt = currentYPt;
    const noGbrColWidthPt = blockWidthPt * 0.18;
    const mainTableWidthPt = blockWidthPt - noGbrColWidthPt;
    const colWidthsPt = [mainTableWidthPt * 0.28, mainTableWidthPt * 0.35, mainTableWidthPt * 0.15, mainTableWidthPt * 0.22];
    
    const tableHeaderHeightPt = 18;
    const tableRowHeightPt = (blockHeightPt - (tableStartYPt - yPosPt) - tableHeaderHeightPt - 5 /*bottom padding*/) / titleBlockData.rows.length;
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);

    let currentXPt = xPosPt;
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[0], tableHeaderHeightPt, 'S'); // Empty
    currentXPt += colWidthsPt[0];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[1], tableHeaderHeightPt, 'S'); pdf.text("NAMA", currentXPt + 3, tableStartYPt + tableHeaderHeightPt/2 + 2);
    currentXPt += colWidthsPt[1];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[2], tableHeaderHeightPt, 'S'); pdf.text("PARAF", currentXPt + 3, tableStartYPt + tableHeaderHeightPt/2 + 2);
    currentXPt += colWidthsPt[2];
    pdf.rect(currentXPt, tableStartYPt, colWidthsPt[3], tableHeaderHeightPt, 'S'); pdf.text("JABATAN", currentXPt + 3, tableStartYPt + tableHeaderHeightPt/2 + 2);
    
    currentYPt = tableStartYPt + tableHeaderHeightPt;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    titleBlockData.rows.forEach(rowData => {
        currentXPt = xPosPt;
        pdf.rect(currentXPt, currentYPt, colWidthsPt[0], tableRowHeightPt, 'S'); pdf.text(rowData.label, currentXPt + 3, currentYPt + tableRowHeightPt/2 + 2);
        currentXPt += colWidthsPt[0];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[1], tableRowHeightPt, 'S'); pdf.text(rowData.nama, currentXPt + 3, currentYPt + tableRowHeightPt/2 + 2);
        currentXPt += colWidthsPt[1];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[2], tableRowHeightPt, 'S'); pdf.text(rowData.paraf, currentXPt + 3, currentYPt + tableRowHeightPt/2 + 2);
        currentXPt += colWidthsPt[2];
        pdf.rect(currentXPt, currentYPt, colWidthsPt[3], tableRowHeightPt, 'S'); pdf.text(rowData.jabatan, currentXPt + 3, currentYPt + tableRowHeightPt/2 + 2);
        currentYPt += tableRowHeightPt;
    });

    // --- Drawing Number (NO.GBR) ---
    const noGbrXPt = xPosPt + mainTableWidthPt;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.rect(noGbrXPt, tableStartYPt, noGbrColWidthPt, tableHeaderHeightPt, 'S'); 
    pdf.text("NO.GBR", noGbrXPt + noGbrColWidthPt/2, tableStartYPt + tableHeaderHeightPt/2 + 2, {align: 'center'});

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28); // Large font for the number
    const noGbrContentYPt = tableStartYPt + tableHeaderHeightPt;
    const noGbrContentHeightPt = blockHeightPt - (tableStartYPt - yPosPt) - tableHeaderHeightPt - 5;
    pdf.rect(noGbrXPt, noGbrContentYPt, noGbrColWidthPt, noGbrContentHeightPt, 'S');
    pdf.text(titleBlockData.drawingNumber, noGbrXPt + noGbrColWidthPt/2, noGbrContentYPt + noGbrContentHeightPt/2 + 8, {align: 'center'});

    pdf.restoreGraphicsState();
};

// Export canvas as JPG with title block if enabled
ElectricalCADApp.prototype.exportCanvasAsJPG = function() {
    try {
        const canvas = this.drawingEngine.canvas;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        // Draw title block if checked
        const titleBlockData = this.currentProject.titleBlockData;
        if (titleBlockData.includeInExport) {
            this._drawTitleBlockOnCanvas(tempCtx, tempCanvas.width, tempCanvas.height, titleBlockData);
        }
        
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
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
        const canvas = this.drawingEngine.canvas;
        const { jsPDF } = window.jspdf;
        
        // Determine PDF orientation and dimensions
        let pdfWidth, pdfHeight, orientation;
        if (canvas.width > canvas.height) { orientation = 'l'; pdfWidth = 841.89; pdfHeight = 595.28; } 
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
        const canvasImage = await window.html2canvas(canvas, { backgroundColor: '#ffffff', useCORS: true });
        const imgData = canvasImage.toDataURL('image/png');

        let imgDisplayWidth, imgDisplayHeight;
        const canvasAspectRatio = canvas.width / canvas.height;
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
        pdf.addImage(imgData, 'PNG', margin, margin + 30, imgDisplayWidth, imgDisplayHeight);

        // Draw title block if checked
        if (titleBlockData.includeInExport) {
            this._drawTitleBlockOnPDF(pdf, pdfHeight, pdfWidth, titleBlockData);
        }
        
        const filename = `${this.currentProject.name}_canvas.pdf`;
        pdf.save(filename);
        this.showNotification('Canvas exported as PDF.', 'success');
    } catch (error) {
        console.error('Error exporting canvas as PDF:', error);
        this.showNotification('Error exporting canvas as PDF', 'error');
    }
};