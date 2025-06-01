/**
 * Drawing Engine Dimensions Module
 * Handles all dimension-related functionality including angle dimensions
 */

/**
 * Draw dimension (main entry for all types)
 */
DrawingEngine.prototype.drawDimension = function(dimension) {
    this.ctx.save();

    if (dimension.type === 'angle') {
        if (dimension.method === '3-point') {
            this.drawAngleDimension3Point(dimension);
        } else if (dimension.method === '2-line') {
            this.drawAngleDimension2Line(dimension);
        }
    } else if (dimension.type === 'aligned') {
        this.drawAlignedDimension(dimension);
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
DrawingEngine.prototype.drawDimensionText = function(text, x, y, style, angle = 0) {
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
    
    // Translate and rotate for aligned text
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    // Draw background if enabled
    if (style.showBackground) {
        const padding = 4;
        const bgOpacity = (style.backgroundOpacity || 80) / 100;
        
        this.ctx.save();
        this.ctx.globalAlpha = bgOpacity;
        this.ctx.fillStyle = style.backgroundColor || '#ffffff';
        this.ctx.fillRect(
            -textWidth/2 - padding,
            -textHeight/2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        this.ctx.restore();
    }
    
    // Draw text
    this.ctx.fillStyle = style.textColor;
    this.ctx.fillText(text, 0, 0);
    
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
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.moveTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.stroke();
        
        // Draw arc
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
        
        this.ctx.fillStyle = this.dimensionStyle.textColor;
        this.ctx.font = `${this.dimensionStyle.textSize}px ${this.dimensionStyle.font}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${angle.toFixed(this.dimensionStyle.precision)}°`, textX, textY);
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

/**
 * Draw aligned dimension
 */
DrawingEngine.prototype.drawAlignedDimension = function(dimension) {
    const [p1, p2] = dimension.points;
    const style = dimension.style;
    const distance = dimension.distance;

    // Calculate angle for orientation
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    // Set line style
    this.ctx.save();
    this.ctx.globalAlpha = (style.lineOpacity || 100) / 100;
    this.ctx.strokeStyle = style.lineColor;
    this.ctx.lineWidth = style.lineWidth || 1;
    this.setLineStyle(style.lineStyle || 'solid');

    // Draw dimension line (offset from the actual line)
    const offset = style.offset || 20; // Default offset
    const offsetX = offset * Math.sin(angle);
    const offsetY = -offset * Math.cos(angle);

    const dimP1 = { x: p1.x + offsetX, y: p1.y + offsetY };
    const dimP2 = { x: p2.x + offsetX, y: p2.y + offsetY };

    this.ctx.beginPath();
    this.ctx.moveTo(dimP1.x, dimP1.y);
    this.ctx.lineTo(dimP2.x, dimP2.y);
    this.ctx.stroke();

    // Draw extension lines
    const extension = style.extension || 10; // Default extension
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(dimP1.x + extension * Math.sin(angle), dimP1.y - extension * Math.cos(angle)); // Adjusted extension line start
    this.ctx.moveTo(p2.x, p2.y);
    this.ctx.lineTo(dimP2.x + extension * Math.sin(angle), dimP2.y - extension * Math.cos(angle)); // Adjusted extension line start
    this.ctx.stroke();

    // Draw arrows if enabled
    if (style.showArrows) {
        this.drawArrowHead(dimP1.x, dimP1.y, angle + Math.PI, style);
        this.drawArrowHead(dimP2.x, dimP2.y, angle, style);
    }

    this.ctx.restore(); // Restore context to remove line opacity for subsequent drawings

    // Format distance text
    const distanceText = this.formatDistanceText(distance, style);

    // Draw text (with full opacity)
    const textX = (dimP1.x + dimP2.x) / 2;
    const textY = (dimP1.y + dimP2.y) / 2;

    this.ctx.save(); // Save context before drawing text
    this.ctx.globalAlpha = 1; // Ensure text is fully opaque
    this.drawDimensionText(distanceText, textX, textY, style, angle); // Pass angle for rotation
    this.ctx.restore(); // Restore context after drawing text
};

/**
 * Format distance text with prefix, suffix, and unit
 */
DrawingEngine.prototype.formatDistanceText = function(distance, style) {
    let formattedDistance = distance.toFixed(style.precision);
    let displayUnit = style.unit;

    // For aligned dimensions, distance is already in real-world units (meters).
    // No further conversion needed, just formatting and unit display.
    // If the style's unit is explicitly 'm', use 'm'. Otherwise, it defaults to 'px'.
    if (style.unit === 'm') {
        displayUnit = 'm';
    } else if (style.unit === 'px') {
        displayUnit = 'px';
    }
    
    return `${style.prefix}${formattedDistance}${displayUnit}${style.suffix}`;
};

/**
 * Draw aligned dimension preview
 */
DrawingEngine.prototype.drawAlignedDimensionPreview = function(preview) {
    this.ctx.save();
    this.ctx.strokeStyle = '#ff6b6b'; // Preview color
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]); // Dashed line for preview

    if (preview.points.length === 1) {
        // Just draw the line from the first point to the cursor
        const [p1, p2] = [preview.points[0], preview.currentPoint];
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();

        // Optionally draw a temporary aligned dimension for live preview
        const tempDimension = {
            type: 'aligned',
            points: [p1, p2],
            style: preview.style, // Use the current style for preview
            distance: this.calculateDistance(p1.x, p1.y, p2.x, p2.y)
        };
        this.drawAlignedDimension(tempDimension);

    } else if (preview.points.length === 2) {
        // Draw the full aligned dimension preview (already handled by drawAlignedDimension)
        const [p1, p2] = preview.points;
        const tempDimension = {
            type: 'aligned',
            points: [p1, p2],
            style: preview.style,
            distance: this.calculateDistance(p1.x, p1.y, p2.x, p2.y)
        };
        this.drawAlignedDimension(tempDimension);
    }

    this.ctx.restore();
};

/**
 * Draw dimension preview (main entry for all types)
 */
DrawingEngine.prototype.drawDimensionPreview = function(preview) {
    if (preview.type === 'angle') {
        this.drawAnglePreview(preview);
    } else if (preview.type === 'aligned') {
        this.drawAlignedDimensionPreview(preview);
    }
};

// Define conversion rates (example values, adjust as needed)
DrawingEngine.conversions = {
    pxToMm: 0.264583, // 1 pixel = 0.264583 mm (approx 96 DPI)
    pxToCm: 0.0264583,
    pxToM: 0.0000264583,
    pxToKm: 0.0000000264583,
    pxToIn: 0.0104167, // 1 pixel = 0.0104167 inches
    pxToFt: 0.000868056,
    pxToYd: 0.000289352,
    pxToMi: 0.0000000164629
};

// Add new dimension type to supported types if necessary
// DrawingEngine.supportedDimensionTypes.push('aligned'); // Assuming such an array exists

// Example of how to integrate it into the main draw function
// DrawingEngine.prototype.draw = function() {
//     // ... existing drawing logic ...
//     this.dimensions.forEach(dim => {
//         this.drawDimension(dim);
//     });
//     // ... existing drawing logic ...
// };

/**
 * Check if point is within a dimension
 */
DrawingEngine.prototype.isPointInDimension = function(x, y, dimension) {
    const hitTolerance = 5 / this.zoom;

    if (dimension.type === 'angle') {
        // For angle dimensions, check if point is near the arc or text
        const [p1, p2, p3] = dimension.points;
        const radius = dimension.style.arcSize || 30;
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

        // Check arc
        const distToCenter = Math.sqrt(Math.pow(x - p2.x, 2) + Math.pow(y - p2.y, 2));
        const angleToPoint = Math.atan2(y - p2.y, x - p2.x);

        const startAngle = Math.min(angle1, angle2);
        const endAngle = Math.max(angle1, angle2);

        const inAngleRange = angleToPoint >= startAngle && angleToPoint <= endAngle;
        const nearArc = Math.abs(distToCenter - radius) < hitTolerance;

        if (nearArc && inAngleRange) return true;

        // Check text (simplified, assume text is near p2)
        const textX = p2.x + Math.cos((angle1 + angle2) / 2) * (radius + 20);
        const textY = p2.y + Math.sin((angle1 + angle2) / 2) * (radius + 20);
        if (this.isPointNearText(x, y, textX, textY, dimension.angle, dimension.style)) return true;

    } else if (dimension.type === 'aligned') {
        if (!dimension.points || dimension.points.length < 2) {
            return false; // Not enough points for an aligned dimension
        }
        const [p1, p2] = dimension.points;
        const style = dimension.style;

        // Calculate angle and offset for dimension line points
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const offset = style.offset || 20;
        const offsetX = offset * Math.sin(angle);
        const offsetY = -offset * Math.cos(angle);

        const dimP1 = { x: p1.x + offsetX, y: p1.y + offsetY };
        const dimP2 = { x: p2.x + offsetX, y: p2.y + offsetY };

        // Check dimension line
        if (this.isPointOnLine(x, y, { startX: dimP1.x, startY: dimP1.y, endX: dimP2.x, endY: dimP2.y }, hitTolerance)) return true;

        // Check extension lines
        const extension = style.extension || 10;
        const extLine1End = { x: dimP1.x + extension * Math.sin(angle), y: dimP1.y - extension * Math.cos(angle) };
        const extLine2End = { x: dimP2.x + extension * Math.sin(angle), y: dimP2.y - extension * Math.cos(angle) };

        if (this.isPointOnLine(x, y, { startX: p1.x, startY: p1.y, endX: extLine1End.x, endY: extLine1End.y }, hitTolerance)) return true;
        if (this.isPointOnLine(x, y, { startX: p2.x, startY: p2.y, endX: extLine2End.x, endY: extLine2End.y }, hitTolerance)) return true;

        // Check text
        const textX = (dimP1.x + dimP2.x) / 2;
        const textY = (dimP1.y + dimP2.y) / 2;
        if (this.isPointNearText(x, y, textX, textY, angle, style)) return true;
    }

    return false;
};

/**
 * Check if point is near text
 */
DrawingEngine.prototype.isPointNearText = function(px, py, textX, textY, angle, style) {
    this.ctx.save();
    const fontStyle = style.textStyle || 'normal';
    this.ctx.font = `${fontStyle} ${style.textSize}px ${style.font || 'Arial'}`;
    const metrics = this.ctx.measureText("000.00°"); // Use a representative text for measurement
    const textWidth = metrics.width;
    const textHeight = style.textSize;
    this.ctx.restore();

    // Transform point back to text's local coordinate system
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const translatedPx = px - textX;
    const translatedPy = py - textY;
    const rotatedPx = translatedPx * cos - translatedPy * sin;
    const rotatedPy = translatedPx * sin + translatedPy * cos;

    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;

    return rotatedPx >= -halfWidth && rotatedPx <= halfWidth &&
           rotatedPy >= -halfHeight && rotatedPy <= halfHeight;
};

/**
 * Check if dimension intersects with rectangle
 */
DrawingEngine.prototype.isDimensionIntersectingRect = function(dimension, minX, minY, maxX, maxY) {
    // Helper to check if a point is within the selection rectangle
    const isPointInRect = (px, py) => px >= minX && px <= maxX && py >= minY && py <= maxY;

    // Helper to check if a line segment intersects the rectangle
    const isLineRectIntersecting = (line) => {
        return this.isLineIntersectingRect(line, minX, minY, maxX, maxY);
    };

    if (dimension.type === 'angle') {
        const [p1, p2, p3] = dimension.points;
        // Check if the center point (p2) is within the rectangle
        if (isPointInRect(p2.x, p2.y)) return true;

        // Check if the lines forming the angle intersect the rectangle
        if (isLineRectIntersecting({ startX: p1.x, startY: p1.y, endX: p2.x, endY: p2.y })) return true;
        if (isLineRectIntersecting({ startX: p3.x, startY: p3.y, endX: p2.x, endY: p2.y })) return true;

        // For simplicity, we can also check the bounding box of the arc and text
        // This is a rough check, can be made more precise if needed
        const radius = dimension.style.arcSize || 30;
        const textOffset = radius + 20;
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        const midAngle = (angle1 + angle2) / 2;
        const textX = p2.x + Math.cos(midAngle) * textOffset;
        const textY = p2.y + Math.sin(midAngle) * textOffset;

        if (isPointInRect(textX, textY)) return true;

    } else if (dimension.type === 'aligned') {
        if (!dimension.points || dimension.points.length < 2) {
            return false; // Not enough points for an aligned dimension
        }
        const [p1, p2] = dimension.points;
        const style = dimension.style;

        // Calculate angle and offset for dimension line points
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const offset = style.offset || 20;
        const offsetX = offset * Math.sin(angle);
        const offsetY = -offset * Math.cos(angle);

        const dimP1 = { x: p1.x + offsetX, y: p1.y + offsetY };
        const dimP2 = { x: p2.x + offsetX, y: p2.y + offsetY };

        // Check if any of the four defining points (p1, p2, dimP1, dimP2) are within the rectangle
        if (isPointInRect(p1.x, p1.y) || isPointInRect(p2.x, p2.y) ||
            isPointInRect(dimP1.x, dimP1.y) || isPointInRect(dimP2.x, dimP2.y)) return true;

        // Check if the dimension line (dimP1-dimP2) or extension lines intersect the rectangle
        if (isLineRectIntersecting({ startX: dimP1.x, startY: dimP1.y, endX: dimP2.x, endY: dimP2.y })) return true;

        const extension = style.extension || 10;
        const extLine1End = { x: dimP1.x + extension * Math.sin(angle), y: dimP1.y - extension * Math.cos(angle) };
        const extLine2End = { x: dimP2.x + extension * Math.sin(angle), y: dimP2.y - extension * Math.cos(angle) };

        if (isLineRectIntersecting({ startX: p1.x, startY: p1.y, endX: extLine1End.x, endY: extLine1End.y })) return true;
        if (isLineRectIntersecting({ startX: p2.x, startY: p2.y, endX: extLine2End.x, endY: extLine2End.y })) return true;

        // Check the text position
        const textX = (dimP1.x + dimP2.x) / 2;
        const textY = (dimP1.y + dimP2.y) / 2;
        if (isPointInRect(textX, textY)) return true;
    }

    return false;
};