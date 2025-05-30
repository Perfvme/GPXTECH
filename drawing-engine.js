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
            lines: [],
            dimensions: []
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
        
        // Angular dimension tool state
        this.angleState = {
            mode: 'none', // 'none', 'selecting-first', 'selecting-second', 'selecting-third'
            points: [],
            lines: [],
            previewAngle: null
        };
        this.dimensionStyle = {
            textSize: 12,
            textColor: '#000000',
            lineColor: '#FF0000',
            unit: 'degrees',
            precision: 1
        };
        
        // Undo/Redo system
        this.commandHistory = [];
        this.currentCommandIndex = -1;
        this.maxHistorySize = 50;
        
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
        
        // Enhanced snap system
        this.snapTypes = {
            grid: true,
            endpoints: true,
            midpoints: true,
            intersections: true,
            perpendicular: true,
            parallel: true,
            center: true
        };
        this.snapToGrid = true;
        this.snapPriority = ['endpoints', 'intersections', 'midpoints', 'perpendicular', 'grid', 'center'];
        this.snapCache = new Map(); // Cache for performance
        this.lastSnapUpdate = 0;
        this.snapUpdateThrottle = 16; // ~60fps
        
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
            case 'angle':
                this.handleAngleToolClick(x, y);
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
        } else if (this.currentTool === 'angle') {
            this.updateAnglePreview(x, y);
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

        const selectedElements = Array.from(this.selectedElements);
        const compatibleElements = [];
        
        for (let element of selectedElements) {
            // Check if the new type is compatible with the element
            if (element.hasOwnProperty('x') && element.hasOwnProperty('y') && !element.hasOwnProperty('startX')) {
                // This is a pole
                if (['tiang-baja-existing', 'tiang-baja-rencana', 'tiang-beton-existing', 'tiang-beton-rencana', 'gardu-portal'].includes(newType)) {
                    compatibleElements.push(element);
                }
            } else if (element.hasOwnProperty('startX') && element.hasOwnProperty('startY')) {
                // This is a line
                if (['sutm', 'sutr'].includes(newType)) {
                    compatibleElements.push(element);
                }
            }
        }

        if (compatibleElements.length > 0) {
            // Use command system for undo/redo support
            const command = new BatchChangeTypeCommand(this, compatibleElements, newType);
            this.executeCommand(command);
            
            this.updatePropertiesPanel(Array.from(this.selectedElements));
            alert(`Successfully changed type for ${compatibleElements.length} element(s).`);
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

        const selectedElements = Array.from(this.selectedElements);
        
        // Use command system for undo/redo support
        const command = new BatchChangeNameCommand(this, selectedElements, newName.trim(), useNumberedNames);
        this.executeCommand(command);

        this.updatePropertiesPanel(Array.from(this.selectedElements));
        
        if (useNumberedNames && this.selectedElements.size > 1) {
            alert(`Successfully changed name for ${selectedElements.length} element(s) with numbering.`);
        } else {
            alert(`Successfully changed name for ${selectedElements.length} element(s) to "${newName.trim()}".`);
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
        
        // Use command system for undo/redo support
        const command = new AddPoleCommand(this, pole);
        this.executeCommand(command);
        
        this.selectedElement = pole;
        this.updatePropertiesPanel(pole);
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
                name: `Line ${this.elements.lines.length + 1}`
            };
            
            // Assign pole references if snapped to poles
            if (startSnapPoint && startSnapPoint.type === 'endpoint-pole') {
                line.startPole = startSnapPoint.element.id;
            }
            if (endSnapPoint && endSnapPoint.type === 'endpoint-pole') {
                line.endPole = endSnapPoint.element.id;
            }
            
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
            
            // Use command system for undo/redo support
            const command = new AddLineCommand(this, line);
            this.executeCommand(command);
            
            this.selectedElement = line;
            this.updatePropertiesPanel(line);
            this.tempLine = null;
            this.hideInputOverlay();
            this.snapPoint = null;
        }
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.currentTool = tool;
        this.tempLine = null;
        
        // Reset angle tool state when switching tools
        if (tool !== 'angle') {
            this.resetAngleTool();
        } else {
            this.angleState.mode = 'selecting-first';
        }
        
        switch (tool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'angle':
                this.canvas.style.cursor = 'crosshair';
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
            this.snapCache.clear();
        }
        this.render();
    }

    /**
     * Set snap enabled state (called from UI)
     */
    setSnapEnabled(enabled) {
        this.toggleSnap(enabled);
    }

    /**
     * Set specific snap type enabled/disabled
     */
    setSnapType(type, enabled) {
        if (this.snapTypes.hasOwnProperty(type)) {
            this.snapTypes[type] = enabled;
            this.snapCache.clear();
            this.render();
        }
    }
    
    /**
     * Set snap distance
     */
    setSnapDistance(distance) {
        this.snapDistance = Math.max(5, Math.min(50, distance)); // Clamp between 5 and 50
        this.snapCache.clear();
        this.render();
    }

    /**
     * Draw dimension
     */
    drawDimension(dimension) {
        this.ctx.save();
        
        if (dimension.method === '3-point') {
            this.drawAngleDimension3Point(dimension);
        } else if (dimension.method === '2-line') {
            this.drawAngleDimension2Line(dimension);
        }
        
        this.ctx.restore();
    }

    /**
     * Draw 3-point angle dimension
     */
    drawAngleDimension3Point(dimension) {
        const [p1, p2, p3] = dimension.points;
        const style = dimension.style;
        
        // Draw angle arc
        const radius = 30;
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        
        this.ctx.strokeStyle = style.lineColor;
        this.ctx.lineWidth = 1;
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
        
        // Draw text
        const midAngle = (angle1 + angle2) / 2;
        const textX = p2.x + Math.cos(midAngle) * (radius + 20);
        const textY = p2.y + Math.sin(midAngle) * (radius + 20);
        
        this.ctx.fillStyle = style.textColor;
        this.ctx.font = `${style.textSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${dimension.angle}${style.unit}`, textX, textY);
    }

    /**
     * Draw 2-line angle dimension
     */
    drawAngleDimension2Line(dimension) {
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
        const radius = 40;
        this.ctx.strokeStyle = style.lineColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(intersection.x, intersection.y, radius, Math.min(angle1, angle2), Math.max(angle1, angle2));
        this.ctx.stroke();
        
        // Draw text
        const midAngle = (angle1 + angle2) / 2;
        const textX = intersection.x + Math.cos(midAngle) * (radius + 20);
        const textY = intersection.y + Math.sin(midAngle) * (radius + 20);
        
        this.ctx.fillStyle = style.textColor;
        this.ctx.font = `${style.textSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${dimension.angle}${style.unit}`, textX, textY);
    }

    /**
     * Draw angle preview
     */
    drawAnglePreview(preview) {
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
    }

    /**
     * Reset angle tool state
     */
    resetAngleTool() {
        this.angleState = {
            mode: 'none',
            points: [],
            lines: [],
            previewAngle: null
        };
        this.render();
    }

    /**
     * Handle angle tool click
     */
    handleAngleToolClick(x, y) {
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
    }

    /**
     * Update angle preview
     */
    updateAnglePreview(x, y) {
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
    }

    /**
     * Create angle dimension
     */
    createAngleDimension() {
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
    }

    /**
     * Calculate angle from 3 points (vertex is middle point)
     */
    calculateAngle3Points(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
        
        return Math.round(angle * Math.pow(10, this.dimensionStyle.precision)) / Math.pow(10, this.dimensionStyle.precision);
    }

    /**
     * Calculate angle between 2 lines
     */
    calculateAngle2Lines(line1, line2) {
        const v1 = { x: line1.endX - line1.startX, y: line1.endY - line1.startY };
        const v2 = { x: line2.endX - line2.startX, y: line2.endY - line2.startY };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        const cosAngle = Math.abs(dot) / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
        
        return Math.round(angle * Math.pow(10, this.dimensionStyle.precision)) / Math.pow(10, this.dimensionStyle.precision);
    }

    /**
     * Find intersection between two lines
     */
    findLinesIntersection(line1, line2) {
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
    }

    /**
     * Find pole at coordinates
     */
    findPoleAt(x, y) {
        for (let pole of this.elements.poles) {
            if (this.isPointInPole(x, y, pole)) {
                return pole;
            }
        }
        return null;
    }

    /**
     * Find line at coordinates
     */
    findLineAt(x, y) {
        for (let line of this.elements.lines) {
            if (this.isPointOnLine(x, y, line)) {
                return line;
            }
        }
        return null;
    }

    /**
     * Show angle tool instructions
     */
    showAngleInstructions(message) {
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
    }

    /**
     * Find snap point near given coordinates with comprehensive snap types
     */
    findSnapPoint(x, y, excludeElement = null) {
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
    }

    /**
     * Update snap point for cursor position
     */
    updateSnapPoint(x, y) {
        this.snapPoint = this.findSnapPoint(x, y);
    }

    /**
     * Find endpoint snap points (poles and line endpoints)
     */
    findEndpointSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Find midpoint snap points
     */
    findMidpointSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Find grid snap points
     */
    findGridSnaps(x, y) {
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
    }

    /**
     * Find intersection snap points
     */
    findIntersectionSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Find perpendicular snap points
     */
    findPerpendicularSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Find parallel snap points
     */
    findParallelSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Find center snap points
     */
    findCenterSnaps(x, y, excludeElement = null) {
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
    }

    /**
     * Calculate intersection point between two lines
     */
    getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
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
    }

    /**
     * Get perpendicular point from a point to a line
     */
    getPerpendicularPoint(px, py, x1, y1, x2, y2) {
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
            lines: elements.lines || [],
            dimensions: elements.dimensions || []
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
        
        // Check if this is southern hemisphere (false northing was added)
        const isSouthernHemisphere = utmY >= 10000000;
        const y = isSouthernHemisphere ? utmY - 10000000 : utmY;
        
        const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian in degrees
        const lonOriginRad = lonOrigin * Math.PI / 180; // Convert to radians
        
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
        
        let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e * e / (1 - e * e))) * D * D * D * D / 24
                   + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e * e / (1 - e * e)) - 3 * C1 * C1) * D * D * D * D * D * D / 720);
        
        // Calculate longitude in radians first, then convert to degrees
        const lonRad = lonOriginRad + (D - (1 + 2 * T1 + C1) * D * D * D / 6
                      + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e * e / (1 - e * e)) + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1);
        
        // Convert to degrees
        lat = lat * 180 / Math.PI;
        let lon = lonRad * 180 / Math.PI;
        
        // If this was originally from southern hemisphere, make latitude negative
        if (isSouthernHemisphere) {
            lat = -Math.abs(lat);
        }
        
        // Normalize longitude to [-180, 180] range
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;
        
        return {
            lat: lat,
            lon: lon
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
            this.coordinateSystem.utmZone = referencePoint.utmZone || 33;
            this.coordinateSystem.scale = referencePoint.scale || 1;
        } else {
            // Check if we already have coordinate system data from loaded GPX
            if (this.coordinateSystem.utmZone && this.coordinateSystem.centerUtmX !== 0) {
                // Use existing coordinate system from GPX data
                console.log('Using existing coordinate system from GPX data');
                // Keep existing centerUtmX, centerUtmY, utmZone, and scale
            } else {
                // Calculate from existing elements if available
                this.calculateCoordinateSystemCenter();
                
                // If still no coordinate system, use defaults
                if (!this.coordinateSystem.utmZone) {
                    this.coordinateSystem.centerUtmX = 500000; // Default UTM easting
                    this.coordinateSystem.centerUtmY = 0; // Default UTM northing
                    this.coordinateSystem.utmZone = 33; // Default UTM zone
                    this.coordinateSystem.scale = 1; // 1 meter per pixel
                }
            }
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
        
        // Draw dimensions
        this.elements.dimensions.forEach(dimension => this.drawDimension(dimension));
        
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
     * Draw snap indicator with type-specific styling
     */
    drawSnapIndicator(snapPoint) {
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
    }

    /**
     * Draw snap tooltip
     */
    drawSnapTooltip(x, y, text, color) {
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
            const oldValue = this.selectedElement[property];
            
            // Use command system for undo/redo support
            const command = new UpdatePropertyCommand(this, this.selectedElement, property, value, oldValue);
            this.executeCommand(command);
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
        this.elements = data.elements || { poles: [], lines: [], dimensions: [] };
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
    }

    /**
     * Execute a command and add it to history
     */
    executeCommand(command) {
        // Remove any commands after current index (for when we undo then do new action)
        this.commandHistory = this.commandHistory.slice(0, this.currentCommandIndex + 1);
        
        // Execute the command
        command.execute();
        
        // Add to history
        this.commandHistory.push(command);
        this.currentCommandIndex++;
        
        // Limit history size
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift();
            this.currentCommandIndex--;
        }
        
        this.render();
        if (this.onElementsChanged) {
            this.onElementsChanged();
        }
        
        // Update undo/redo button states if app instance is available
        if (window.app && window.app.updateUndoRedoButtons) {
            window.app.updateUndoRedoButtons();
        }
    }

    /**
     * Undo the last command
     */
    undo() {
        if (this.currentCommandIndex >= 0) {
            const command = this.commandHistory[this.currentCommandIndex];
            command.undo();
            this.currentCommandIndex--;
            
            // Clear selection after undo
            this.selectedElement = null;
            this.selectedElements.clear();
            this.updatePropertiesPanel(null);
            
            this.render();
            if (this.onElementsChanged) {
                this.onElementsChanged();
            }
            
            // Update undo/redo button states if app instance is available
            if (window.app && window.app.updateUndoRedoButtons) {
                window.app.updateUndoRedoButtons();
            }
        }
    }

    /**
     * Redo the next command
     */
    redo() {
        if (this.currentCommandIndex < this.commandHistory.length - 1) {
            this.currentCommandIndex++;
            const command = this.commandHistory[this.currentCommandIndex];
            command.execute();
            
            // Clear selection after redo
            this.selectedElement = null;
            this.selectedElements.clear();
            this.updatePropertiesPanel(null);
            
            this.render();
            if (this.onElementsChanged) {
                this.onElementsChanged();
            }
            
            // Update undo/redo button states if app instance is available
            if (window.app && window.app.updateUndoRedoButtons) {
                window.app.updateUndoRedoButtons();
            }
        }
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.currentCommandIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.currentCommandIndex < this.commandHistory.length - 1;
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.commandHistory = [];
        this.currentCommandIndex = -1;
    }
}

