/**
 * Drawing Engine Rendering Methods
 * Canvas rendering functionality for all visual elements
 */

/**
 * Main render method
 */
DrawingEngine.prototype.render = function() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Save context
    this.ctx.save();
    
    // Apply transformations
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);
    
    // Draw grid
    if (this.showGrid) {
        this.drawGrid();
    }
    
    // Draw pole preview if applicable
    if (this.currentTool === 'pole' && this.polePreviewCoordinates) {
        this.drawPolePreview(this.polePreviewCoordinates.x, this.polePreviewCoordinates.y);
    }
    
    // Draw lines first (so they appear behind poles)
    this.elements.lines.forEach(line => this.drawLine(line));
    
    // Draw temporary line
    if (this.tempLine) {
        this.drawLine(this.tempLine, true);
    }
    
    // Draw snap point indicator
    if (this.snapPoint) {
        this.drawSnapIndicator(this.snapPoint);
    }
    
    // Draw snap point for cursor (when not drawing)
    if (this.currentTool === 'line' && !this.tempLine && this.snapPoint && this.snapEnabled) {
        this.drawSnapIndicator(this.snapPoint);
    }
    
    // Draw poles
    this.elements.poles.forEach(pole => this.drawPole(pole));
    
    // Draw ALL dimensions (manually created and GPX-generated)
    if (this.showDimensions) { // General toggle for all dimensions
        this.elements.dimensions.forEach(dimension => {
            // Ensure dimension object has a style property; if not, assign default from its type
            if (!dimension.style || Object.keys(dimension.style).length === 0) {
                if (dimension.type === 'aligned') {
                    dimension.style = { ...this.dimensionStyle.aligned };
                } else if (dimension.type === 'angle') {
                    dimension.style = { ...this.dimensionStyle.angle };
                }
            }
            this.drawDimension(dimension); // Centralized call to draw any dimension type
        });
    }
    
    // Draw angle preview
    if (this.angleState.previewAngle) {
        this.drawAnglePreview(this.angleState.previewAngle);
    }
    
    // Draw drag selection rectangle
    if (this.dragSelection.active) {
        this.drawDragSelection();
    }
    
    // Restore context
    this.ctx.restore();
};

/**
 * Draw grid
 */
DrawingEngine.prototype.drawGrid = function() {
    const startX = Math.floor(-this.panX / this.zoom / this.gridSize) * this.gridSize;
    const startY = Math.floor(-this.panY / this.zoom / this.gridSize) * this.gridSize;
    const endX = startX + (this.canvas.width / this.zoom) + this.gridSize;
    const endY = startY + (this.canvas.height / this.zoom) + this.gridSize;
    
    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 0.15;
    this.ctx.beginPath();
    
    for (let x = startX; x <= endX; x += this.gridSize) {
        this.ctx.moveTo(x, startY);
        this.ctx.lineTo(x, endY);
    }
    
    for (let y = startY; y <= endY; y += this.gridSize) {
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
    }
    
    this.ctx.stroke();
};

/**
 * Draw a pole with the correct symbol
 */
DrawingEngine.prototype.drawPole = function(pole) {
    const isSelected = (this.selectedElement && this.selectedElement.id === pole.id) || 
                      this.selectedElements.has(pole);
    
    this.ctx.save();
    this.ctx.translate(pole.x, pole.y);
    
    // Draw selection highlight
    if (isSelected) {
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 0.9;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    // Draw pole symbol based on type
    switch (pole.type) {
        case 'tiang-baja-existing':
            this.drawTiangBajaExisting();
            break;
        case 'tiang-baja-rencana':
            this.drawTiangBajaRencana();
            break;
        case 'tiang-beton-existing':
            this.drawTiangBetonExisting();
            break;
        case 'tiang-beton-rencana':
            this.drawTiangBetonRencana();
            break;
        case 'gardu-portal':
            this.drawGarduPortal();
            break;
    }
    
    // Draw accessories
    if (pole.hasGrounding) {
        this.drawGrounding();
    }
    
    if (pole.hasGuywire) {
        this.drawGuywire();
    }
    
    // Draw pole name (if enabled)
    if (this.showNameLabels) {
        this.ctx.fillStyle = '#333';
        this.ctx.font = '5px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pole.name, 0, 12.5);
    }
    
    this.ctx.restore();
};

/**
 * Draw Tiang Baja Existing symbol (filled black circle)
 */
DrawingEngine.prototype.drawTiangBajaExisting = function() {
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();
};

/**
 * Draw Tiang Baja Rencana symbol (empty circle)
 */
DrawingEngine.prototype.drawTiangBajaRencana = function() {
    this.ctx.strokeStyle = '#000';
    this.ctx.fillStyle = '#fff';
    this.ctx.lineWidth = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
};

/**
 * Draw Tiang Beton Existing symbol (filled black circle with white dot)
 */
DrawingEngine.prototype.drawTiangBetonExisting = function() {
    // Outer black circle
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner white dot
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    this.ctx.fill();
};

/**
 * Draw Tiang Beton Rencana symbol (empty circle with black dot)
 */
DrawingEngine.prototype.drawTiangBetonRencana = function() {
    // Outer circle
    this.ctx.strokeStyle = '#000';
    this.ctx.fillStyle = '#fff';
    this.ctx.lineWidth = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Inner black dot
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    this.ctx.fill();
};

/**
 * Draw Gardu Portal symbol (square with lightning bolt)
 */
DrawingEngine.prototype.drawGarduPortal = function() {
    // Square
    this.ctx.strokeStyle = '#000';
    this.ctx.fillStyle = '#fff';
    this.ctx.lineWidth = 0.6;
    this.ctx.fillRect(-4, -4, 8, 8);
    this.ctx.strokeRect(-4, -4, 8, 8);
    
    // Lightning bolt
    this.ctx.fillStyle = '#000';
    this.ctx.font = '6px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('⚡', 0, 0);
};

/**
 * Draw grounding symbol
 */
DrawingEngine.prototype.drawGrounding = function() {
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 0.6;
    this.ctx.beginPath();
    // Vertical line down
    this.ctx.moveTo(0, 4);
    this.ctx.lineTo(0, 9);
    // Horizontal lines (grounding symbol)
    this.ctx.moveTo(-3, 9);
    this.ctx.lineTo(3, 9);
    this.ctx.moveTo(-2, 10);
    this.ctx.lineTo(2, 10);
    this.ctx.moveTo(-1, 11);
    this.ctx.lineTo(1, 11);
    this.ctx.stroke();
};

/**
 * Draw guy wire symbol
 */
DrawingEngine.prototype.drawGuywire = function() {
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 0.3;
    this.ctx.setLineDash([2, 2]);
    this.ctx.beginPath();
    // Diagonal lines representing guy wires
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(7.5, 7.5);
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-7.5, 7.5);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
};

