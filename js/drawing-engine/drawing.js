DrawingEngine.prototype.finishLine = function(x, y) {
    if (this.tempLine) {
        const endSnapPoint = this.findSnapPoint(x, y);
        const endX = endSnapPoint ? endSnapPoint.x : this.tempLine.endX;
        const endY = endSnapPoint ? endSnapPoint.y : this.tempLine.endY;
        
        const startSnapPoint = this.tempLine.snappedToStart ? this.findSnapPoint(this.tempLine.startX, this.tempLine.startY) : null;
        
        const line = {
            id: `line_${Date.now()}`,
            startX: this.tempLine.startX,
            startY: this.tempLine.startY,
            endX: endX,
            endY: endY,
            type: this.currentLineType,
            name: `Line ${this.elements.lines.length + 1}`
        };
        
        // Assign pole references if snapped to poles
        if (startSnapPoint && startSnapPoint.element && startSnapPoint.element.type && startSnapPoint.element.type.includes('tiang')) {
            line.startPole = startSnapPoint.element.id;
            line.startElevation = startSnapPoint.element.elevation; // Get elevation from snapped pole
        }
        if (endSnapPoint && endSnapPoint.element && endSnapPoint.element.type && endSnapPoint.element.type.includes('tiang')) {
            line.endPole = endSnapPoint.element.id;
            line.endElevation = endSnapPoint.element.elevation; // Get elevation from snapped pole
        }
        
        if (this.coordinateSystem.isRealCoordinates) {
            const startUtm = this.canvasToUTM(line.startX, line.startY);
            const endUtm = this.canvasToUTM(line.endX, line.endY);
            
            line.startUtm = { x: startUtm.x, y: startUtm.y, zone: this.coordinateSystem.utmZone };
            line.endUtm = { x: endUtm.x, y: endUtm.y, zone: this.coordinateSystem.utmZone };
            
            const startElevation = line.startElevation || 0;
            const endElevation = line.endElevation || 0;
            const dx = endUtm.x - startUtm.x;
            const dy = endUtm.y - startUtm.y;
            const dz = endElevation - startElevation;
            
            line.distanceMeters = Math.sqrt(dx * dx + dy * dy + dz * dz);
            line.distanceMeters = Math.round(line.distanceMeters * 100) / 100;
        }
        
        const command = new AddLineCommand(this, line);
        this.executeCommand(command);
        
        this.selectedElement = line;
        this.updatePropertiesPanel(line);
        this.tempLine = null;
        this.hideInputOverlay();
        this.snapPoint = null;
    }
}; 