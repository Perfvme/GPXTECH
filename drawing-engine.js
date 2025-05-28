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
        this.selectedElement = null;
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
            case 'pan':
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
                break;
            case 'pole':
                this.addPole(x, y);
                break;
            case 'line':
                this.startLine(x, y);
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
            this.tempLine.endX = x;
            this.tempLine.endY = y;
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
        
        if (this.tempLine && this.currentTool === 'line') {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.panX) / this.zoom;
            const y = (e.clientY - rect.top - this.panY) / this.zoom;
            this.finishLine(x, y);
        }
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
        
        this.elements.poles.push(pole);
        this.selectedElement = pole;
        this.updatePropertiesPanel(pole);
        this.render();
    }

    /**
     * Start drawing a line
     */
    startLine(x, y) {
        this.tempLine = {
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            type: this.currentLineType
        };
    }

    /**
     * Finish drawing a line
     */
    finishLine(x, y) {
        if (this.tempLine) {
            const line = {
                id: `line_${Date.now()}`,
                startX: this.tempLine.startX,
                startY: this.tempLine.startY,
                endX: x,
                endY: y,
                type: this.currentLineType,
                name: `Line ${this.elements.lines.length + 1}`
            };
            
            this.elements.lines.push(line);
            this.selectedElement = line;
            this.updatePropertiesPanel(line);
            this.tempLine = null;
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
        this.selectedElement = null;
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
            this.updatePropertiesPanel(null);
            this.render();
        }
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
        
        // Draw poles
        this.elements.poles.forEach(pole => this.drawPole(pole));
        
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
        const isSelected = this.selectedElement && this.selectedElement.id === pole.id;
        
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
        const isSelected = !isTemporary && this.selectedElement && this.selectedElement.id === line.id;
        
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
     * Update properties panel
     */
    updatePropertiesPanel(element) {
        const panel = document.getElementById('propertiesContent');
        
        if (!element) {
            panel.innerHTML = '<p>Select an element to view properties</p>';
            return;
        }
        
        let html = '';
        
        if (element.type && element.type.includes('tiang')) {
            // It's a pole
            html = `
                <div class="property-group">
                    <label>Name:</label>
                    <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)">
                </div>
                <div class="property-group">
                    <label>Type:</label>
                    <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                        <option value="tiang-baja-existing" ${element.type === 'tiang-baja-existing' ? 'selected' : ''}>Tiang Baja Existing</option>
                        <option value="tiang-baja-rencana" ${element.type === 'tiang-baja-rencana' ? 'selected' : ''}>Tiang Baja Rencana</option>
                        <option value="tiang-beton-existing" ${element.type === 'tiang-beton-existing' ? 'selected' : ''}>Tiang Beton Existing</option>
                        <option value="tiang-beton-rencana" ${element.type === 'tiang-beton-rencana' ? 'selected' : ''}>Tiang Beton Rencana</option>
                        <option value="gardu-portal" ${element.type === 'gardu-portal' ? 'selected' : ''}>Gardu Portal</option>
                    </select>
                </div>
                <div class="property-group">
                    <label>
                        <input type="checkbox" ${element.hasGrounding ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGrounding', this.checked)">
                        Grounding
                    </label>
                </div>
                <div class="property-group">
                    <label>
                        <input type="checkbox" ${element.hasGuywire ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGuywire', this.checked)">
                        Guy Wire
                    </label>
                </div>
                <div class="property-group">
                    <label>Position:</label>
                    <div>Canvas: X: ${Math.round(element.x)}, Y: ${Math.round(element.y)}</div>
                    ${element.utmX ? `<div>UTM: ${Math.round(element.utmX)}, ${Math.round(element.utmY)} (Zone ${element.utmZone})</div>` : ''}
                    ${element.originalLat ? `<div>GPS: ${element.originalLat.toFixed(6)}, ${element.originalLon.toFixed(6)}</div>` : ''}
                </div>
            `;
        } else {
            // It's a line
            html = `
                <div class="property-group">
                    <label>Name:</label>
                    <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)">
                </div>
                <div class="property-group">
                    <label>Type:</label>
                    <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                        <option value="sutm-existing" ${element.type === 'sutm-existing' ? 'selected' : ''}>SUTM Existing</option>
                        <option value="sutm-rencana" ${element.type === 'sutm-rencana' ? 'selected' : ''}>SUTM Rencana</option>
                        <option value="sutr-existing" ${element.type === 'sutr-existing' ? 'selected' : ''}>SUTR Existing</option>
                        <option value="sutr-rencana" ${element.type === 'sutr-rencana' ? 'selected' : ''}>SUTR Rencana</option>
                    </select>
                </div>
                <div class="property-group">
                    <label>Length:</label>
                    <div>Canvas: ${Math.round(Math.sqrt((element.endX - element.startX) ** 2 + (element.endY - element.startY) ** 2))} pixels</div>
                    ${element.distanceMeters ? `<div>Real: ${element.distanceMeters} meters (${(element.distanceMeters / 1000).toFixed(3)} km)</div>` : ''}
                </div>
                ${element.startUtm ? `
                <div class="property-group">
                    <label>Start UTM:</label>
                    <div>${Math.round(element.startUtm.x)}, ${Math.round(element.startUtm.y)} (Zone ${element.startUtm.zone})</div>
                </div>
                <div class="property-group">
                    <label>End UTM:</label>
                    <div>${Math.round(element.endUtm.x)}, ${Math.round(element.endUtm.y)} (Zone ${element.endUtm.zone})</div>
                </div>` : ''}
            `;
        }
        
        html += `
            <div class="property-actions">
                <button onclick="drawingEngine.deleteSelected()" class="btn-danger">
                    <i class="fas fa-trash"></i> Delete
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
        this.updatePropertiesPanel(null);
        this.render();
    }

    /**
     * Clear all elements
     */
    clear() {
        this.elements = { poles: [], lines: [] };
        this.selectedElement = null;
        this.updatePropertiesPanel(null);
        this.render();
    }
}