/**
 * Draw a line with the correct style
 */
DrawingEngine.prototype.drawLine = function(line, isTemporary = false) {
    const isSelected = !isTemporary && ((this.selectedElement && this.selectedElement.id === line.id) || 
                      this.selectedElements.has(line));
    
    this.ctx.save();
    
    // Set line style based on type
    switch (line.type) {
        case 'sutm-rencana':
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 0.6;
            this.ctx.setLineDash([5, 5]);
            break;
        case 'sutm-existing':
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 0.6;
            this.ctx.setLineDash([]);
            break;
        case 'sutr-rencana':
            this.ctx.strokeStyle = '#0000ff';
            this.ctx.lineWidth = 0.6;
            this.ctx.setLineDash([5, 5]);
            break;
        case 'sutr-existing':
            this.ctx.strokeStyle = '#0000ff';
            this.ctx.lineWidth = 0.6;
            this.ctx.setLineDash([]);
            break;
    }
    
    // Draw selection highlight
    if (isSelected) {
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 0.45;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(line.startX, line.startY);
        this.ctx.lineTo(line.endX, line.endY);
        this.ctx.stroke();
        
        // Reset style for actual line
        switch (line.type) {
            case 'sutm-rencana':
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 0.6;
                this.ctx.setLineDash([5, 5]);
                break;
            case 'sutm-existing':
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 0.6;
                this.ctx.setLineDash([]);
                break;
            case 'sutr-rencana':
                this.ctx.strokeStyle = '#0000ff';
                this.ctx.lineWidth = 0.6;
                this.ctx.setLineDash([5, 5]);
                break;
            case 'sutr-existing':
                this.ctx.strokeStyle = '#0000ff';
                this.ctx.lineWidth = 0.6;
                this.ctx.setLineDash([]);
                break;
        }
    }
    
    if (isTemporary) {
        this.ctx.globalAlpha = 0.7;
    }
    
    // Draw the line
    this.ctx.beginPath();
    this.ctx.moveTo(line.startX, line.startY);
    this.ctx.lineTo(line.endX, line.endY);
    this.ctx.stroke();
    
    this.ctx.restore();
};

/**
 * Draw drag selection rectangle
 */
DrawingEngine.prototype.drawDragSelection = function() {
    this.ctx.save();
    
    // Draw selection rectangle
    this.ctx.strokeStyle = '#3498db';
    this.ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    
    const width = this.dragSelection.endX - this.dragSelection.startX;
    const height = this.dragSelection.endY - this.dragSelection.startY;
    
    this.ctx.fillRect(this.dragSelection.startX, this.dragSelection.startY, width, height);
    this.ctx.strokeRect(this.dragSelection.startX, this.dragSelection.startY, width, height);
    
    this.ctx.restore();
};

/**
 * Draw snap indicator with type-specific styling
 */
