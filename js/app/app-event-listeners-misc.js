/**
 * Miscellaneous Event Listeners
 * Handles miscellaneous event listeners that don't fit into other categories
 */

ElectricalCADApp.prototype.setupMiscEventListeners = function() {
    // Legend controls are handled in app-main.js
    // This function is reserved for other miscellaneous event listeners
    
    // Status bar coordinate system toggle
    document.getElementById('coordinateSystem').addEventListener('click', () => {
        this.toggleCoordinateSystem();
    });
    
    // Display mode buttons
    document.getElementById('viewDrawingBtn').addEventListener('click', () => {
        this.showView('drawing');
    });
    
    document.getElementById('viewMapBtn').addEventListener('click', () => {
        this.showView('map');
    });
    
    document.getElementById('viewElevationBtn').addEventListener('click', () => {
        this.showView('elevation');
    });
    
    document.getElementById('view3DBtn').addEventListener('click', () => {
        this.showView('terrain');
    });
    
    // Legend minimize button
    document.getElementById('legendMinimize').addEventListener('click', () => {
        const legend = document.getElementById('legend');
        const content = document.getElementById('legendContent');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            legend.classList.remove('minimized');
        } else {
            content.style.display = 'none';
            legend.classList.add('minimized');
        }
    });
    
    // Toolbar tab switching
    const toolbarTabs = document.querySelectorAll('.toolbar-tab');
    toolbarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            toolbarTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all panels
            const panels = document.querySelectorAll('.toolbar-panel');
            panels.forEach(panel => panel.classList.remove('active'));
            
            // Show the corresponding panel
            const tabName = tab.getAttribute('data-tab');
            const panel = document.getElementById(`${tabName}-panel`);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
    
    // Display mode button toggling
    const displayModeBtns = document.querySelectorAll('.display-mode-btn');
    displayModeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            displayModeBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });
    
    // Delete button functionality
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (this.drawingEngine.selectedElements.size > 0) {
                this.drawingEngine.deleteSelectedElements();
            }
        });
    }
    
    // View options
    const showGridCheckbox = document.getElementById('showGrid');
    if (showGridCheckbox) {
        showGridCheckbox.addEventListener('change', () => {
            this.drawingEngine.showGrid = showGridCheckbox.checked;
            this.drawingEngine.render();
        });
    }
    
    const showRulersCheckbox = document.getElementById('showRulers');
    if (showRulersCheckbox) {
        showRulersCheckbox.addEventListener('change', () => {
            this.drawingEngine.showRulers = showRulersCheckbox.checked;
            this.drawingEngine.render();
        });
    }
    
    const showCoordinatesCheckbox = document.getElementById('showCoordinates');
    if (showCoordinatesCheckbox) {
        showCoordinatesCheckbox.addEventListener('change', () => {
            this.drawingEngine.showCoordinates = showCoordinatesCheckbox.checked;
            this.drawingEngine.render();
        });
    }
    
    const showLabelsCheckbox = document.getElementById('showLabels');
    if (showLabelsCheckbox) {
        showLabelsCheckbox.addEventListener('change', () => {
            this.drawingEngine.showNameLabels = showLabelsCheckbox.checked;
            this.drawingEngine.render();
        });
    }
    
    const showDimensionsViewCheckbox = document.getElementById('showDimensionsView');
    if (showDimensionsViewCheckbox) {
        showDimensionsViewCheckbox.addEventListener('change', () => {
            this.drawingEngine.showDimensions = showDimensionsViewCheckbox.checked;
            this.drawingEngine.render();
        });
    }
};