/**
 * Command classes for undo/redo functionality
 */

/**
 * Add Pole Command
 */
class AddPoleCommand {
    constructor(drawingEngine, pole) {
        this.drawingEngine = drawingEngine;
        this.pole = pole;
    }

    execute() {
        this.drawingEngine.elements.poles.push(this.pole);
    }

    undo() {
        this.drawingEngine.elements.poles = this.drawingEngine.elements.poles.filter(p => p.id !== this.pole.id);
    }
}

/**
 * Add Line Command
 */
class AddLineCommand {
    constructor(drawingEngine, line) {
        this.drawingEngine = drawingEngine;
        this.line = line;
    }

    execute() {
        this.drawingEngine.elements.lines.push(this.line);
    }

    undo() {
        this.drawingEngine.elements.lines = this.drawingEngine.elements.lines.filter(l => l.id !== this.line.id);
    }
}

/**
 * Delete Element Command
 */
class DeleteElementCommand {
    constructor(drawingEngine, element) {
        this.drawingEngine = drawingEngine;
        this.element = element;
        this.isPole = element.type && element.type.includes('tiang');
    }

    execute() {
        if (this.isPole) {
            this.drawingEngine.elements.poles = this.drawingEngine.elements.poles.filter(p => p.id !== this.element.id);
        } else {
            this.drawingEngine.elements.lines = this.drawingEngine.elements.lines.filter(l => l.id !== this.element.id);
        }
    }

