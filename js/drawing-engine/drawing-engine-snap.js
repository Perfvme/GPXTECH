/**
 * Drawing Engine Snap Module
 * Handles all snap functionality including snap points, snap types, and snap configuration
 */

/**
 * Toggle snap enabled/disabled
 */
DrawingEngine.prototype.toggleSnap = function(enabled) {
    this.snapEnabled = enabled;
    if (!enabled) {
        this.snapPoint = null;
        this.snapCache.clear();
    }
    this.render();
};

/**
 * Set snap enabled state (called from UI)
 */
DrawingEngine.prototype.setSnapEnabled = function(enabled) {
    this.toggleSnap(enabled);
};

/**
 * Set specific snap type enabled/disabled
 */
DrawingEngine.prototype.setSnapType = function(type, enabled) {
    if (this.snapTypes.hasOwnProperty(type)) {
        this.snapTypes[type] = enabled;
        this.snapCache.clear();
        this.render();
    }
};

/**
 * Set snap distance
 */
DrawingEngine.prototype.setSnapDistance = function(distance) {
    this.snapDistance = Math.max(5, Math.min(50, distance)); // Clamp between 5 and 50
    this.snapCache.clear();
    this.render();
};

/**
 * Find snap point near given coordinates with comprehensive snap types
 */
DrawingEngine.prototype.findSnapPoint = function(x, y, excludeElement = null) {
    if (!this.snapEnabled) return null;
    
    const now = Date.now();
    if (now - this.lastSnapUpdate < this.snapUpdateThrottle) {
        // Use cached result for performance
        const cacheKey = `${Math.round(x)},${Math.round(y)}`;
        if (this.snapCache.has(cacheKey)) {
            return this.snapCache.get(cacheKey);
        }
    }
    
    let bestSnap = null;
    let bestDistance = this.snapDistance;
    
    // Check snap points in priority order
    for (let snapType of this.snapPriority) {
        if (!this.snapTypes[snapType]) continue;
        
        let snapPoints = [];
        
        switch (snapType) {
            case 'endpoints':
                snapPoints = this.findEndpointSnaps(x, y, excludeElement);
                break;
            case 'intersections':
                snapPoints = this.findIntersectionSnaps(x, y, excludeElement);
                break;
            case 'midpoints':
                snapPoints = this.findMidpointSnaps(x, y, excludeElement);
                break;
            case 'perpendicular':
                snapPoints = this.findPerpendicularSnaps(x, y, excludeElement);
                break;
            case 'grid':
                snapPoints = this.findGridSnaps(x, y);
                break;
            case 'center':
                snapPoints = this.findCenterSnaps(x, y, excludeElement);
                break;
            case 'parallel':
                snapPoints = this.findParallelSnaps(x, y, excludeElement);
                break;
        }
        
        // Find closest snap point of this type
        for (let snap of snapPoints) {
            const distance = Math.sqrt((x - snap.x) ** 2 + (y - snap.y) ** 2);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestSnap = snap;
            }
        }
        
        // If we found a high-priority snap, use it
        if (bestSnap && ['endpoints', 'intersections'].includes(snapType)) {
            break;
        }
    }
    
    // Cache the result
    const cacheKey = `${Math.round(x)},${Math.round(y)}`;
    this.snapCache.set(cacheKey, bestSnap);
    this.lastSnapUpdate = now;
    
    // Clean cache periodically
    if (this.snapCache.size > 100) {
        this.snapCache.clear();
    }
    
    return bestSnap;
};

/**
 * Update snap point for cursor position
 */
DrawingEngine.prototype.updateSnapPoint = function(x, y) {
    this.snapPoint = this.findSnapPoint(x, y);
};

/**
 * Find endpoint snap points (poles and line endpoints)
 */
DrawingEngine.prototype.findEndpointSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    
    // Check poles
    for (let pole of this.elements.poles) {
        if (excludeElement && pole.id === excludeElement.id) continue;
        snapPoints.push({
            x: pole.x,
            y: pole.y,
            type: 'endpoint-pole',
            element: pole,
            description: `Pole: ${pole.name || 'Unnamed'}`
        });
    }
    
    // Check line endpoints
    for (let line of this.elements.lines) {
        if (excludeElement && line.id === excludeElement.id) continue;
        
        snapPoints.push({
            x: line.startX,
            y: line.startY,
            type: 'endpoint-line-start',
            element: line,
            description: `Line Start: ${line.name || 'Unnamed'}`
        });
        
        snapPoints.push({
            x: line.endX,
            y: line.endY,
            type: 'endpoint-line-end',
            element: line,
            description: `Line End: ${line.name || 'Unnamed'}`
        });
    }
    
    return snapPoints;
};

/**
 * Find midpoint snap points
 */