DrawingEngine.prototype.drawSnapIndicator = function(snapPoint) {
    if (!snapPoint) return;
    
    this.ctx.save();
    
    // Set colors and styles based on snap type
    let color = '#00ff00';
    let size = 8;
    let shape = 'circle';
    
    switch (snapPoint.type) {
        case 'endpoint-pole':
        case 'endpoint-line-start':
        case 'endpoint-line-end':
            color = '#ff6b6b'; // Red for endpoints
            shape = 'square';
            break;
        case 'midpoint':
            color = '#4ecdc4'; // Teal for midpoints
            shape = 'triangle';
            break;
        case 'intersection':
            color = '#ffe66d'; // Yellow for intersections
            shape = 'cross';
            size = 10;
            break;
        case 'perpendicular':
            color = '#a8e6cf'; // Light green for perpendicular
            shape = 'diamond';
            break;
        case 'parallel':
            color = '#ffd93d'; // Gold for parallel
            shape = 'arrow';
            break;
        case 'grid':
            color = '#95a5a6'; // Gray for grid
            shape = 'circle';
            size = 6;
            break;
        case 'center':
            color = '#e74c3c'; // Dark red for center
            shape = 'circle';
            break;
    }
    
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([]);
    
    // Draw shape based on type
    this.ctx.beginPath();
    
    switch (shape) {
        case 'circle':
            this.ctx.arc(snapPoint.x, snapPoint.y, size, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(snapPoint.x, snapPoint.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            break;
            
        case 'square':
            this.ctx.strokeRect(snapPoint.x - size/2, snapPoint.y - size/2, size, size);
            this.ctx.fillRect(snapPoint.x - 2, snapPoint.y - 2, 4, 4);
            break;
            
        case 'triangle':
            this.ctx.moveTo(snapPoint.x, snapPoint.y - size);
            this.ctx.lineTo(snapPoint.x - size, snapPoint.y + size/2);
            this.ctx.lineTo(snapPoint.x + size, snapPoint.y + size/2);
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(snapPoint.x, snapPoint.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            break;
            
        case 'cross':
            this.ctx.moveTo(snapPoint.x - size, snapPoint.y);
            this.ctx.lineTo(snapPoint.x + size, snapPoint.y);
            this.ctx.moveTo(snapPoint.x, snapPoint.y - size);
            this.ctx.lineTo(snapPoint.x, snapPoint.y + size);
            this.ctx.stroke();
            break;
            
        case 'diamond':
            this.ctx.moveTo(snapPoint.x, snapPoint.y - size);
            this.ctx.lineTo(snapPoint.x + size, snapPoint.y);
            this.ctx.lineTo(snapPoint.x, snapPoint.y + size);
            this.ctx.lineTo(snapPoint.x - size, snapPoint.y);
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(snapPoint.x, snapPoint.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            break;
            
        case 'arrow':
            this.ctx.moveTo(snapPoint.x - size, snapPoint.y);
            this.ctx.lineTo(snapPoint.x + size, snapPoint.y);
            this.ctx.lineTo(snapPoint.x + size/2, snapPoint.y - size/2);
            this.ctx.moveTo(snapPoint.x + size, snapPoint.y);
            this.ctx.lineTo(snapPoint.x + size/2, snapPoint.y + size/2);
            this.ctx.stroke();
            break;
    }
    
    // Draw snap description tooltip
    if (snapPoint.description) {
        this.drawSnapTooltip(snapPoint.x, snapPoint.y + size + 15, snapPoint.description, color);
    }
    
    this.ctx.restore();
};

/**
 * Draw snap tooltip
 */
DrawingEngine.prototype.drawSnapTooltip = function(x, y, text, color) {
    this.ctx.save();
    
    // Measure text
    this.ctx.font = '12px Arial';
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    const width = metrics.width + padding * 2;
    const height = 16;
    
    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Draw border
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width/2, y - height/2, width, height);
    
    // Draw text
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
};

/**
 * Draw a dimension
 */
DrawingEngine.prototype.drawDimension = function(dimension) {
    if (!dimension || !dimension.type) {
        console.warn("Invalid dimension object:", dimension);
        return;
    }

    this.ctx.save();
    this.ctx.strokeStyle = dimension.style.lineColor || '#f00';
    this.ctx.lineWidth = 0.6;
    this.ctx.fillStyle = dimension.style.textColor || '#000';
    this.ctx.font = `${dimension.style.fontSize * 0.5}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    switch (dimension.type) {
        case 'aligned':
            this.drawAlignedDimension(dimension);
            break;
        case 'angle':
            this.drawAngleDimension(dimension);
            break;
        default:
            console.warn("Unknown dimension type:", dimension.type);
            break;
    }
    this.ctx.restore();
};

DrawingEngine.prototype.drawPolePreview = function(x, y) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.5; // Make preview semi-transparent
    this.ctx.translate(x, y);

    // Draw pole symbol based on currentPoleType
    switch (this.currentPoleType) {
        case 'tiang-baja-existing':
            this.drawTiangBajaExisting();
            break;
        case 'tiang-baja-rencana':
            this.drawTiangBajaRencana();
            break;
        case 'tiang-beton-existing':
            this.drawTiangBetonExisting();
            break;
        case 'tiang-beton-rencana':
            this.drawTiangBetonRencana();
            break;
        case 'gardu-portal':
            this.drawGarduPortal();
            break;
        default: // Fallback, draw a simple circle
            this.ctx.fillStyle = '#888'; // A distinct preview color
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
            this.ctx.fill();
            break;
    }

    // Optionally, you could preview accessories too, if desired
    // if (this.addGrounding) { this.drawGrounding(); }
    // if (this.addGuywire) { this.drawGuywire(); }

    this.ctx.restore();
};