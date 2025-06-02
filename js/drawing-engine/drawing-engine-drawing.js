/**
 * Drawing Engine Drawing Methods
 * Contains methods for adding poles, drawing lines, and deleting elements
 */

/**
 * Add a new pole
 */
DrawingEngine.prototype.addPole = function(x, y) {
    const pole = {
        id: `pole_${Date.now()}`,
        x: x,
        y: y,
        type: this.currentPoleType,
        name: `Pole ${this.elements.poles.length + 1}`,
        description: '',
        hasGrounding: this.addGrounding,
        hasGuywire: this.addGuywire,
        elevation: 0 // Always initialize elevation
    };
    
    // Add real coordinate information if using real coordinate system
    if (this.coordinateSystem.isRealCoordinates) {
        const utmCoords = this.canvasToUTM(x, y);
        pole.utmX = utmCoords.x;
        pole.utmY = utmCoords.y;
        pole.utmZone = this.coordinateSystem.utmZone;
        
        // Convert UTM back to lat/lon for reference
        const latLon = this.utmToLatLon(utmCoords.x, utmCoords.y, this.coordinateSystem.utmZone);
        pole.originalLat = latLon.lat;
        pole.originalLon = latLon.lon;
        if (typeof pole.elevation !== 'number') pole.elevation = 0;
    }
    
    // Use command system for undo/redo support
    const command = new AddPoleCommand(this, pole);
    this.executeCommand(command);
    
    this.selectedElement = pole;
    this.updatePropertiesPanel(pole);
};

/**
 * Start drawing a line
 */
DrawingEngine.prototype.startLine = function(x, y) {
    // Check for snap point
    const snapPoint = this.findSnapPoint(x, y);
    const startX = snapPoint ? snapPoint.x : x;
    const startY = snapPoint ? snapPoint.y : y;
    
    this.tempLine = {
        startX: startX,
        startY: startY,
        endX: startX,
        endY: startY,
        type: this.currentLineType,
        snappedToStart: !!snapPoint
    };
    
    // Reset precise inputs
    this.preciseInputs.angle.value = 0;
    this.preciseInputs.length.value = 0;
    
    // Show input overlay
    this.showInputOverlay(startX, startY);
    
    this.render();
};

/**
 * Finish drawing a line
 */
DrawingEngine.prototype.finishLine = function(x, y) {
    if (this.tempLine) {
        // Check for snap point at end
        const endSnapPoint = this.findSnapPoint(x, y);
        const endX = endSnapPoint ? endSnapPoint.x : this.tempLine.endX;
        const endY = endSnapPoint ? endSnapPoint.y : this.tempLine.endY;
        
        // Check for snap point at start (from tempLine.snappedToStart)
        const startSnapPoint = this.tempLine.snappedToStart ? this.findSnapPoint(this.tempLine.startX, this.tempLine.startY) : null;
        
        const line = {
            id: `line_${Date.now()}`,
            startX: this.tempLine.startX,
            startY: this.tempLine.startY,
            endX: endX,
            endY: endY,
            type: this.currentLineType,
            name: `Line ${this.elements.lines.length + 1}`,
            startElevation: 0,
            endElevation: 0,
            // Initialize sag property
            sag: { value: 0.01, type: 'percentage', enabled: false }
        };
        
        // Assign pole references if snapped to poles
        if (startSnapPoint && startSnapPoint.type === 'endpoint-pole') {
            line.startPole = startSnapPoint.element.id;
            line.startElevation = startSnapPoint.element.elevation || 0;
        }
        if (endSnapPoint && endSnapPoint.type === 'endpoint-pole') {
            line.endPole = endSnapPoint.element.id;
            line.endElevation = endSnapPoint.element.elevation || 0;
        }
        
        // Add real coordinate information and distance calculation if using real coordinate system
        if (this.coordinateSystem.isRealCoordinates) {
            const startUtm = this.canvasToUTM(line.startX, line.startY);
            const endUtm = this.canvasToUTM(line.endX, line.endY);
            
            line.startUtm = { x: startUtm.x, y: startUtm.y, zone: this.coordinateSystem.utmZone };
            line.endUtm = { x: endUtm.x, y: endUtm.y, zone: this.coordinateSystem.utmZone };
            
            // Calculate real distance in meters (3D with elevation)
            const startElev = (this.selectedElement && this.selectedElement.elevation) || 0;
            const endElev = (endSnapPoint && endSnapPoint.element && endSnapPoint.element.elevation) || 0;
            line.chordLengthMeters = this.calculateDistance3D(startUtm.x, startUtm.y, startElev, endUtm.x, endUtm.y, endElev);
            line.chordLengthMeters = Math.round(line.chordLengthMeters * 100) / 100;
            // Calculate actual sagged length
            line.actualLengthMeters = this.calculateSaggedLineLength(line);
        }
        
        // Use command system for undo/redo support
        const command = new AddLineCommand(this, line);
        this.executeCommand(command);
        
        this.selectedElement = line;
        this.updatePropertiesPanel(line);
        this.tempLine = null;
        this.hideInputOverlay();
        this.snapPoint = null;
    }
};

/**
 * Delete selected element
 */
DrawingEngine.prototype.deleteSelected = function() {
    if (this.selectedElement) {
        // Use command system for undo/redo support
        const command = new DeleteElementCommand(this, this.selectedElement);
        this.executeCommand(command);
        
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
    }
};