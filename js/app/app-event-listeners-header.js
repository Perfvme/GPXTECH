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
};