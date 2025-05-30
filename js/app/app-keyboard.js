/**
 * Keyboard Shortcuts
 * Handles keyboard shortcuts and key events
 */

ElectricalCADApp.prototype.handleKeyboard = function(e) {
    // Prevent default for our shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 's':
                e.preventDefault();
                this.saveProject();
                break;
            case 'n':
                e.preventDefault();
                this.newProject();
                break;
            case 'o':
                e.preventDefault();
                this.loadGPXFile();
                break;
            case 'z':
                 if (!e.shiftKey) {
                     e.preventDefault();
                     this.drawingEngine.undo();
                     this.updateUndoRedoButtons();
                 } else {
                     e.preventDefault();
                     this.drawingEngine.redo();
                     this.updateUndoRedoButtons();
                 }
                 break;
             case 'y':
                 e.preventDefault();
                 this.drawingEngine.redo();
                 this.updateUndoRedoButtons();
                 break;
        }
    }
    
    // Tool shortcuts
    switch (e.key.toLowerCase()) {
        case 'v':
            this.selectToolByType('select');
            break;
        case 'h':
            this.selectToolByType('pan');
            break;
        case 'l':
            this.selectToolByType('line');
            break;
        case 'p':
            this.selectToolByType('pole');
            break;
        case 'a':
            this.selectToolByType('angle');
            break;
        case 'delete':
        case 'backspace':
            this.drawingEngine.deleteSelected();
            break;
        case 'escape':
            this.drawingEngine.selectedElement = null;
            this.drawingEngine.updatePropertiesPanel(null);
            this.drawingEngine.render();
            break;
    }
};