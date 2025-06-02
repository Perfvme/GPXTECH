/**
 * Project Management
 * Handles project creation, saving, loading, and GPX file processing
 */

/**
 * Create a new project
 */
ElectricalCADApp.prototype.newProject = function() {
    if (confirm('Are you sure you want to create a new project? Any unsaved changes will be lost.')) {
        this.drawingEngine.clear();
        this.currentProject = {
            name: 'Untitled Project',
            created: new Date(),
            modified: new Date()
        };
        this.gpxRawData = null; // Clear GPX data on new project
        this.showNotification('New project created', 'success');
        // Update views if active
        if (this.currentView === 'map') this.mapManager.updateMapFromDrawing();
        if (this.currentView === 'elevation') this.elevationProfileManager.updateProfileData(null, this.drawingEngine.elements);
    }
};

/**
 * Save current project
 */
ElectricalCADApp.prototype.saveProject = function() {
    try {
        const projectData = {
            ...this.currentProject,
            modified: new Date(),
            drawing: this.drawingEngine.exportData()
        };
        
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        link.click();
        
        this.showNotification('Project saved successfully', 'success');
    } catch (error) {
        console.error('Error saving project:', error);
        this.showNotification('Error saving project', 'error');
    }
};

/**
 * Load a project from data
 */
ElectricalCADApp.prototype.loadProject = function(projectData) {
    try {
        this.currentProject = {
            name: projectData.name || 'Loaded Project',
            created: new Date(projectData.created) || new Date(),
            modified: new Date(projectData.modified) || new Date()
        };
        
        if (projectData.drawing) {
            this.drawingEngine.importData(projectData.drawing);
        }
        
        this.showNotification('Project loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading project:', error);
        this.showNotification('Error loading project: ' + error.message, 'error');
    }
};

/**
 * Load GPX file
 */
ElectricalCADApp.prototype.loadGPXFile = function() {
    document.getElementById('gpxFileInput').click();
};

/**
 * Handle GPX file selection
 */
ElectricalCADApp.prototype.handleGPXFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.gpx')) {
        this.showNotification('Please select a valid GPX file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            this.processGPXContent(e.target.result);
        } catch (error) {
            console.error('Error processing GPX file:', error);
            this.showNotification('Error processing GPX file: ' + error.message, 'error');
        }
    };
    
    reader.onerror = () => {
        this.showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
};

/**
 * Process GPX file content
 */
ElectricalCADApp.prototype.processGPXContent = function(gpxContent) {
    try {
        // Parse GPX
        const gpxData = this.gpxParser.parseGPX(gpxContent);
        this.gpxRawData = gpxData; // Store for elevation profile
        
        if (gpxData.waypoints.length === 0 && gpxData.tracks.length === 0 && gpxData.routes.length === 0) {
            this.showNotification('No waypoints, tracks, or routes found in GPX file', 'warning');
            this.gpxRawData = null; // Clear if no data
            return;
        }
        
        // Project coordinates to canvas
        const canvas = document.getElementById('drawingCanvas');
        this.gpxParser.projectToCanvas(gpxData.bounds, canvas.width, canvas.height);
        
        // Convert to drawing elements
        const elements = this.gpxParser.toDrawingElements();
        
        // Load into drawing engine
        this.drawingEngine.loadFromGPX(elements);
        
        // Load GPX data into map manager
        this.mapManager.loadGPXData(gpxData);
        
        // Enable real coordinates for manual drawing using GPX reference
        if (elements.poles.length > 0 || elements.lines.length > 0) {
            const referencePoint = {
                utmX: this.drawingEngine.coordinateSystem.centerUtmX,
                utmY: this.drawingEngine.coordinateSystem.centerUtmY,
                utmZone: this.drawingEngine.coordinateSystem.utmZone,
                scale: this.drawingEngine.coordinateSystem.scale
            };
            this.drawingEngine.enableRealCoordinates(referencePoint);
        }
        
        // Update project info
        this.currentProject.name = `GPX Import - ${new Date().toLocaleDateString()}`;
        this.currentProject.modified = new Date();
        
        // Show success message with distance information
        const totalElements = elements.poles.length + elements.lines.length;
        const distanceInfo = elements.metadata && elements.metadata.totalDistance > 0 
            ? ` | Total distance: ${elements.metadata.totalDistance}m (${(elements.metadata.totalDistance / 1000).toFixed(3)}km)`
            : '';
        
        this.showNotification(
            `GPX loaded successfully: ${elements.poles.length} poles, ${elements.lines.length} lines${distanceInfo}`,
            'success'
        );
        
        // Log coordinate system information
        if (elements.metadata && elements.metadata.coordinateSystem === 'UTM') {
            console.log('GPX imported with UTM coordinate system:', {
                metersPerPixel: elements.metadata.metersPerPixel,
                totalDistance: elements.metadata.totalDistance,
                coordinateSystem: elements.metadata.coordinateSystem
            });
        }
        
        // Update status bar
        this.updateStatusBar();
        
        // Reset view to fit content
        this.drawingEngine.resetView();
        
        // After loading into drawing engine, if elevation view is active, update it
        if (this.currentView === 'elevation') {
            this.elevationProfileManager.updateProfileData(this.gpxRawData, this.drawingEngine.elements);
        }
        
    } catch (error) {
        console.error('Error processing GPX:', error);
        this.showNotification('Error processing GPX file: ' + error.message, 'error');
        this.gpxRawData = null; // Clear on error
    }
};