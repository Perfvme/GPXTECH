/**
 * Drawing Engine - Precise Line Drawing Module
 * Handles precise line drawing with input overlays and constraints
 */

/**
 * Update line drawing with precise inputs and constraints
 */
DrawingEngine.prototype.updateLineDrawing = function(x, y) {
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
};

/**
 * Show input overlay for precise line drawing
 */
DrawingEngine.prototype.showInputOverlay = function(x, y) {
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
};

/**
 * Update input overlay values
 */
DrawingEngine.prototype.updateInputOverlay = function() {
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
};

/**
 * Setup input overlay event listeners
 */
DrawingEngine.prototype.setupInputOverlayEvents = function() {
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
};

/**
 * Update line from precise inputs
 */
DrawingEngine.prototype.updateLineFromInputs = function() {
    if (!this.tempLine) return;
    
    const angleRad = (this.preciseInputs.angle.value * Math.PI) / 180;
    const length = this.preciseInputs.length.value;
    
    this.tempLine.endX = this.tempLine.startX + length * Math.cos(angleRad);
    this.tempLine.endY = this.tempLine.startY + length * Math.sin(angleRad);
    
    this.render();
};

/**
 * Hide input overlay
 */
DrawingEngine.prototype.hideInputOverlay = function() {
    if (this.inputOverlay) {
        this.inputOverlay.remove();
        this.inputOverlay = null;
    }
};

/**
 * Cancel line drawing
 */
DrawingEngine.prototype.cancelLine = function() {
    this.tempLine = null;
    this.hideInputOverlay();
    this.snapPoint = null;
    this.render();
};