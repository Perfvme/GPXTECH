/**
 * Snap Event Listeners
 * Handles all snap-related event listeners including snap toggles and distance controls
 */

ElectricalCADApp.prototype.setupSnapEventListeners = function() {
    // Snap toggle
    document.getElementById('snapToggle').addEventListener('change', (e) => {
        this.drawingEngine.setSnapEnabled(e.target.checked);
    });
    
    // Individual snap type toggles
    document.getElementById('snapEndpoints').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('endpoints', e.target.checked);
    });
    
    document.getElementById('snapIntersections').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('intersections', e.target.checked);
    });
    
    document.getElementById('snapMidpoints').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('midpoints', e.target.checked);
    });
    
    document.getElementById('snapGrid').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('grid', e.target.checked);
    });
    
    document.getElementById('snapPerpendicular').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('perpendicular', e.target.checked);
    });
    
    document.getElementById('snapParallel').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('parallel', e.target.checked);
    });
    
    document.getElementById('snapCenter').addEventListener('change', (e) => {
        this.drawingEngine.setSnapType('center', e.target.checked);
    });
    
    // Snap distance control
    const snapDistanceSlider = document.getElementById('snapDistance');
    const snapDistanceValue = document.getElementById('snapDistanceValue');
    
    if (snapDistanceSlider && snapDistanceValue) {
        snapDistanceSlider.addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            this.drawingEngine.setSnapDistance(distance);
            snapDistanceValue.textContent = distance + 'px';
        });
        
        // Initialize snap distance display
        snapDistanceValue.textContent = snapDistanceSlider.value + 'px';
    }
};