/**
 * Event Setup Coordinator
 * Coordinates the setup of all event listeners by calling specific setup methods
 */

ElectricalCADApp.prototype.setupEventListeners = function() {
    // Setup different categories of event listeners
    this.setupHeaderEventListeners();
    this.setupToolEventListeners();
    this.setupSelectionEventListeners();
    this.setupSnapEventListeners();
    this.setupDimensionStyleControlListeners();
    this.setupDimensionPresetControlListeners();
    this.setupMiscEventListeners();
    
    // Initialize snap details as expanded for better UX
    const snapDetails = document.getElementById('snapDetails');
    if (snapDetails) {
        snapDetails.classList.add('expanded');
    }
    
    // Initial update of undo/redo button states
    this.updateUndoRedoButtons();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
};