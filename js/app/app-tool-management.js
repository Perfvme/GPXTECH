/**
 * Tool Management
 * Handles tool selection, symbol selection, and line type selection
 */

/**
 * Select tool by type
 */
ElectricalCADApp.prototype.selectToolByType = function(toolType) {
    const toolBtn = document.querySelector(`[data-tool="${toolType}"]`);
    if (toolBtn) {
        this.selectTool(toolBtn);
    }
};

/**
 * Select a drawing tool
 */
ElectricalCADApp.prototype.selectTool = function(toolBtn) {
    // Remove active class from all tool buttons (supporting both old and new classes)
    document.querySelectorAll('.tool-btn-icon, .tool-btn-primary').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected button
    toolBtn.classList.add('active');
    
    // Set tool in drawing engine
    const tool = toolBtn.dataset.tool;
    this.drawingEngine.setTool(tool);
};

/**
 * Select a symbol (pole type)
 */
ElectricalCADApp.prototype.selectSymbol = function(symbolBtn) {
    // Remove active class from all symbol buttons
    document.querySelectorAll('.symbol-btn-icon').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected button
    symbolBtn.classList.add('active');
    
    // Set pole type in drawing engine
    const type = symbolBtn.dataset.type;
    this.drawingEngine.setPoleType(type);
    
    // Auto-select pole tool
    this.selectToolByType('pole');
};

/**
 * Select a line type
 */
ElectricalCADApp.prototype.selectLineType = function(lineBtn) {
    // Remove active class from all line type buttons
    document.querySelectorAll('.line-type-btn-icon').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected button
    lineBtn.classList.add('active');
    
    // Set line type in drawing engine
    const type = lineBtn.dataset.type;
    this.drawingEngine.setLineType(type);
    
    // Auto-select line tool
    this.selectToolByType('line');
};

/**
 * Update undo/redo button states
 */
ElectricalCADApp.prototype.updateUndoRedoButtons = function() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = !this.drawingEngine.canUndo();
        if (undoBtn.disabled) {
            undoBtn.classList.add('disabled');
        } else {
            undoBtn.classList.remove('disabled');
        }
    }
    
    if (redoBtn) {
        redoBtn.disabled = !this.drawingEngine.canRedo();
        if (redoBtn.disabled) {
            redoBtn.classList.add('disabled');
        } else {
            redoBtn.classList.remove('disabled');
        }
    }
};