/**
 * Selection Event Listeners
 * Handles all selection-related event listeners including selection controls and batch operations
 */

ElectricalCADApp.prototype.setupSelectionEventListeners = function() {
    // Selection controls
    document.getElementById('selectAll')?.addEventListener('click', () => {
        this.drawingEngine.selectAll();
    });

    document.getElementById('clearSelection')?.addEventListener('click', () => {
        this.drawingEngine.clearSelection();
    });

    document.getElementById('selectFiltered')?.addEventListener('click', () => {
        const filterType = document.getElementById('filterSelect').value;
        this.drawingEngine.selectByFilter(filterType);
    });

    // Batch operation buttons
    document.getElementById('batchChangeType')?.addEventListener('click', () => {
        const newType = document.getElementById('batchTypeSelect').value;
        if (newType) {
            this.drawingEngine.batchChangeType(newType);
        } else {
            alert('Please select a type first.');
        }
    });

    document.getElementById('batchChangeName')?.addEventListener('click', () => {
        const newName = document.getElementById('batchNameInput').value;
        const useNumberedNames = document.getElementById('useNumberedNames').checked;
        this.drawingEngine.batchChangeName(newName, useNumberedNames);
    });
};