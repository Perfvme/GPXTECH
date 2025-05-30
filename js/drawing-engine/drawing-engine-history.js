/**
 * Drawing Engine - History Management Module
 * Handles undo/redo functionality and command execution
 */

/**
 * Execute a command and add it to history
 */
DrawingEngine.prototype.executeCommand = function(command) {
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
};

/**
 * Undo the last command
 */
DrawingEngine.prototype.undo = function() {
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
};

/**
 * Redo the next command
 */
DrawingEngine.prototype.redo = function() {
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
};

/**
 * Check if undo is available
 */
DrawingEngine.prototype.canUndo = function() {
    return this.currentCommandIndex >= 0;
};

/**
 * Check if redo is available
 */
DrawingEngine.prototype.canRedo = function() {
    return this.currentCommandIndex < this.commandHistory.length - 1;
};

/**
 * Clear command history
 */
DrawingEngine.prototype.clearHistory = function() {
    this.commandHistory = [];
    this.currentCommandIndex = -1;
};