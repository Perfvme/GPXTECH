/**
 * Coordinates Management
 * Handles coordinate system operations and status updates
 */

/**
 * Enable real coordinates for drawing
 */
ElectricalCADApp.prototype.enableRealCoordinatesForDrawing = function() {
    if (!this.drawingEngine.coordinateSystem.isRealCoordinates) {
        this.drawingEngine.enableRealCoordinates();
        this.showNotification('Real coordinate system enabled! Manual drawing will now use UTM coordinates and metric calculations.', 'success');
        this.updateStatusBar();
    } else {
        this.showNotification('Real coordinate system is already enabled.', 'info');
    }
};

/**
 * Update status bar with current project information
 */
ElectricalCADApp.prototype.updateStatusBar = function() {
    const metadata = this.drawingEngine.metadata || {};
    const elements = this.drawingEngine.elements || { poles: [], lines: [] };
    
    // Update coordinate system
    const coordSystemEl = document.getElementById('coordinateSystem');
    if (coordSystemEl) {
        const system = metadata.coordinateSystem || 'Canvas';
        coordSystemEl.textContent = `Coordinate System: ${system}`;
    }
    
    // Update total distance
    const totalDistanceEl = document.getElementById('totalDistance');
    if (totalDistanceEl) {
        // Sum actualLengthMeters if present, else distanceMeters
        let total = 0;
        if (elements.lines && elements.lines.length > 0) {
            total = elements.lines.reduce((sum, line) => {
                if (typeof line.actualLengthMeters === 'number') return sum + line.actualLengthMeters;
                if (typeof line.chordLengthMeters === 'number') return sum + line.chordLengthMeters;
                if (typeof line.distanceMeters === 'number') return sum + line.distanceMeters;
                return sum;
            }, 0);
        }
        this.drawingEngine.metadata.totalDistance = total;
        const distanceText = total > 0 
            ? `Total Distance: ${total.toFixed(2)}m (${(total / 1000).toFixed(3)}km)`
            : 'Total Distance: 0m';
        totalDistanceEl.textContent = distanceText;
    }
    
    // Update scale info
    const scaleInfoEl = document.getElementById('scaleInfo');
    if (scaleInfoEl) {
        const metersPerPixel = metadata.metersPerPixel || 1;
        const scale = metersPerPixel > 0 ? `1:${Math.round(metersPerPixel)}` : '1:1';
        scaleInfoEl.textContent = `Scale: ${scale}`;
    }
    
    // Update element count
    const elementCountEl = document.getElementById('elementCount');
    if (elementCountEl) {
        const poleCount = elements.poles ? elements.poles.length : 0;
        const lineCount = elements.lines ? elements.lines.length : 0;
        const realCoords = this.drawingEngine.coordinateSystem && this.drawingEngine.coordinateSystem.isRealCoordinates ? 'Enabled' : 'Disabled';
        elementCountEl.textContent = `Elements: ${poleCount} poles, ${lineCount} lines | Real Coordinates: ${realCoords}`;
    }
};