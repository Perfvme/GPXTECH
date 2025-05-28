/**
 * Drawing Engine for Electrical CAD Application
 * Handles canvas rendering, symbols, and drawing operations
 */

class DrawingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.elements = {
            poles: [],
            lines: []
        };
        this.metadata = {
            metersPerPixel: 1,
            coordinateSystem: 'Canvas',
            totalDistance: 0
        };
        // Real coordinate system properties
        this.coordinateSystem = {
            isRealCoordinates: false,
            utmZone: null,
            centerUtmX: 0,
            centerUtmY: 0,
            centerCanvasX: 0,
            centerCanvasY: 0,
            scale: 1
        };
        this.selectedElement = null;
        this.selectedElements = new Set(); // For multiple selection
        this.dragSelection = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        };
        this.currentTool = 'select';
        this.currentPoleType = 'tiang-baja-existing';
        this.currentLineType = 'sutm-existing';
        this.addGrounding = false;
        this.addGuywire = false;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.tempLine = null;
        this.gridSize = 20;
        this.showGrid = true;
        this.showNameLabels = true;
        this.onElementsChanged = null; // Callback for when elements change
        
        // Advanced line drawing features
        this.snapEnabled = true;
        this.snapDistance = 15; // pixels
        this.lineDrawingMode = 'normal'; // 'normal', 'angle-length'
        this.preciseInputs = {
            angle: { value: 0, locked: false },
            length: { value: 0, locked: false }
        };
        this.snapPoint = null;
        this.previewLine = null;
        this.inputOverlay = null;
        
        this.setupEventListeners();
        this.render();
    }

    /**
     * Setup canvas event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle canvas resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle escape key to cancel line drawing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.tempLine) {
                this.cancelLine();
            }
        });
    }

    /**
     * Handle mouse down events
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        
        this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        
        switch (this.currentTool) {
            case 'select':
                this.handleSelect(x, y);
                break;
            case 'drag-select':
                this.startDragSelection(x, y);
                break;
            case 'pan':
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
                break;
            case 'pole':
                this.addPole(x, y);
                break;
            case 'line':
                if (this.tempLine) {
                    // Second click - finish the line
                    this.finishLine(x, y);
                } else {
                    // First click - start the line
                    this.startLine(x, y);
                }
                break;
        }
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        
        if (this.isDragging && this.currentTool === 'pan') {
            const deltaX = e.clientX - rect.left - this.dragStart.x;
            const deltaY = e.clientY - rect.top - this.dragStart.y;
            this.panX += deltaX;
            this.panY += deltaY;
            this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            this.render();
        } else if (this.tempLine) {
            this.updateLineDrawing(x, y);
        } else if (this.currentTool === 'drag-select' && this.dragSelection.active) {
            this.updateDragSelection(x, y);
        } else if (this.currentTool === 'line' && this.snapEnabled) {
            this.updateSnapPoint(x, y);
            this.render();
        }
    }

    /**
     * Handle mouse up events
     */
    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
        }
        
        if (this.currentTool === 'drag-select' && this.dragSelection.active) {
            this.finishDragSelection();
        }
        
        // Line finishing is now handled in handleMouseDown for click-to-finish behavior
    }

    /**
     * Handle wheel events for zooming
     */
    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
        
        // Zoom towards mouse position
        const zoomChange = newZoom / this.zoom;
        this.panX = mouseX - (mouseX - this.panX) * zoomChange;
        this.panY = mouseY - (mouseY - this.panY) * zoomChange;
        this.zoom = newZoom;
        
        this.render();
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }

    /**
     * Handle element selection
     */
    handleSelect(x, y) {
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
        
        // Nothing selected
        this.updatePropertiesPanel(null);
        this.render();
    }

    /**
     * Start drag selection
     */
    startDragSelection(x, y) {
        this.dragSelection.active = true;
        this.dragSelection.startX = x;
        this.dragSelection.startY = y;
        this.dragSelection.endX = x;
        this.dragSelection.endY = y;
        this.selectedElements.clear();
        this.selectedElement = null;
    }

    /**
     * Update drag selection
     */
    updateDragSelection(x, y) {
        this.dragSelection.endX = x;
        this.dragSelection.endY = y;
        this.render();
    }

    /**
     * Finish drag selection
     */
    finishDragSelection() {
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

        this.dragSelection.active = false;
        this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
        this.render();
    }

    /**
     * Check if line intersects with rectangle
     */
    isLineIntersectingRect(line, minX, minY, maxX, maxY) {
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
    }

    /**
     * Check if two lines intersect
     */
    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    /**
     * Select all elements
     */
    selectAll() {
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
        
        this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
        this.render();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedElements.clear();
        this.selectedElement = null;
        this.updatePropertiesPanel(null);
        this.render();
    }

    /**
     * Select elements by filter
     */
    selectByFilter(filterType) {
        this.selectedElements.clear();
        this.selectedElement = null;
        
        switch (filterType) {
            case 'all':
                this.selectAll();
                return;
            case 'poles':
                for (let pole of this.elements.poles) {
                    this.selectedElements.add(pole);
                }
                break;
            case 'lines':
                for (let line of this.elements.lines) {
                    this.selectedElements.add(line);
                }
                break;
            case 'tiang-baja':
                for (let pole of this.elements.poles) {
                    if (pole.type && pole.type.includes('tiang-baja')) {
                        this.selectedElements.add(pole);
                    }
                }
                break;
            case 'tiang-beton':
                for (let pole of this.elements.poles) {
                    if (pole.type && pole.type.includes('tiang-beton')) {
                        this.selectedElements.add(pole);
                    }
                }
                break;
            case 'gardu-portal':
                for (let pole of this.elements.poles) {
                    if (pole.type && pole.type.includes('gardu-portal')) {
                        this.selectedElements.add(pole);
                    }
                }
                break;
            case 'sutm':
                for (let line of this.elements.lines) {
                    if (line.type && line.type.includes('sutm')) {
                        this.selectedElements.add(line);
                    }
                }
                break;
            case 'sutr':
                for (let line of this.elements.lines) {
                    if (line.type && line.type.includes('sutr')) {
                        this.selectedElements.add(line);
                    }
                }
                break;
        }
        
        this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
        this.render();
    }

    /**
     * Batch change type for selected elements
     */
    batchChangeType(newType) {
        if (this.selectedElements.size === 0) {
            alert('No elements selected. Please select elements first.');
            return;
        }

        let changedCount = 0;
        for (let element of this.selectedElements) {
            // Check if the new type is compatible with the element
            if (element.hasOwnProperty('x') && element.hasOwnProperty('y') && !element.hasOwnProperty('startX')) {
                // This is a pole
                if (['tiang-baja-existing', 'tiang-baja-rencana', 'tiang-beton-existing', 'tiang-beton-rencana', 'gardu-portal'].includes(newType)) {
                    element.type = newType;
                    changedCount++;
                }
            } else if (element.hasOwnProperty('startX') && element.hasOwnProperty('startY')) {
                // This is a line
                if (['sutm', 'sutr'].includes(newType)) {
                    element.type = newType;
                    changedCount++;
                }
            }
        }

        if (changedCount > 0) {
            this.updatePropertiesPanel(Array.from(this.selectedElements));
            this.render();
            alert(`Successfully changed type for ${changedCount} element(s).`);
        } else {
            alert('No compatible elements found for the selected type.');
        }
    }

    /**
     * Batch change name for selected elements
     */
    batchChangeName(newName, useNumberedNames = true) {
        if (this.selectedElements.size === 0) {
            alert('No elements selected. Please select elements first.');
            return;
        }

        if (!newName || newName.trim() === '') {
            alert('Please enter a valid name.');
            return;
        }

        let changedCount = 0;
        let counter = 1;
        for (let element of this.selectedElements) {
            if (useNumberedNames && this.selectedElements.size > 1) {
                // Add a number suffix if there are multiple elements and numbering is enabled
                element.name = `${newName.trim()} ${counter}`;
                counter++;
            } else {
                // Use the same name for all elements
                element.name = newName.trim();
            }
            changedCount++;
        }

        this.updatePropertiesPanel(Array.from(this.selectedElements));
        this.render();
        
        if (useNumberedNames && this.selectedElements.size > 1) {
            alert(`Successfully changed name for ${changedCount} element(s) with numbering.`);
        } else {
            alert(`Successfully changed name for ${changedCount} element(s) to "${newName.trim()}".`);
        }
    }

    /**
     * Check if point is inside pole
     */
    isPointInPole(x, y, pole) {
        const distance = Math.sqrt((x - pole.x) ** 2 + (y - pole.y) ** 2);
        return distance <= 15; // 15 pixel radius
    }

    /**
     * Check if point is on line
     */
    isPointOnLine(x, y, line) {
        const tolerance = 5;
        const A = { x: line.startX, y: line.startY };
        const B = { x: line.endX, y: line.endY };
        const P = { x, y };
        
        // Calculate distance from point to line
        const AB = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2);
        const AP = Math.sqrt((P.x - A.x) ** 2 + (P.y - A.y) ** 2);
        const BP = Math.sqrt((P.x - B.x) ** 2 + (P.y - B.y) ** 2);
        
        // Check if point is on line segment
        return Math.abs(AP + BP - AB) < tolerance;
    }

    /**
     * Add a new pole
     */
    addPole(x, y) {
        const pole = {
            id: `pole_${Date.now()}`,
            x: x,
            y: y,
            type: this.currentPoleType,
            name: `Pole ${this.elements.poles.length + 1}`,
            description: '',
            hasGrounding: this.addGrounding,
            hasGuywire: this.addGuywire
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
        }
        
        this.elements.poles.push(pole);
        this.selectedElement = pole;
        this.updatePropertiesPanel(pole);
        this.render();
    }

    /**
     * Start drawing a line
     */
    startLine(x, y) {
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
    }

    /**
     * Finish drawing a line
     */
    finishLine(x, y) {
        if (this.tempLine) {
            // Check for snap point at end
            const snapPoint = this.findSnapPoint(x, y);
            const endX = snapPoint ? snapPoint.x : this.tempLine.endX;
            const endY = snapPoint ? snapPoint.y : this.tempLine.endY;
            
            const line = {
                id: `line_${Date.now()}`,
                startX: this.tempLine.startX,
                startY: this.tempLine.startY,
                endX: endX,
                endY: endY,
                type: this.currentLineType,
                name: `Line ${this.elements.lines.length + 1}`
            };
            
            // Add real coordinate information and distance calculation if using real coordinate system
            if (this.coordinateSystem.isRealCoordinates) {
                const startUtm = this.canvasToUTM(line.startX, line.startY);
                const endUtm = this.canvasToUTM(line.endX, line.endY);
                
                line.startUtm = { x: startUtm.x, y: startUtm.y, zone: this.coordinateSystem.utmZone };
                line.endUtm = { x: endUtm.x, y: endUtm.y, zone: this.coordinateSystem.utmZone };
                
                // Calculate real distance in meters
                line.distanceMeters = this.calculateDistance(startUtm.x, startUtm.y, endUtm.x, endUtm.y);
                line.distanceMeters = Math.round(line.distanceMeters * 100) / 100; // Round to cm
            }
            
            this.elements.lines.push(line);
            this.selectedElement = line;
            this.updatePropertiesPanel(line);
            this.tempLine = null;
            this.hideInputOverlay();
            this.snapPoint = null;
            this.render();
        }
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.currentTool = tool;
        this.tempLine = null;
        
        switch (tool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }

    /**
     * Set current pole type
     */
    setPoleType(type) {
        this.currentPoleType = type;
    }

    /**
     * Set current line type
     */
    setLineType(type) {
        this.currentLineType = type;
    }

    /**
     * Set grounding option
     */
    setGrounding(enabled) {
        this.addGrounding = enabled;
    }

    /**
     * Set guywire option
     */
    setGuywire(enabled) {
        this.addGuywire = enabled;
    }

    /**
     * Toggle snap functionality
     */
    toggleSnap(enabled) {
        this.snapEnabled = enabled;
        if (!enabled) {
            this.snapPoint = null;
        }
        this.render();
    }

    /**
     * Find snap point near given coordinates
     */
    findSnapPoint(x, y) {
        if (!this.snapEnabled) return null;
        
        // Check poles first
        for (let pole of this.elements.poles) {
            const distance = Math.sqrt((x - pole.x) ** 2 + (y - pole.y) ** 2);
            if (distance <= this.snapDistance) {
                return { x: pole.x, y: pole.y, type: 'pole', element: pole };
            }
        }
        
        // Check line endpoints
        for (let line of this.elements.lines) {
            // Start point
            let distance = Math.sqrt((x - line.startX) ** 2 + (y - line.startY) ** 2);
            if (distance <= this.snapDistance) {
                return { x: line.startX, y: line.startY, type: 'line-start', element: line };
            }
            
            // End point
            distance = Math.sqrt((x - line.endX) ** 2 + (y - line.endY) ** 2);
            if (distance <= this.snapDistance) {
                return { x: line.endX, y: line.endY, type: 'line-end', element: line };
            }
        }
        
        return null;
    }

    /**
     * Update snap point for cursor position
     */
    updateSnapPoint(x, y) {
        this.snapPoint = this.findSnapPoint(x, y);
    }

    /**
     * Update line drawing with precise inputs
     */
    updateLineDrawing(x, y) {
        if (!this.tempLine) return;
        
        // Check for snap point
        const snapPoint = this.findSnapPoint(x, y);
        
        if (this.preciseInputs.angle.locked || this.preciseInputs.length.locked) {
            // Use precise inputs
            let endX, endY;
            
            if (this.preciseInputs.angle.locked && this.preciseInputs.length.locked) {
                // Both locked - calculate end point from angle and length
                const angleRad = (this.preciseInputs.angle.value * Math.PI) / 180;
                let pixelLength = this.preciseInputs.length.value;
                
                // Convert meters to pixels if using real coordinates
                if (this.coordinateSystem.isRealCoordinates) {
                    pixelLength = this.preciseInputs.length.value * this.coordinateSystem.scale;
                }
                
                endX = this.tempLine.startX + pixelLength * Math.cos(angleRad);
                endY = this.tempLine.startY + pixelLength * Math.sin(angleRad);
            } else if (this.preciseInputs.angle.locked) {
                // Angle locked - project mouse position onto the locked angle
                const angleRad = (this.preciseInputs.angle.value * Math.PI) / 180;
                const mouseDistance = Math.sqrt((x - this.tempLine.startX) ** 2 + (y - this.tempLine.startY) ** 2);
                endX = this.tempLine.startX + mouseDistance * Math.cos(angleRad);
                endY = this.tempLine.startY + mouseDistance * Math.sin(angleRad);
                
                // Update length input - convert to meters if using real coordinates
                let lengthValue = mouseDistance;
                if (this.coordinateSystem.isRealCoordinates) {
                    lengthValue = mouseDistance / this.coordinateSystem.scale;
                }
                this.preciseInputs.length.value = Math.round(lengthValue * 100) / 100; // Round to cm
                this.updateInputOverlay();
            } else if (this.preciseInputs.length.locked) {
                // Length locked - maintain distance but follow mouse direction
                const mouseAngle = Math.atan2(y - this.tempLine.startY, x - this.tempLine.startX);
                let pixelLength = this.preciseInputs.length.value;
                
                // Convert meters to pixels if using real coordinates
                if (this.coordinateSystem.isRealCoordinates) {
                    pixelLength = this.preciseInputs.length.value * this.coordinateSystem.scale;
                }
                
                endX = this.tempLine.startX + pixelLength * Math.cos(mouseAngle);
                endY = this.tempLine.startY + pixelLength * Math.sin(mouseAngle);
                
                // Update angle input
                this.preciseInputs.angle.value = Math.round((mouseAngle * 180) / Math.PI);
                this.updateInputOverlay();
            }
            
            this.tempLine.endX = endX;
            this.tempLine.endY = endY;
        } else {
            // Normal drawing - follow mouse or snap point
            if (snapPoint) {
                this.tempLine.endX = snapPoint.x;
                this.tempLine.endY = snapPoint.y;
            } else {
                this.tempLine.endX = x;
                this.tempLine.endY = y;
            }
            
            // Update precise inputs with current values
            const dx = this.tempLine.endX - this.tempLine.startX;
            const dy = this.tempLine.endY - this.tempLine.startY;
            const pixelLength = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Convert pixel length to meters if using real coordinates
            let lengthValue = pixelLength;
            if (this.coordinateSystem.isRealCoordinates) {
                lengthValue = pixelLength / this.coordinateSystem.scale;
            }
            
            this.preciseInputs.length.value = Math.round(lengthValue * 100) / 100; // Round to cm
            this.preciseInputs.angle.value = Math.round(angle);
            this.updateInputOverlay();
        }
        
        this.render();
    }

    /**
     * Show input overlay for precise line drawing
     */
    showInputOverlay(x, y) {
        this.hideInputOverlay(); // Remove existing overlay
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const overlayX = canvasRect.left + (x * this.zoom) + this.panX + 20;
        const overlayY = canvasRect.top + (y * this.zoom) + this.panY - 50;
        
        this.inputOverlay = document.createElement('div');
        this.inputOverlay.className = 'line-input-overlay';
        this.inputOverlay.style.position = 'fixed';
        this.inputOverlay.style.left = overlayX + 'px';
        this.inputOverlay.style.top = overlayY + 'px';
        this.inputOverlay.style.zIndex = '1000';
        
        const lengthUnit = this.coordinateSystem.isRealCoordinates ? 'm' : 'px';
        const lengthStep = this.coordinateSystem.isRealCoordinates ? '0.01' : '1';
        
        this.inputOverlay.innerHTML = `
            <div class="input-group">
                <label>Angle (°):</label>
                <input type="number" id="angleInput" value="${this.preciseInputs.angle.value}" step="1">
                <button id="angleLock" class="lock-btn ${this.preciseInputs.angle.locked ? 'locked' : ''}">
                    <i class="fas fa-${this.preciseInputs.angle.locked ? 'lock' : 'unlock'}"></i>
                </button>
            </div>
            <div class="input-group">
                <label id="lengthLabel">Length (${lengthUnit}):</label>
                <input type="number" id="lengthInput" value="${this.preciseInputs.length.value}" step="${lengthStep}" min="0">
                <button id="lengthLock" class="lock-btn ${this.preciseInputs.length.locked ? 'locked' : ''}">
                    <i class="fas fa-${this.preciseInputs.length.locked ? 'lock' : 'unlock'}"></i>
                </button>
            </div>
            <div class="input-actions">
                <button id="confirmLine" class="confirm-btn">Confirm</button>
                <button id="cancelLine" class="cancel-btn">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(this.inputOverlay);
        
        // Add event listeners
        this.setupInputOverlayEvents();
    }

    /**
     * Update input overlay values
     */
    updateInputOverlay() {
        if (!this.inputOverlay) return;
        
        const angleInput = this.inputOverlay.querySelector('#angleInput');
        const lengthInput = this.inputOverlay.querySelector('#lengthInput');
        const lengthLabel = this.inputOverlay.querySelector('#lengthLabel');
        
        if (angleInput && !this.preciseInputs.angle.locked) {
            angleInput.value = this.preciseInputs.angle.value;
        }
        if (lengthInput && !this.preciseInputs.length.locked) {
            lengthInput.value = this.preciseInputs.length.value;
        }
        
        // Update length label and input step to show correct unit
        if (lengthLabel && lengthInput) {
            const lengthUnit = this.coordinateSystem.isRealCoordinates ? 'm' : 'px';
            const lengthStep = this.coordinateSystem.isRealCoordinates ? '0.01' : '1';
            lengthLabel.textContent = `Length (${lengthUnit}):`;
            lengthInput.step = lengthStep;
        }
    }

    /**
     * Setup input overlay event listeners
     */
    setupInputOverlayEvents() {
        if (!this.inputOverlay) return;
        
        const angleInput = this.inputOverlay.querySelector('#angleInput');
        const lengthInput = this.inputOverlay.querySelector('#lengthInput');
        const angleLock = this.inputOverlay.querySelector('#angleLock');
        const lengthLock = this.inputOverlay.querySelector('#lengthLock');
        const confirmBtn = this.inputOverlay.querySelector('#confirmLine');
        const cancelBtn = this.inputOverlay.querySelector('#cancelLine');
        
        // Input changes
        angleInput.addEventListener('input', (e) => {
            this.preciseInputs.angle.value = parseFloat(e.target.value) || 0;
            if (this.preciseInputs.angle.locked) {
                this.updateLineFromInputs();
            }
        });
        
        lengthInput.addEventListener('input', (e) => {
            this.preciseInputs.length.value = parseFloat(e.target.value) || 0;
            if (this.preciseInputs.length.locked) {
                this.updateLineFromInputs();
            }
        });
        
        // Lock toggles
        angleLock.addEventListener('click', () => {
            this.preciseInputs.angle.locked = !this.preciseInputs.angle.locked;
            angleLock.className = `lock-btn ${this.preciseInputs.angle.locked ? 'locked' : ''}`;
            angleLock.innerHTML = `<i class="fas fa-${this.preciseInputs.angle.locked ? 'lock' : 'unlock'}"></i>`;
            
            if (this.preciseInputs.angle.locked) {
                this.updateLineFromInputs();
            }
        });
        
        lengthLock.addEventListener('click', () => {
            this.preciseInputs.length.locked = !this.preciseInputs.length.locked;
            lengthLock.className = `lock-btn ${this.preciseInputs.length.locked ? 'locked' : ''}`;
            lengthLock.innerHTML = `<i class="fas fa-${this.preciseInputs.length.locked ? 'lock' : 'unlock'}"></i>`;
            
            if (this.preciseInputs.length.locked) {
                this.updateLineFromInputs();
            }
        });
        
        // Action buttons
        confirmBtn.addEventListener('click', () => {
            this.finishLine(this.tempLine.endX, this.tempLine.endY);
        });
        
        cancelBtn.addEventListener('click', () => {
            this.cancelLine();
        });
        
        // Prevent canvas events when interacting with overlay
        this.inputOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
        this.inputOverlay.addEventListener('mousemove', (e) => e.stopPropagation());
        this.inputOverlay.addEventListener('mouseup', (e) => e.stopPropagation());
    }

    /**
     * Update line from precise inputs
     */
    updateLineFromInputs() {
        if (!this.tempLine) return;
        
        const angleRad = (this.preciseInputs.angle.value * Math.PI) / 180;
        const length = this.preciseInputs.length.value;
        
        this.tempLine.endX = this.tempLine.startX + length * Math.cos(angleRad);
        this.tempLine.endY = this.tempLine.startY + length * Math.sin(angleRad);
        
        this.render();
    }

    /**
     * Hide input overlay
     */
    hideInputOverlay() {
        if (this.inputOverlay) {
            this.inputOverlay.remove();
            this.inputOverlay = null;
        }
    }

    /**
     * Cancel line drawing
     */
    cancelLine() {
        this.tempLine = null;
        this.hideInputOverlay();
        this.snapPoint = null;
        this.render();
    }

    /**
     * Toggle name label visibility
     */
    toggleNameLabels(show) {
        this.showNameLabels = show;
        this.render();
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.render();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.render();
    }

    /**
     * Reset view
     */
    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    /**
     * Load elements from GPX data with metadata
     */
    loadFromGPX(elements) {
        this.elements = {
            poles: elements.poles || [],
            lines: elements.lines || []
        };
        this.metadata = elements.metadata || {
            metersPerPixel: 1,
            coordinateSystem: 'Canvas',
            totalDistance: 0
        };
        
        // Set up real coordinate system if loading from GPX
        if (elements.metadata && elements.metadata.coordinateSystem === 'UTM') {
            this.coordinateSystem.isRealCoordinates = true;
            this.coordinateSystem.scale = 1 / elements.metadata.metersPerPixel;
            
            // Calculate coordinate system center from existing elements
            if (this.elements.poles.length > 0 || this.elements.lines.length > 0) {
                this.calculateCoordinateSystemCenter();
            }
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
    }

    /**
     * Delete selected element
     */
    deleteSelected() {
        if (this.selectedElement) {
            if (this.selectedElement.type && this.selectedElement.type.includes('tiang')) {
                // It's a pole
                this.elements.poles = this.elements.poles.filter(p => p.id !== this.selectedElement.id);
            } else {
                // It's a line
                this.elements.lines = this.elements.lines.filter(l => l.id !== this.selectedElement.id);
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
            this.render();
        }
    }

    /**
     * Calculate coordinate system center from existing elements
     */
    calculateCoordinateSystemCenter() {
        const allUtmCoords = [];
        
        // Collect UTM coordinates from poles
        this.elements.poles.forEach(pole => {
            if (pole.utmX !== undefined && pole.utmY !== undefined) {
                allUtmCoords.push({ x: pole.utmX, y: pole.utmY });
                if (pole.utmZone && !this.coordinateSystem.utmZone) {
                    this.coordinateSystem.utmZone = pole.utmZone;
                }
            }
        });
        
        // Collect UTM coordinates from lines
        this.elements.lines.forEach(line => {
            if (line.startUtm) {
                allUtmCoords.push({ x: line.startUtm.x, y: line.startUtm.y });
                if (line.startUtm.zone && !this.coordinateSystem.utmZone) {
                    this.coordinateSystem.utmZone = line.startUtm.zone;
                }
            }
            if (line.endUtm) {
                allUtmCoords.push({ x: line.endUtm.x, y: line.endUtm.y });
            }
        });
        
        if (allUtmCoords.length > 0) {
            // Calculate center of UTM coordinates
            const sumX = allUtmCoords.reduce((sum, coord) => sum + coord.x, 0);
            const sumY = allUtmCoords.reduce((sum, coord) => sum + coord.y, 0);
            
            this.coordinateSystem.centerUtmX = sumX / allUtmCoords.length;
            this.coordinateSystem.centerUtmY = sumY / allUtmCoords.length;
            this.coordinateSystem.centerCanvasX = this.canvas.width / 2;
            this.coordinateSystem.centerCanvasY = this.canvas.height / 2;
        }
    }

    /**
     * Convert canvas coordinates to UTM coordinates
     */
    canvasToUTM(canvasX, canvasY) {
        if (!this.coordinateSystem.isRealCoordinates) {
            return { x: canvasX, y: canvasY };
        }
        
        const utmX = this.coordinateSystem.centerUtmX + (canvasX - this.coordinateSystem.centerCanvasX) / this.coordinateSystem.scale;
        const utmY = this.coordinateSystem.centerUtmY - (canvasY - this.coordinateSystem.centerCanvasY) / this.coordinateSystem.scale;
        
        return { x: utmX, y: utmY };
    }

    /**
     * Convert UTM coordinates to canvas coordinates
     */
    utmToCanvas(utmX, utmY) {
        if (!this.coordinateSystem.isRealCoordinates) {
            return { x: utmX, y: utmY };
        }
        
        const canvasX = this.coordinateSystem.centerCanvasX + (utmX - this.coordinateSystem.centerUtmX) * this.coordinateSystem.scale;
        const canvasY = this.coordinateSystem.centerCanvasY - (utmY - this.coordinateSystem.centerUtmY) * this.coordinateSystem.scale;
        
        return { x: canvasX, y: canvasY };
    }

    /**
     * Convert UTM coordinates to Lat/Lon
     */
    utmToLatLon(utmX, utmY, zone) {
        const a = 6378137; // WGS84 semi-major axis
        const e = 0.0818191908426; // WGS84 eccentricity
        const k0 = 0.9996; // UTM scale factor
        
        const x = utmX - 500000; // Remove false easting
        const y = utmY >= 10000000 ? utmY - 10000000 : utmY; // Remove false northing if southern hemisphere
        
        const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian
        
        const M = y / k0;
        const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256));
        
        const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
        const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
                     + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
                     + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
        
        const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) * Math.sin(phi1));
        const T1 = Math.tan(phi1) * Math.tan(phi1);
        const C1 = (e * e / (1 - e * e)) * Math.cos(phi1) * Math.cos(phi1);
        const R1 = a * (1 - e * e) / Math.pow(1 - e * e * Math.sin(phi1) * Math.sin(phi1), 1.5);
        const D = x / (N1 * k0);
        
        const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e * e / (1 - e * e))) * D * D * D * D / 24
                   + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e * e / (1 - e * e)) - 3 * C1 * C1) * D * D * D * D * D * D / 720);
        
        const lon = lonOrigin + (D - (1 + 2 * T1 + C1) * D * D * D / 6
                    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e * e / (1 - e * e)) + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1);
        
        return {
            lat: lat * 180 / Math.PI,
            lon: lon * 180 / Math.PI
        };
    }

    /**
     * Calculate distance between two points in meters
     */
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Enable real coordinate system for manual drawing
     */
    enableRealCoordinates(referencePoint = null) {
        this.coordinateSystem.isRealCoordinates = true;
        
        if (referencePoint) {
            // Use provided reference point (e.g., from GPX data)
            this.coordinateSystem.centerUtmX = referencePoint.utmX || 0;
            this.coordinateSystem.centerUtmY = referencePoint.utmY || 0;
            this.coordinateSystem.utmZone = referencePoint.utmZone || 33; // Default to zone 33
            this.coordinateSystem.scale = referencePoint.scale || 1;
        } else {
            // Set default coordinate system center to canvas center
            this.coordinateSystem.centerUtmX = 500000; // Default UTM easting
            this.coordinateSystem.centerUtmY = 0; // Default UTM northing
            this.coordinateSystem.utmZone = 33; // Default UTM zone
            this.coordinateSystem.scale = 1; // 1 meter per pixel
        }
        
        this.coordinateSystem.centerCanvasX = this.canvas.width / 2;
        this.coordinateSystem.centerCanvasY = this.canvas.height / 2;
        
        // Update metadata
        this.metadata.coordinateSystem = 'UTM';
        this.metadata.metersPerPixel = 1 / this.coordinateSystem.scale;
    }

    /**
     * Main render function
     */
    render() {
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
        if (this.currentTool === 'line' && !this.tempLine && this.snapPoint) {
            this.drawSnapIndicator(this.snapPoint);
        }
        
        // Draw poles
        this.elements.poles.forEach(pole => this.drawPole(pole));
        
        // Draw drag selection rectangle
        if (this.dragSelection.active) {
            this.drawDragSelection();
        }
        
        // Restore context
        this.ctx.restore();
    }

    /**
     * Draw grid
     */
    drawGrid() {
        const startX = Math.floor(-this.panX / this.zoom / this.gridSize) * this.gridSize;
        const startY = Math.floor(-this.panY / this.zoom / this.gridSize) * this.gridSize;
        const endX = startX + (this.canvas.width / this.zoom) + this.gridSize;
        const endY = startY + (this.canvas.height / this.zoom) + this.gridSize;
        
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 0.5;
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
    }

    /**
     * Draw a pole with the correct symbol
     */
    drawPole(pole) {
        const isSelected = (this.selectedElement && this.selectedElement.id === pole.id) || 
                          this.selectedElements.has(pole);
        
        this.ctx.save();
        this.ctx.translate(pole.x, pole.y);
        
        // Draw selection highlight
        if (isSelected) {
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
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
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(pole.name, 0, 25);
        }
        
        this.ctx.restore();
    }

    /**
     * Draw Tiang Baja Existing symbol (filled black circle)
     */
    drawTiangBajaExisting() {
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw Tiang Baja Rencana symbol (empty circle)
     */
    drawTiangBajaRencana() {
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    /**
     * Draw Tiang Beton Existing symbol (filled black circle with white dot)
     */
    drawTiangBetonExisting() {
        // Outer black circle
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner white dot
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw Tiang Beton Rencana symbol (empty circle with black dot)
     */
    drawTiangBetonRencana() {
        // Outer circle
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner black dot
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw Gardu Portal symbol (square with lightning bolt)
     */
    drawGarduPortal() {
        // Square
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(-8, -8, 16, 16);
        this.ctx.strokeRect(-8, -8, 16, 16);
        
        // Lightning bolt
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⚡', 0, 0);
    }

    /**
     * Draw grounding symbol
     */
    drawGrounding() {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        // Vertical line down
        this.ctx.moveTo(0, 8);
        this.ctx.lineTo(0, 18);
        // Horizontal lines (grounding symbol)
        this.ctx.moveTo(-6, 18);
        this.ctx.lineTo(6, 18);
        this.ctx.moveTo(-4, 20);
        this.ctx.lineTo(4, 20);
        this.ctx.moveTo(-2, 22);
        this.ctx.lineTo(2, 22);
        this.ctx.stroke();
    }

    /**
     * Draw guy wire symbol
     */
    drawGuywire() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        this.ctx.beginPath();
        // Diagonal lines representing guy wires
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(15, 15);
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-15, 15);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Draw a line with the correct style
     */
    drawLine(line, isTemporary = false) {
        const isSelected = !isTemporary && ((this.selectedElement && this.selectedElement.id === line.id) || 
                          this.selectedElements.has(line));
        
        this.ctx.save();
        
        // Set line style based on type
        switch (line.type) {
            case 'sutm-rencana':
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                break;
            case 'sutm-existing':
                this.ctx.strokeStyle = '#ff0000';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([]);
                break;
            case 'sutr-rencana':
                this.ctx.strokeStyle = '#0000ff';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                break;
            case 'sutr-existing':
                this.ctx.strokeStyle = '#0000ff';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([]);
                break;
        }
        
        // Draw selection highlight
        if (isSelected) {
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([]);
            this.ctx.beginPath();
            this.ctx.moveTo(line.startX, line.startY);
            this.ctx.lineTo(line.endX, line.endY);
            this.ctx.stroke();
            
            // Reset style for actual line
            switch (line.type) {
                case 'sutm-rencana':
                    this.ctx.strokeStyle = '#ff0000';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    break;
                case 'sutm-existing':
                    this.ctx.strokeStyle = '#ff0000';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([]);
                    break;
                case 'sutr-rencana':
                    this.ctx.strokeStyle = '#0000ff';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    break;
                case 'sutr-existing':
                    this.ctx.strokeStyle = '#0000ff';
                    this.ctx.lineWidth = 2;
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
    }

    /**
     * Draw drag selection rectangle
     */
    drawDragSelection() {
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
    }

    /**
     * Draw snap indicator
     */
    drawSnapIndicator(snapPoint) {
        this.ctx.save();
        
        // Draw snap circle
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(snapPoint.x, snapPoint.y, 8, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw center dot
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(snapPoint.x, snapPoint.y, 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    /**
     * Update properties panel
     */
    updatePropertiesPanel(element) {
        const panel = document.getElementById('propertiesContent');
        
        if (!element) {
            panel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an element to edit properties</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        if (element.type && element.type.includes('tiang')) {
            // It's a pole
            const typeDisplayNames = {
                'tiang-baja-existing': 'Steel Pole (Existing)',
                'tiang-baja-rencana': 'Steel Pole (Planned)',
                'tiang-beton-existing': 'Concrete Pole (Existing)',
                'tiang-beton-rencana': 'Concrete Pole (Planned)',
                'gardu-portal': 'Portal Substation'
            };
            
            html = `
                <div class="element-header">
                    <div class="element-icon pole-icon"></div>
                    <div class="element-info">
                        <h4>Pole Properties</h4>
                        <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                    </div>
                </div>
                
                <div class="properties-form">
                    <div class="form-row">
                        <label><i class="fas fa-tag"></i> Name</label>
                        <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter pole name">
                    </div>
                    
                    <div class="form-row">
                        <label><i class="fas fa-cog"></i> Type</label>
                        <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                            <option value="tiang-baja-existing" ${element.type === 'tiang-baja-existing' ? 'selected' : ''}>Steel Pole (Existing)</option>
                            <option value="tiang-baja-rencana" ${element.type === 'tiang-baja-rencana' ? 'selected' : ''}>Steel Pole (Planned)</option>
                            <option value="tiang-beton-existing" ${element.type === 'tiang-beton-existing' ? 'selected' : ''}>Concrete Pole (Existing)</option>
                            <option value="tiang-beton-rencana" ${element.type === 'tiang-beton-rencana' ? 'selected' : ''}>Concrete Pole (Planned)</option>
                            <option value="gardu-portal" ${element.type === 'gardu-portal' ? 'selected' : ''}>Portal Substation</option>
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label class="section-label"><i class="fas fa-plus-circle"></i> Accessories</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" ${element.hasGrounding ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGrounding', this.checked)">
                                <span class="checkmark"></span>
                                <i class="fas fa-bolt"></i> Grounding
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" ${element.hasGuywire ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGuywire', this.checked)">
                                <span class="checkmark"></span>
                                <i class="fas fa-link"></i> Guy Wire
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <label class="section-label"><i class="fas fa-map-marker-alt"></i> Location</label>
                        <div class="location-info">
                            <div class="coord-item">
                                <span class="coord-label">Canvas</span>
                                <span class="coord-value">X: ${Math.round(element.x)}, Y: ${Math.round(element.y)}</span>
                            </div>
                            ${element.utmX ? `
                            <div class="coord-item">
                                <span class="coord-label">UTM</span>
                                <span class="coord-value">${Math.round(element.utmX)}, ${Math.round(element.utmY)} (${element.utmZone})</span>
                            </div>` : ''}
                            ${element.originalLat ? `
                            <div class="coord-item">
                                <span class="coord-label">GPS</span>
                                <span class="coord-value">${element.originalLat.toFixed(6)}, ${element.originalLon.toFixed(6)}</span>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // It's a line
            const typeDisplayNames = {
                'sutm-existing': 'Medium Voltage (Existing)',
                'sutm-rencana': 'Medium Voltage (Planned)',
                'sutr-existing': 'Low Voltage (Existing)',
                'sutr-rencana': 'Low Voltage (Planned)'
            };
            
            const canvasLength = Math.round(Math.sqrt((element.endX - element.startX) ** 2 + (element.endY - element.startY) ** 2));
            
            html = `
                <div class="element-header">
                    <div class="element-icon line-icon"></div>
                    <div class="element-info">
                        <h4>Line Properties</h4>
                        <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                    </div>
                </div>
                
                <div class="properties-form">
                    <div class="form-row">
                        <label><i class="fas fa-tag"></i> Name</label>
                        <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter line name">
                    </div>
                    
                    <div class="form-row">
                        <label><i class="fas fa-cog"></i> Type</label>
                        <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                            <option value="sutm-existing" ${element.type === 'sutm-existing' ? 'selected' : ''}>Medium Voltage (Existing)</option>
                            <option value="sutm-rencana" ${element.type === 'sutm-rencana' ? 'selected' : ''}>Medium Voltage (Planned)</option>
                            <option value="sutr-existing" ${element.type === 'sutr-existing' ? 'selected' : ''}>Low Voltage (Existing)</option>
                            <option value="sutr-rencana" ${element.type === 'sutr-rencana' ? 'selected' : ''}>Low Voltage (Planned)</option>
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label class="section-label"><i class="fas fa-ruler"></i> Measurements</label>
                        <div class="measurement-info">
                            <div class="measure-item">
                                <span class="measure-label">Canvas Length</span>
                                <span class="measure-value">${canvasLength} px</span>
                            </div>
                            ${element.distanceMeters ? `
                            <div class="measure-item primary">
                                <span class="measure-label">Real Distance</span>
                                <span class="measure-value">${element.distanceMeters} m</span>
                            </div>
                            <div class="measure-item">
                                <span class="measure-label">Kilometers</span>
                                <span class="measure-value">${(element.distanceMeters / 1000).toFixed(3)} km</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    ${element.startUtm ? `
                    <div class="form-section">
                        <label class="section-label"><i class="fas fa-map-marker-alt"></i> Coordinates</label>
                        <div class="location-info">
                            <div class="coord-item">
                                <span class="coord-label">Start UTM</span>
                                <span class="coord-value">${Math.round(element.startUtm.x)}, ${Math.round(element.startUtm.y)} (${element.startUtm.zone})</span>
                            </div>
                            <div class="coord-item">
                                <span class="coord-label">End UTM</span>
                                <span class="coord-value">${Math.round(element.endUtm.x)}, ${Math.round(element.endUtm.y)} (${element.endUtm.zone})</span>
                            </div>
                        </div>
                    </div>` : ''}
                </div>
            `;
        }
        
        html += `
            <div class="property-actions">
                <button onclick="drawingEngine.deleteSelected()" class="delete-btn">
                    <i class="fas fa-trash-alt"></i>
                    <span>Delete Element</span>
                </button>
            </div>
        `;
        
        panel.innerHTML = html;
    }

    /**
     * Update element property
     */
    updateElementProperty(property, value) {
        if (this.selectedElement) {
            this.selectedElement[property] = value;
            this.render();
        }
    }

    /**
     * Export drawing data
     */
    exportData() {
        return {
            elements: this.elements,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
    }

    /**
     * Import drawing data
     */
    importData(data) {
        this.elements = data.elements || { poles: [], lines: [] };
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
    }

    /**
     * Clear all elements
     */
    clear() {
        this.elements = { poles: [], lines: [] };
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
    }
}