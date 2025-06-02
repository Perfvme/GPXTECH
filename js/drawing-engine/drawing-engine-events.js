/**
 * Drawing Engine Event Handlers
 * Mouse, keyboard, and canvas event handling
 */

/**
 * Setup canvas event listeners
 */
DrawingEngine.prototype.setupEventListeners = function() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Handle canvas resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Handle escape key to cancel line drawing and delete key for selected elements
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.tempLine) {
            this.cancelLine();
        } else if (e.key === 'Delete') {
            this.deleteSelectedElements();
        }
    });
};

/**
 * Handle mouse down events
 */
DrawingEngine.prototype.handleMouseDown = function(e) {
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
        case 'aligned-dimension':
            this.handleAlignedDimensionClick(x, y);
            break;
    }
};

/**
 * Handle mouse move events
 */
DrawingEngine.prototype.handleMouseMove = function(e) {
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
    } else if (this.currentTool === 'aligned-dimension') {
        this.updateAlignedDimensionPreview(x, y);
    }
};

/**
 * Handle mouse up events
 */
DrawingEngine.prototype.handleMouseUp = function(e) {
    if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
    }
    
    if (this.currentTool === 'drag-select' && this.dragSelection.active) {
        this.finishDragSelection();
    }
    
    // Line finishing is now handled in handleMouseDown for click-to-finish behavior
};

/**
 * Handle wheel events for zooming
 */
DrawingEngine.prototype.handleWheel = function(e) {
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
};

/**
 * Handle canvas resize
 */
DrawingEngine.prototype.handleResize = function() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.render();
};

/**
 * Handle clicks for the angle dimension tool
 */
DrawingEngine.prototype.handleAngleToolClick = function(x, y) {
    if (this.angleState.mode === 'selecting-first') {
        this.angleState.points = [{ x, y }];
        this.angleState.mode = 'selecting-second';
    } else if (this.angleState.mode === 'selecting-second') {
        this.angleState.points.push({ x, y });
        this.angleState.mode = 'selecting-third';
    } else if (this.angleState.mode === 'selecting-third') {
        this.angleState.points.push({ x, y });
        // Calculate angle and add dimension
        const [p1, p2, p3] = this.angleState.points;
        const angle = this.calculateAngle3Points(p1, p2, p3);
        this.elements.dimensions.push({
            type: 'angle',
            method: '3-point',
            points: [p1, p2, p3],
            angle: angle,
            style: this.dimensionStyle.angle
        });
        this.resetAngleTool();
    }
    this.render();
};

/**
 * Update angle preview during mouse move
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
 * Handle clicks for the aligned dimension tool
 */
DrawingEngine.prototype.handleAlignedDimensionClick = function(x, y) {
    const snapPoint = this.findSnapPoint(x, y);
    const clickPoint = snapPoint ? { x: snapPoint.x, y: snapPoint.y, element: snapPoint.element } : { x, y, element: null };

    const clickedLine = !snapPoint?.element && this.findLineAt(clickPoint.x, clickPoint.y); // Prefer snap point's element
    const clickedPole = snapPoint?.element?.type?.includes('tiang') ? snapPoint.element : null;

    if (this.alignedDimensionState.mode === 'selecting-first') {
        if (clickedLine) {
            const p1 = { x: clickedLine.startX, y: clickedLine.startY };
            const p2 = { x: clickedLine.endX, y: clickedLine.endY };
            const utmP1 = this.canvasToUTM(p1.x, p1.y);
            const utmP2 = this.canvasToUTM(p2.x, p2.y);
            const elev1 = clickedLine.startElevation || 0;
            const elev2 = clickedLine.endElevation || 0;
            const realDistance = this.calculateDistance3D(utmP1.x, utmP1.y, elev1, utmP2.x, utmP2.y, elev2);

            const dimension = {
                id: 'aligned_' + Date.now(),
                type: 'aligned',
                points: [p1, p2],
                distance: Math.round(realDistance * 100) / 100,
                style: { ...this.dimensionStyle.aligned }
            };
            this.elements.dimensions.push(dimension);
            this.executeCommand(new AddDimensionCommand(this, dimension)); // Add command
            this.resetAlignedDimensionTool();
            this.showAngleInstructions('Aligned dimension created from line!');
        } else { // Handles clickedPole or general point click
            this.alignedDimensionState.points = [clickPoint];
            this.alignedDimensionState.mode = 'selecting-second';
            this.showAngleInstructions('Click second point or line for aligned dimension');
        }
    } else if (this.alignedDimensionState.mode === 'selecting-second') {
        this.alignedDimensionState.points.push(clickPoint);
        const [p1Data, p2Data] = this.alignedDimensionState.points;
        
        const utmP1 = this.canvasToUTM(p1Data.x, p1Data.y);
        const utmP2 = this.canvasToUTM(p2Data.x, p2Data.y);
        const elev1 = p1Data.element?.elevation || 0;
        const elev2 = p2Data.element?.elevation || 0;
        const realDistance = this.calculateDistance3D(utmP1.x, utmP1.y, elev1, utmP2.x, utmP2.y, elev2);

        const dimension = {
            id: 'aligned_' + Date.now(),
            type: 'aligned',
            points: [{x: p1Data.x, y: p1Data.y}, {x: p2Data.x, y: p2Data.y}],
            distance: Math.round(realDistance * 100) / 100,
            style: { ...this.dimensionStyle.aligned }
        };
        this.elements.dimensions.push(dimension);
        this.executeCommand(new AddDimensionCommand(this, dimension)); // Add command
        this.resetAlignedDimensionTool();
        this.showAngleInstructions('Aligned dimension created!');
    }
    this.render();
};

/**
 * Update aligned dimension preview during mouse move
 */
DrawingEngine.prototype.updateAlignedDimensionPreview = function(x, y) {
    if (this.alignedDimensionState.mode === 'none' || this.alignedDimensionState.points.length === 0) {
        this.alignedDimensionState.previewDistance = null;
        this.render();
        return;
    }

    const snapPoint = this.findSnapPoint(x, y);
    const previewPoint = snapPoint ? { x: snapPoint.x, y: snapPoint.y, element: snapPoint.element } : { x, y, element: null };

    if (this.alignedDimensionState.points.length === 1) {
        const p1Data = this.alignedDimensionState.points[0];
        const utmP1 = this.canvasToUTM(p1Data.x, p1Data.y);
        const utmPreviewPoint = this.canvasToUTM(previewPoint.x, previewPoint.y);
        const elev1 = p1Data.element?.elevation || 0;
        const elevPreview = previewPoint.element?.elevation || 0;
        const realDistance = this.calculateDistance3D(utmP1.x, utmP1.y, elev1, utmPreviewPoint.x, utmPreviewPoint.y, elevPreview);

        this.alignedDimensionState.previewDistance = {
            type: 'aligned',
            points: [{x: p1Data.x, y: p1Data.y}, {x: previewPoint.x, y: previewPoint.y}],
            currentPoint: {x: previewPoint.x, y: previewPoint.y}, // For drawing the line to cursor
            distance: Math.round(realDistance * 100) / 100,
            style: { ...this.dimensionStyle.aligned }
        };
    }
    this.render();
};