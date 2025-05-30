/**
 * Drawing Engine Dimensions Module
 * Handles all dimension-related functionality including angle dimensions
 */

/**
 * Draw dimension (angle dimensions)
 */
DrawingEngine.prototype.drawDimension = function(dimension) {
    if (dimension.type !== 'angle') return;
    
    this.ctx.save();
    
    if (dimension.method === '3-point') {
        this.drawAngleDimension3Point(dimension);
    } else if (dimension.method === '2-line') {
        this.drawAngleDimension2Line(dimension);
    }
    
    this.ctx.restore();
};

/**
 * Draw 3-point angle dimension
 */
DrawingEngine.prototype.drawAngleDimension3Point = function(dimension) {
    const [p1, p2, p3] = dimension.points;
    const style = dimension.style;
    
    // Draw angle arc
    const radius = style.arcSize || 30;
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    
    // Set line style with opacity
    this.ctx.save();
    this.ctx.globalAlpha = (style.lineOpacity || 100) / 100;
    this.ctx.strokeStyle = style.lineColor;
    this.ctx.lineWidth = style.lineWidth || 1;
    this.setLineStyle(style.lineStyle || 'solid');
    
    this.ctx.beginPath();
    this.ctx.arc(p2.x, p2.y, radius, angle1, angle2);
    this.ctx.stroke();
    
    // Draw dimension lines
    this.ctx.beginPath();
    this.ctx.moveTo(p2.x, p2.y);
    this.ctx.lineTo(p2.x + Math.cos(angle1) * (radius + 10), p2.y + Math.sin(angle1) * (radius + 10));
    this.ctx.moveTo(p2.x, p2.y);
    this.ctx.lineTo(p2.x + Math.cos(angle2) * (radius + 10), p2.y + Math.sin(angle2) * (radius + 10));
    this.ctx.stroke();
    this.ctx.restore();
    
    // Draw arrows if enabled
    if (style.showArrows) {
        this.drawArrowHead(p2.x + Math.cos(angle1) * radius, p2.y + Math.sin(angle1) * radius, angle1 + Math.PI, style);
        this.drawArrowHead(p2.x + Math.cos(angle2) * radius, p2.y + Math.sin(angle2) * radius, angle2 + Math.PI, style);
    }
    
    // Format angle text
    const angleText = this.formatAngleText(dimension.angle, style);
    
    // Draw text
    const midAngle = (angle1 + angle2) / 2;
    const textX = p2.x + Math.cos(midAngle) * (radius + 20);
    const textY = p2.y + Math.sin(midAngle) * (radius + 20);
    
    this.drawDimensionText(angleText, textX, textY, style);
    
    // Reset line style
    this.ctx.setLineDash([]);
};

/**
 * Draw 2-line angle dimension
 */
DrawingEngine.prototype.drawAngleDimension2Line = function(dimension) {
    const [line1, line2] = dimension.lines;
    const intersection = dimension.intersection;
    const style = dimension.style;
    
    if (!intersection) return;
    
    // Calculate line directions
    const v1 = { x: line1.endX - line1.startX, y: line1.endY - line1.startY };
    const v2 = { x: line2.endX - line2.startX, y: line2.endY - line2.startY };
    
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    
    // Draw angle arc
    const radius = style.arcSize || 40;
    this.ctx.save();
    this.ctx.globalAlpha = (style.lineOpacity || 100) / 100;
    this.ctx.strokeStyle = style.lineColor;
    this.ctx.lineWidth = style.lineWidth || 1;
    this.setLineStyle(style.lineStyle || 'solid');
    
    this.ctx.beginPath();
    this.ctx.arc(intersection.x, intersection.y, radius, Math.min(angle1, angle2), Math.max(angle1, angle2));
    this.ctx.stroke();
    this.ctx.restore();
    
    // Draw arrows if enabled
    if (style.showArrows) {
        this.drawArrowHead(intersection.x + Math.cos(angle1) * radius, intersection.y + Math.sin(angle1) * radius, angle1 + Math.PI, style);
        this.drawArrowHead(intersection.x + Math.cos(angle2) * radius, intersection.y + Math.sin(angle2) * radius, angle2 + Math.PI, style);
    }
    
    // Format angle text
    const angleText = this.formatAngleText(dimension.angle, style);
    
    // Draw text
    const midAngle = (angle1 + angle2) / 2;
    const textX = intersection.x + Math.cos(midAngle) * (radius + 20);
    const textY = intersection.y + Math.sin(midAngle) * (radius + 20);
    
    this.drawDimensionText(angleText, textX, textY, style);
    
    // Reset line style
    this.ctx.setLineDash([]);
};

/**
 * Format angle text with prefix, suffix, and unit
 */