DrawingEngine.prototype.findMidpointSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    
    for (let line of this.elements.lines) {
        if (excludeElement && line.id === excludeElement.id) continue;
        
        const midX = (line.startX + line.endX) / 2;
        const midY = (line.startY + line.endY) / 2;
        
        snapPoints.push({
            x: midX,
            y: midY,
            type: 'midpoint',
            element: line,
            description: `Midpoint: ${line.name || 'Unnamed'}`
        });
    }
    
    return snapPoints;
};

/**
 * Find grid snap points
 */
DrawingEngine.prototype.findGridSnaps = function(x, y) {
    if (!this.snapToGrid || !this.showGrid) return [];
    
    const snapX = Math.round(x / this.gridSize) * this.gridSize;
    const snapY = Math.round(y / this.gridSize) * this.gridSize;
    
    return [{
        x: snapX,
        y: snapY,
        type: 'grid',
        element: null,
        description: `Grid (${snapX}, ${snapY})`
    }];
};

/**
 * Find intersection snap points
 */
DrawingEngine.prototype.findIntersectionSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    const lines = this.elements.lines.filter(line => 
        !excludeElement || line.id !== excludeElement.id
    );
    
    // Check intersections between all line pairs
    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const intersection = this.getLineIntersection(
                lines[i].startX, lines[i].startY, lines[i].endX, lines[i].endY,
                lines[j].startX, lines[j].startY, lines[j].endX, lines[j].endY
            );
            
            if (intersection) {
                snapPoints.push({
                    x: intersection.x,
                    y: intersection.y,
                    type: 'intersection',
                    element: { line1: lines[i], line2: lines[j] },
                    description: `Intersection: ${lines[i].name || 'Line'} × ${lines[j].name || 'Line'}`
                });
            }
        }
    }
    
    return snapPoints;
};

/**
 * Find perpendicular snap points
 */
DrawingEngine.prototype.findPerpendicularSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    
    if (!this.tempLine) return snapPoints;
    
    for (let line of this.elements.lines) {
        if (excludeElement && line.id === excludeElement.id) continue;
        
        // Find perpendicular point from current line start to this line
        const perpPoint = this.getPerpendicularPoint(
            this.tempLine.startX, this.tempLine.startY,
            line.startX, line.startY, line.endX, line.endY
        );
        
        if (perpPoint) {
            snapPoints.push({
                x: perpPoint.x,
                y: perpPoint.y,
                type: 'perpendicular',
                element: line,
                description: `Perpendicular to: ${line.name || 'Line'}`
            });
        }
    }
    
    return snapPoints;
};

/**
 * Find parallel snap points
 */
DrawingEngine.prototype.findParallelSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    
    if (!this.tempLine) return snapPoints;
    
    const currentAngle = Math.atan2(
        y - this.tempLine.startY,
        x - this.tempLine.startX
    );
    
    for (let line of this.elements.lines) {
        if (excludeElement && line.id === excludeElement.id) continue;
        
        const lineAngle = Math.atan2(
            line.endY - line.startY,
            line.endX - line.startX
        );
        
        // Check if angles are parallel (within tolerance)
        const angleDiff = Math.abs(currentAngle - lineAngle);
        const tolerance = Math.PI / 36; // 5 degrees
        
        if (angleDiff < tolerance || Math.abs(angleDiff - Math.PI) < tolerance) {
            // Project current mouse position along the parallel direction
            const distance = Math.sqrt(
                (x - this.tempLine.startX) ** 2 + (y - this.tempLine.startY) ** 2
            );
            
            const snapX = this.tempLine.startX + distance * Math.cos(lineAngle);
            const snapY = this.tempLine.startY + distance * Math.sin(lineAngle);
            
            snapPoints.push({
                x: snapX,
                y: snapY,
                type: 'parallel',
                element: line,
                description: `Parallel to: ${line.name || 'Line'}`
            });
        }
    }
    
    return snapPoints;
};

/**
 * Find center snap points
 */
DrawingEngine.prototype.findCenterSnaps = function(x, y, excludeElement = null) {
    const snapPoints = [];
    
    // For now, center snaps are the same as pole positions
    // Could be extended for geometric centers of complex shapes
    for (let pole of this.elements.poles) {
        if (excludeElement && pole.id === excludeElement.id) continue;
        snapPoints.push({
            x: pole.x,
            y: pole.y,
            type: 'center',
            element: pole,
            description: `Center: ${pole.name || 'Unnamed'}`
        });
    }
    
    return snapPoints;
};

/**
 * Calculate intersection point between two lines
 */
DrawingEngine.prototype.getLineIntersection = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    
    return null;
};

/**
 * Get perpendicular point from a point to a line
 */
DrawingEngine.prototype.getPerpendicularPoint = function(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return null; // Line has zero length
    
    const param = dot / lenSq;
    
    // Clamp to line segment
    const clampedParam = Math.max(0, Math.min(1, param));
    
    return {
        x: x1 + clampedParam * C,
        y: y1 + clampedParam * D
    };
};