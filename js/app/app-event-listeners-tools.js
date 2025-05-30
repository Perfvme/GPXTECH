/**
 * Tools Event Listeners
 * Handles all tool-related event listeners including tool buttons, symbols, line types, and canvas controls
 */

ElectricalCADApp.prototype.setupToolEventListeners = function() {
    // Tool buttons
    document.querySelectorAll('.tool-btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => this.selectTool(e.target.closest('.tool-btn-icon')));
    });
    
    // Add angle tool event listener if it exists
    document.getElementById('angleTool')?.addEventListener('click', () => this.selectToolByType('angle'));
    
    // Symbol buttons
    document.querySelectorAll('.symbol-btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => this.selectSymbol(e.target.closest('.symbol-btn-icon')));
    });
    
    // Line type buttons
    document.querySelectorAll('.line-type-btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => this.selectLineType(e.target.closest('.line-type-btn-icon')));
    });
    
    // Canvas controls
    document.getElementById('zoomIn')?.addEventListener('click', () => this.drawingEngine.zoomIn());
    document.getElementById('zoomOut')?.addEventListener('click', () => this.drawingEngine.zoomOut());
    document.getElementById('resetView')?.addEventListener('click', () => this.drawingEngine.resetView());
    
    // Accessories checkboxes
    document.getElementById('addGrounding')?.addEventListener('change', (e) => {
        this.drawingEngine.setGrounding(e.target.checked);
    });
    
    document.getElementById('addGuywire')?.addEventListener('change', (e) => {
        this.drawingEngine.setGuywire(e.target.checked);
    });
    
    // Display options
    document.getElementById('showNameLabels')?.addEventListener('change', (e) => {
        this.drawingEngine.toggleNameLabels(e.target.checked);
    });
    
    // Undo/Redo buttons
    document.getElementById('undoBtn').addEventListener('click', () => {
        this.drawingEngine.undo();
        this.updateUndoRedoButtons();
    });
    
    document.getElementById('redoBtn').addEventListener('click', () => {
        this.drawingEngine.redo();
        this.updateUndoRedoButtons();
    });
};