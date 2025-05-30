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
    
    // Handle escape key to cancel line drawing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.tempLine) {
            this.cancelLine();
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