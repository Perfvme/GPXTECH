/**
 * Drawing Engine Selection Methods
 * Contains methods for handling element selection, drag selection, and selection utilities
 */

/**
 * Handle element selection at given coordinates
 */
DrawingEngine.prototype.handleSelect = function(x, y) {
    this.selectedElement = null;
    this.selectedElements = new Set(); // For multiple selection
    this.dragSelection = {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    };
    
    // Check poles first (they're on top)
    for (let pole of this.elements.poles) {
        if (this.isPointInPole(x, y, pole)) {
            this.selectedElement = pole;
            this.updatePropertiesPanel(pole);
            this.render();
            return;
        }
    }
    
    // Check lines
    for (let line of this.elements.lines) {
        if (this.isPointOnLine(x, y, line)) {
            this.selectedElement = line;
            this.updatePropertiesPanel(line);
            this.render();
            return;
        }
    }
    
    // Check dimensions
    for (let dimension of this.elements.dimensions) {
        if (this.isPointInDimension(x, y, dimension)) {
            this.selectedElement = dimension;
            this.updatePropertiesPanel(dimension);
            this.render();
            return;
        }
    }
    
    // Nothing selected
    this.updatePropertiesPanel(null);
    this.render();
};

/**
 * Start drag selection
 */
DrawingEngine.prototype.startDragSelection = function(x, y) {
    this.dragSelection.active = true;
    this.dragSelection.startX = x;
    this.dragSelection.startY = y;
    this.dragSelection.endX = x;
    this.dragSelection.endY = y;
    this.selectedElements.clear();
    this.selectedElement = null;
};

/**
 * Update drag selection
 */
DrawingEngine.prototype.updateDragSelection = function(x, y) {
    this.dragSelection.endX = x;
    this.dragSelection.endY = y;
    this.render();
};

/**
 * Finish drag selection
 */
DrawingEngine.prototype.finishDragSelection = function() {
    const minX = Math.min(this.dragSelection.startX, this.dragSelection.endX);
    const maxX = Math.max(this.dragSelection.startX, this.dragSelection.endX);
    const minY = Math.min(this.dragSelection.startY, this.dragSelection.endY);
    const maxY = Math.max(this.dragSelection.startY, this.dragSelection.endY);

    // Select all elements within the selection rectangle
    this.selectedElements.clear();
    
    // Check poles
    for (let pole of this.elements.poles) {
        if (pole.x >= minX && pole.x <= maxX && pole.y >= minY && pole.y <= maxY) {
            this.selectedElements.add(pole);
        }
    }
    
    // Check lines (check if any part of the line is within the rectangle)
    for (let line of this.elements.lines) {
        if (this.isLineIntersectingRect(line, minX, minY, maxX, maxY)) {
            this.selectedElements.add(line);
        }
    }

    // Check dimensions
    for (let dimension of this.elements.dimensions) {
        if (this.isDimensionIntersectingRect(dimension, minX, minY, maxX, maxY)) {
            this.selectedElements.add(dimension);
        }
    }

    this.dragSelection.active = false;
    this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
    this.render();
};

/**
 * Check if line intersects with rectangle
 */
DrawingEngine.prototype.isLineIntersectingRect = function(line, minX, minY, maxX, maxY) {
    // Check if either endpoint is within the rectangle
    if ((line.startX >= minX && line.startX <= maxX && line.startY >= minY && line.startY <= maxY) ||
        (line.endX >= minX && line.endX <= maxX && line.endY >= minY && line.endY <= maxY)) {
        return true;
    }
    
    // Check if line intersects any edge of the rectangle
    return this.lineIntersectsLine(line.startX, line.startY, line.endX, line.endY, minX, minY, maxX, minY) ||
           this.lineIntersectsLine(line.startX, line.startY, line.endX, line.endY, maxX, minY, maxX, maxY) ||
           this.lineIntersectsLine(line.startX, line.startY, line.endX, line.endY, maxX, maxY, minX, maxY) ||
           this.lineIntersectsLine(line.startX, line.startY, line.endX, line.endY, minX, maxY, minX, minY);
};

/**
 * Check if two lines intersect
 */
DrawingEngine.prototype.lineIntersectsLine = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

/**
 * Select all elements
 */
DrawingEngine.prototype.selectAll = function() {
    this.selectedElements.clear();
    this.selectedElement = null;
    
    // Add all poles
    for (let pole of this.elements.poles) {
        this.selectedElements.add(pole);
    }
    
    // Add all lines
    for (let line of this.elements.lines) {
        this.selectedElements.add(line);
    }
    
    // Add all dimensions
    for (let dimension of this.elements.dimensions) {
        this.selectedElements.add(dimension);
    }
    
    this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
    this.render();
};