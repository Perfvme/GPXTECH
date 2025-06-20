/**
 * Header Event Listeners
 * Handles all header-related event listeners including buttons and file inputs
 */

ElectricalCADApp.prototype.setupHeaderEventListeners = function() {
    // Header buttons
    document.getElementById('newProject')?.addEventListener('click', () => this.newProject());
    document.getElementById('saveProject')?.addEventListener('click', () => this.saveProject());
    document.getElementById('loadGpx')?.addEventListener('click', () => this.loadGPXFile());
    document.getElementById('toggleMapView')?.addEventListener('click', () => this.toggleMapView());
    document.getElementById('toggleElevationView')?.addEventListener('click', () => this.toggleElevationProfileView());
    document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());
    document.getElementById('toggleTerrainView')?.addEventListener('click', () => this.toggleTerrainView());
    
    // Add button to enable real coordinates for manual drawing
    const enableRealCoordsBtn = document.createElement('button');
    enableRealCoordsBtn.textContent = 'Enable Real Coordinates';
    enableRealCoordsBtn.className = 'btn btn-secondary';
    enableRealCoordsBtn.title = 'Enable real coordinate system and metric calculations for manual drawing';
    enableRealCoordsBtn.addEventListener('click', () => this.enableRealCoordinatesForDrawing());
    
    // Add to header right section
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        headerRight.appendChild(enableRealCoordsBtn);
    }
    
    // GPX file input
    document.getElementById('gpxFileInput')?.addEventListener('change', (e) => this.handleGPXFile(e));
    
    // JSON project file input
    document.getElementById('loadJsonFileInput')?.addEventListener('change', (e) => this.handleProjectFile(e));
    
    // Save/Load project buttons (both in header and toolbar)
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.saveProject());
    document.getElementById('loadProjectBtn')?.addEventListener('click', () => this.loadProjectFile());
};

document.addEventListener('DOMContentLoaded', function() {
    // Export dropdown event listeners
    const exportDropdown = document.getElementById('exportOptionsDropdown');
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn && exportDropdown) {
        exportBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            // Position dropdown below the button
            const rect = exportBtn.getBoundingClientRect();
            exportDropdown.style.display = (exportDropdown.style.display === 'block') ? 'none' : 'block';
            exportDropdown.style.position = 'absolute';
            exportDropdown.style.left = rect.left + 'px';
            exportDropdown.style.top = (rect.bottom + window.scrollY) + 'px';
            exportDropdown.style.minWidth = rect.width + 'px';
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!exportDropdown.contains(e.target) && e.target !== exportBtn) {
                exportDropdown.style.display = 'none';
            }
        });
    }
    if (exportDropdown) {
        exportDropdown.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-export-type]');
            if (!btn) return;
            const type = btn.getAttribute('data-export-type');
            if (type === 'canvas-jpg') {
                window.app.exportCanvasAsJPG();
            } else if (type === 'canvas-pdf') {
                window.app.exportCanvasAsPDF();
            }
            exportDropdown.style.display = 'none';
        });
    }
});