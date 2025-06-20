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
             case 'a':
                 e.preventDefault();
                 // Select all
                 const allElements = [
                     ...this.drawingEngine.elements.poles,
                     ...this.drawingEngine.elements.lines,
                     ...this.drawingEngine.elements.dimensions
                 ];
                 this.drawingEngine.selectedElements = new Set(allElements);
                 this.drawingEngine.render();
                 break;
        }
    }
    
    // Tool shortcuts
    switch (e.key.toLowerCase()) {
        case 'escape':
            this.selectToolByType('select');
            this.drawingEngine.selectedElement = null;
            this.drawingEngine.selectedElements.clear();
            this.drawingEngine.updatePropertiesPanel(null);
            this.drawingEngine.render();
            break;
        case ' ':
            e.preventDefault();
            this.selectToolByType('pan');
            break;
        case 'l':
            this.selectToolByType('line');
            break;
        case 'p':
            this.selectToolByType('pole');
            break;
        case 'd':
            this.selectToolByType('aligned-dimension');
            break;
        case 'a':
            if (!e.ctrlKey && !e.metaKey) {
                this.selectToolByType('angle');
            }
            break;
        case 'delete':
        case 'backspace':
            e.preventDefault();
            this.drawingEngine.deleteSelectedElements();
            break;
        case '?':
            e.preventDefault();
            // Show welcome screen as help
            const welcomeScreen = document.getElementById('welcomeScreen');
            if (welcomeScreen) {
                welcomeScreen.classList.remove('hidden');
            }
            break;
    }
};