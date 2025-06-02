/**
 * Drawing Engine - Data I/O Module
 * Handles data import/export, clearing, and GPX loading functionality
 */

/**
 * Export drawing data
 */
DrawingEngine.prototype.exportData = function() {
    // Ensure all lines have sag, chordLengthMeters, actualLengthMeters
    this.elements.lines.forEach(line => {
        if (!line.sag) line.sag = { value: 0.01, type: 'percentage', enabled: false };
        if (line.startUtm && line.endUtm) {
            // Recalculate chordLengthMeters if missing
            if (typeof line.chordLengthMeters !== 'number') {
                const startElev = line.startElevation || 0;
                const endElev = line.endElevation || 0;
                line.chordLengthMeters = this.calculateDistance3D(line.startUtm.x, line.startUtm.y, startElev, line.endUtm.x, line.endUtm.y, endElev);
                line.chordLengthMeters = Math.round(line.chordLengthMeters * 100) / 100;
            }
            // Recalculate actualLengthMeters if missing
            if (typeof line.actualLengthMeters !== 'number') {
                line.actualLengthMeters = this.calculateSaggedLineLength(line);
            }
        }
    });
    return {
        elements: this.elements,
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY
    };
};

/**
 * Import drawing data
 */
DrawingEngine.prototype.importData = function(data) {
    this.elements = data.elements || { poles: [], lines: [], dimensions: [] };
    // Ensure all lines have sag, chordLengthMeters, actualLengthMeters
    this.elements.lines.forEach(line => {
        if (!line.sag) line.sag = { value: 0.01, type: 'percentage', enabled: false };
        if (line.startUtm && line.endUtm) {
            const startElev = line.startElevation || 0;
            const endElev = line.endElevation || 0;
            if (typeof line.chordLengthMeters !== 'number') {
                line.chordLengthMeters = this.calculateDistance3D(line.startUtm.x, line.startUtm.y, startElev, line.endUtm.x, line.endUtm.y, endElev);
                line.chordLengthMeters = Math.round(line.chordLengthMeters * 100) / 100;
            }
            if (typeof line.actualLengthMeters !== 'number') {
                line.actualLengthMeters = this.calculateSaggedLineLength(line);
            }
        }
    });
    this.zoom = data.zoom || 1;
    this.panX = data.panX || 0;
    this.panY = data.panY || 0;
    this.selectedElement = null;
    this.selectedElements = new Set(); // For multiple selection
    this.dragSelection = {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    };
    this.updatePropertiesPanel(null);
    this.render();
};

/**
 * Clear all elements
 */
DrawingEngine.prototype.clear = function() {
    this.elements = { poles: [], lines: [], dimensions: [] };
    this.selectedElement = null;
    this.selectedElements = new Set(); // For multiple selection
    this.dragSelection = {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    };
    this.updatePropertiesPanel(null);
    this.render();
};

/**
 * Load elements from GPX data
 */
DrawingEngine.prototype.loadFromGPX = function(elements) {
    this.elements = {
        poles: elements.poles || [],
        lines: elements.lines || [],
        dimensions: elements.dimensions || []
    };
    // Ensure all lines have sag, chordLengthMeters, actualLengthMeters
    this.elements.lines.forEach(line => {
        if (!line.sag) line.sag = { value: 0.01, type: 'percentage', enabled: false };
        if (line.startUtm && line.endUtm) {
            const startElev = line.startElevation || 0;
            const endElev = line.endElevation || 0;
            if (typeof line.chordLengthMeters !== 'number') {
                line.chordLengthMeters = this.calculateDistance3D(line.startUtm.x, line.startUtm.y, startElev, line.endUtm.x, line.endUtm.y, endElev);
                line.chordLengthMeters = Math.round(line.chordLengthMeters * 100) / 100;
            }
            if (typeof line.actualLengthMeters !== 'number') {
                line.actualLengthMeters = this.calculateSaggedLineLength(line);
            }
        }
    });

    // Assign current default style to newly loaded dimensions if not already set by parser
    this.elements.dimensions.forEach(dim => {
        if (dim.type === 'aligned' && (!dim.style || Object.keys(dim.style).length === 0)) {
            dim.style = { ...this.dimensionStyle.aligned }; // Assign a copy
        } else if (dim.type === 'angle' && (!dim.style || Object.keys(dim.style).length === 0)) {
            dim.style = { ...this.dimensionStyle.angle }; // Assign a copy
        }
        // Potentially initialize other dimension-specific properties if needed
    });

    this.metadata = elements.metadata || {
        metersPerPixel: 1,
        coordinateSystem: 'Canvas',
        totalDistance: 0
    };
    
    // Set up real coordinate system if loading from GPX
    if (elements.metadata && elements.metadata.coordinateSystem === 'UTM') {
        this.coordinateSystem.isRealCoordinates = true;
        this.coordinateSystem.scale = 1 / elements.metadata.metersPerPixel;
        
        // Use coordinate system parameters from GPX metadata if available
        if (elements.metadata.centerUtmX !== undefined && elements.metadata.centerUtmY !== undefined) {
            this.coordinateSystem.centerUtmX = elements.metadata.centerUtmX;
            this.coordinateSystem.centerUtmY = elements.metadata.centerUtmY;
            this.coordinateSystem.utmZone = elements.metadata.utmZone || 33;
        } else {
            // Fallback: Calculate coordinate system center from existing elements
            if (this.elements.poles.length > 0 || this.elements.lines.length > 0) {
                this.calculateCoordinateSystemCenter();
            }
        }
        
        // Set canvas center for coordinate system (essential for projection)
        this.coordinateSystem.centerCanvasX = this.canvas.width / 2;
        this.coordinateSystem.centerCanvasY = this.canvas.height / 2;

        // Adjust initial zoom to match the scale of the loaded GPX data
        // This ensures that the drawing appears at a correct real-world scale
        this.zoom = this.coordinateSystem.scale;
    }
    
    this.selectedElement = null;
    this.selectedElements = new Set(); // For multiple selection
    this.dragSelection = {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    };
    this.updatePropertiesPanel(null);
    
    // Trigger callback if set
    if (this.onElementsChanged) {
        this.onElementsChanged();
    }
    
    this.render();
};