    undo() {
        if (this.isPole) {
            this.drawingEngine.elements.poles.push(this.element);
        } else {
            this.drawingEngine.elements.lines.push(this.element);
        }
    }
}

/**
 * Update Property Command
 */
class UpdatePropertyCommand {
    constructor(drawingEngine, element, property, newValue, oldValue) {
        this.drawingEngine = drawingEngine;
        this.element = element;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

    execute() {
        this.element[this.property] = this.newValue;
    }

    undo() {
        this.element[this.property] = this.oldValue;
    }
}

/**
 * Batch Change Type Command
 */
class BatchChangeTypeCommand {
    constructor(drawingEngine, elements, newType) {
        this.drawingEngine = drawingEngine;
        this.changes = [];
        
        // Store old values for undo
        elements.forEach(element => {
            this.changes.push({
                element: element,
                oldType: element.type,
                newType: newType
            });
        });
    }

    execute() {
        this.changes.forEach(change => {
            change.element.type = change.newType;
        });
    }

    undo() {
        this.changes.forEach(change => {
            change.element.type = change.oldType;
        });
    }
}

/**
 * Batch Change Name Command
 */
class BatchChangeNameCommand {
    constructor(drawingEngine, elements, newName, useNumberedNames) {
        this.drawingEngine = drawingEngine;
        this.changes = [];
        
        // Store old values for undo
        let counter = 1;
        elements.forEach(element => {
            const finalName = useNumberedNames && elements.length > 1 ? `${newName} ${counter}` : newName;
            this.changes.push({
                element: element,
                oldName: element.name,
                newName: finalName
            });
            counter++;
        });
    }

    execute() {
        this.changes.forEach(change => {
            change.element.name = change.newName;
        });
    }

    undo() {
        this.changes.forEach(change => {
            change.element.name = change.oldName;
        });
    }
}

/**
 * Command for adding dimension
 */
class AddDimensionCommand {
    constructor(drawingEngine, dimension) {
        this.drawingEngine = drawingEngine;
        this.dimension = dimension;
    }

    execute() {
        if (!this.drawingEngine.elements.dimensions.find(d => d.id === this.dimension.id)) {
            this.drawingEngine.elements.dimensions.push(this.dimension);
        }
        this.drawingEngine.render();
    }

    undo() {
        const index = this.drawingEngine.elements.dimensions.findIndex(d => d.id === this.dimension.id);
        if (index !== -1) {
            this.drawingEngine.elements.dimensions.splice(index, 1);
        }
        this.drawingEngine.render();
    }
}