DrawingEngine.prototype.formatAngleText = function(angle, style) {
    let formattedAngle;
    
    // Convert angle based on unit
    switch (style.unit) {
        case 'rad':
            formattedAngle = (angle * Math.PI / 180).toFixed(style.precision);
            break;
        case 'grad':
            formattedAngle = (angle * 10 / 9).toFixed(style.precision);
            break;
        case '°':
        default:
            formattedAngle = angle.toFixed(style.precision);
            break;
    }
    
    return `${style.prefix}${formattedAngle}${style.unit}${style.suffix}`;
};

/**
 * Draw dimension text with background and styling
 */
DrawingEngine.prototype.drawDimensionText = function(text, x, y, style) {
    this.ctx.save();
    
    // Set font
    const fontStyle = style.textStyle || 'normal';
    this.ctx.font = `${fontStyle} ${style.textSize}px ${style.font || 'Arial'}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Measure text for background
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = style.textSize;
    
    // Draw background if enabled
    if (style.showBackground) {
        const padding = 4;
        const bgOpacity = (style.backgroundOpacity || 80) / 100;
        
        this.ctx.save();
        this.ctx.globalAlpha = bgOpacity;
        this.ctx.fillStyle = style.backgroundColor || '#ffffff';
        this.ctx.fillRect(
            x - textWidth/2 - padding,
            y - textHeight/2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        this.ctx.restore();
    }
    
    // Draw text
    this.ctx.fillStyle = style.textColor;
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
};

/**
 * Set line dash style
 */
DrawingEngine.prototype.setLineStyle = function(style) {
    switch (style) {
        case 'dashed':
            this.ctx.setLineDash([8, 4]);
            break;
        case 'dotted':
            this.ctx.setLineDash([2, 2]);
            break;
        case 'solid':
        default:
            this.ctx.setLineDash([]);
            break;
    }
};

/**
 * Draw arrow head
 */
DrawingEngine.prototype.drawArrowHead = function(x, y, angle, style) {
    const size = 8;
    
    this.ctx.save();
    this.ctx.globalAlpha = (style.lineOpacity || 100) / 100;
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    
    this.ctx.fillStyle = style.lineColor;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-size, -size/2);
    this.ctx.lineTo(-size, size/2);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
};

/**
 * Draw angle preview
 */
DrawingEngine.prototype.drawAnglePreview = function(preview) {
    this.ctx.save();
    this.ctx.strokeStyle = '#ff6b6b';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    if (preview.points.length === 2) {
        // Preview line from first point to cursor
        const [p1, p2] = preview.points;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    } else if (preview.points.length === 3) {
        // Preview angle with 3 points
        const [p1, p2, p3] = preview.points;
        
        // Draw lines
        this.ctx.beginPath();
        this.ctx.moveTo(p2.x, p2.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.moveTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.stroke();
        
        // Draw preview arc
        const radius = 30;
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        
        this.ctx.beginPath();
        this.ctx.arc(p2.x, p2.y, radius, angle1, angle2);
        this.ctx.stroke();
        
        // Show preview angle value
        const angle = this.calculateAngle3Points(p1, p2, p3);
        const midAngle = (angle1 + angle2) / 2;
        const textX = p2.x + Math.cos(midAngle) * (radius + 20);
        const textY = p2.y + Math.sin(midAngle) * (radius + 20);
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = `${this.dimensionStyle.textSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${angle}${this.dimensionStyle.unit}`, textX, textY);
    }
    
    this.ctx.restore();
};

/**
 * Reset angle tool state
 */
DrawingEngine.prototype.resetAngleTool = function() {
    this.angleState = {
        mode: 'none',
        points: [],
        lines: [],
        previewAngle: null
    };
    this.render();
};

/**
 * Handle angle tool click
 */
DrawingEngine.prototype.handleAngleToolClick = function(x, y) {
    const snapPoint = this.findSnapPoint(x, y);
    const clickPoint = snapPoint ? { x: snapPoint.x, y: snapPoint.y } : { x, y };
    
    // Try to find clicked element
    const clickedPole = this.findPoleAt(clickPoint.x, clickPoint.y);
    const clickedLine = this.findLineAt(clickPoint.x, clickPoint.y);
    
    switch (this.angleState.mode) {
        case 'selecting-first':
            if (clickedPole) {
                this.angleState.points = [clickPoint];
                this.angleState.mode = 'selecting-second';
                this.showAngleInstructions('Click second point or line');
            } else if (clickedLine) {
                this.angleState.lines = [clickedLine];
                this.angleState.mode = 'selecting-second';
                this.showAngleInstructions('Click second line');
            }
            break;
            
        case 'selecting-second':
            if (this.angleState.points.length > 0) {
                // 3-point angle mode
                this.angleState.points.push(clickPoint);
                this.angleState.mode = 'selecting-third';
                this.showAngleInstructions('Click third point (vertex will be middle point)');
            } else if (this.angleState.lines.length > 0 && clickedLine) {
                // 2-line angle mode
                this.angleState.lines.push(clickedLine);
                this.createAngleDimension();
            }
            break;
            
        case 'selecting-third':
            if (this.angleState.points.length === 2) {
                this.angleState.points.push(clickPoint);
                this.createAngleDimension();
            }
            break;
    }
    
    this.render();
};

/**
 * Update angle preview
 */
DrawingEngine.prototype.updateAnglePreview = function(x, y) {
    if (this.angleState.mode === 'none') return;
    
    const snapPoint = this.findSnapPoint(x, y);
    const previewPoint = snapPoint ? { x: snapPoint.x, y: snapPoint.y } : { x, y };
    
    if (this.angleState.mode === 'selecting-second' && this.angleState.points.length === 1) {
        this.angleState.previewAngle = {
            points: [this.angleState.points[0], previewPoint],
            isPreview: true
        };
    } else if (this.angleState.mode === 'selecting-third' && this.angleState.points.length === 2) {
        this.angleState.previewAngle = {
            points: [this.angleState.points[0], this.angleState.points[1], previewPoint],
            isPreview: true
        };
    }
    
    this.render();
};

/**
 * Create angle dimension
 */
DrawingEngine.prototype.createAngleDimension = function() {
    let angle = null;
    
    if (this.angleState.points.length === 3) {
        // 3-point angle
        const [p1, p2, p3] = this.angleState.points;
        angle = this.calculateAngle3Points(p1, p2, p3);
        
        const dimension = {
            id: 'angle_' + Date.now(),
            type: 'angle',
            method: '3-point',
            points: [p1, p2, p3],
            angle: angle,
            style: { ...this.dimensionStyle }
        };
        
        this.elements.dimensions.push(dimension);
        this.executeCommand(new AddDimensionCommand(this, dimension));
        
    } else if (this.angleState.lines.length === 2) {
        // 2-line angle
        const [line1, line2] = this.angleState.lines;
        const intersection = this.findLinesIntersection(line1, line2);
        
        if (intersection) {
            angle = this.calculateAngle2Lines(line1, line2);
            
            const dimension = {
                id: 'angle_' + Date.now(),
                type: 'angle',
                method: '2-line',
                lines: [line1, line2],
                intersection: intersection,
                angle: angle,
                style: { ...this.dimensionStyle }
            };
            
            this.elements.dimensions.push(dimension);
            this.executeCommand(new AddDimensionCommand(this, dimension));
        }
    }
    
    this.resetAngleTool();
    this.angleState.mode = 'selecting-first';
    
    if (this.onElementsChanged) {
        this.onElementsChanged();
    }
};

/**
 * Calculate angle from 3 points (vertex is middle point)
 */
DrawingEngine.prototype.calculateAngle3Points = function(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
    
    return Math.round(angle * Math.pow(10, this.dimensionStyle.precision)) / Math.pow(10, this.dimensionStyle.precision);
};

/**
 * Calculate angle between 2 lines
 */
DrawingEngine.prototype.calculateAngle2Lines = function(line1, line2) {
    const v1 = { x: line1.endX - line1.startX, y: line1.endY - line1.startY };
    const v2 = { x: line2.endX - line2.startX, y: line2.endY - line2.startY };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = Math.abs(dot) / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
    
    return Math.round(angle * Math.pow(10, this.dimensionStyle.precision)) / Math.pow(10, this.dimensionStyle.precision);
};

/**
 * Find intersection between two lines
 */
DrawingEngine.prototype.findLinesIntersection = function(line1, line2) {
    const x1 = line1.startX, y1 = line1.startY, x2 = line1.endX, y2 = line1.endY;
    const x3 = line2.startX, y3 = line2.startY, x4 = line2.endX, y4 = line2.endY;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Return intersection point (extend lines if necessary)
    return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
    };
};

/**
 * Find pole at coordinates
 */
DrawingEngine.prototype.findPoleAt = function(x, y) {
    for (let pole of this.elements.poles) {
        if (this.isPointInPole(x, y, pole)) {
            return pole;
        }
    }
    return null;
};

/**
 * Find line at coordinates
 */
DrawingEngine.prototype.findLineAt = function(x, y) {
    for (let line of this.elements.lines) {
        if (this.isPointOnLine(x, y, line)) {
            return line;
        }
    }
    return null;
};

/**
 * Show angle tool instructions
 */
DrawingEngine.prototype.showAngleInstructions = function(message) {
    // Create or update instruction overlay
    let overlay = document.getElementById('angleInstructions');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'angleInstructions';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.textContent = message;
    
    // Auto-hide after 3 seconds
    clearTimeout(overlay.hideTimeout);
    overlay.hideTimeout = setTimeout(() => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 3000);
};