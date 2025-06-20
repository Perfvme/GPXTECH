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
            modified: new Date(),
            titleBlockData: this.getDefaultTitleBlockData()
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
            version: '1.0',
            drawing: this.drawingEngine.exportData(),
            metadata: {
                ...this.drawingEngine.metadata,
                coordinateSystem: this.drawingEngine.coordinateSystem,
                currentView: this.currentView,
                gpxDataIncluded: !!this.gpxRawData
            },
            titleBlockData: this.currentProject.titleBlockData,
            // Include GPX data if available for elevation profiles
            gpxData: this.gpxRawData ? {
                waypoints: this.gpxRawData.waypoints,
                tracks: this.gpxRawData.tracks,
                routes: this.gpxRawData.routes,
                bounds: this.gpxRawData.bounds
            } : null
        };
        
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        
        // Create a more descriptive filename
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const projectName = this.currentProject.name.replace(/[^a-z0-9]/gi, '_');
        link.download = `${projectName}_${timestamp}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        
        this.showNotification('Project saved successfully', 'success');
        console.log('Project saved:', {
            name: this.currentProject.name,
            elements: {
                poles: this.drawingEngine.elements.poles.length,
                lines: this.drawingEngine.elements.lines.length,
                dimensions: this.drawingEngine.elements.dimensions.length
            },
            hasGPXData: !!this.gpxRawData
        });
    } catch (error) {
        console.error('Error saving project:', error);
        this.showNotification('Error saving project: ' + error.message, 'error');
    }
};

/**
 * Load a project from data
 */
ElectricalCADApp.prototype.loadProject = function(projectData) {
    try {
        // Validate project data first
        const validationErrors = this.validateProjectData(projectData);
        if (validationErrors.length > 0) {
            throw new Error('Project validation failed: ' + validationErrors.join(', '));
        }
        
        // Create backup of current project if it has content
        this.createBackup();
        
        // Load project metadata
        this.currentProject = {
            name: projectData.name || 'Loaded Project',
            created: projectData.created ? new Date(projectData.created) : new Date(),
            modified: projectData.modified ? new Date(projectData.modified) : new Date(),
            titleBlockData: projectData.titleBlockData || this.getDefaultTitleBlockData()
        };
        
        // Load drawing data
        if (projectData.drawing) {
            this.drawingEngine.importData(projectData.drawing);
            
            // Restore metadata if available
            if (projectData.metadata) {
                this.drawingEngine.metadata = { ...this.drawingEngine.metadata, ...projectData.metadata };
                
                // Restore coordinate system
                if (projectData.metadata.coordinateSystem) {
                    this.drawingEngine.coordinateSystem = { 
                        ...this.drawingEngine.coordinateSystem, 
                        ...projectData.metadata.coordinateSystem 
                    };
                }
            }
        }
        
        // Load GPX data if available
        if (projectData.gpxData) {
            this.gpxRawData = projectData.gpxData;
            console.log('GPX data restored for elevation profiles');
        } else {
            this.gpxRawData = null;
        }
        
        // Restore view if specified
        if (projectData.metadata && projectData.metadata.currentView) {
            this.currentView = projectData.metadata.currentView;
        }
        
        // Update status bar and UI
        this.updateStatusBar();
        
        // Log successful load
        console.log('Project loaded:', {
            name: this.currentProject.name,
            version: projectData.version || 'unknown',
            elements: {
                poles: this.drawingEngine.elements.poles.length,
                lines: this.drawingEngine.elements.lines.length,
                dimensions: this.drawingEngine.elements.dimensions.length
            },
            hasGPXData: !!this.gpxRawData,
            coordinateSystem: this.drawingEngine.coordinateSystem.isRealCoordinates ? 'UTM' : 'Canvas'
        });
        
        this.showNotification(`Project "${this.currentProject.name}" loaded successfully`, 'success');
        
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
 * Load project file
 */
ElectricalCADApp.prototype.loadProjectFile = function() {
    document.getElementById('loadJsonFileInput').click();
};

/**
 * Handle project file selection
 */
ElectricalCADApp.prototype.handleProjectFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        this.showNotification('Please select a valid JSON project file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const projectData = JSON.parse(e.target.result);
            this.loadProject(projectData);
            
            // Update views if active
            if (this.currentView === 'map') this.mapManager.updateMapFromDrawing();
            if (this.currentView === 'elevation') this.elevationProfileManager.updateProfileData(null, this.drawingEngine.elements);
            if (this.currentView === 'terrain') this.terrainViewManager.updateTerrainViewFromDrawing();
            
            // Clear the file input
            event.target.value = '';
        } catch (error) {
            console.error('Error loading project file:', error);
            this.showNotification('Error loading project file: ' + error.message, 'error');
        }
    };
    
    reader.onerror = () => {
        this.showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
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

/**
 * Validate project data structure
 */
ElectricalCADApp.prototype.validateProjectData = function(projectData) {
    const errors = [];
    
    // Check if projectData exists and is an object
    if (!projectData || typeof projectData !== 'object') {
        errors.push('Project data is not a valid object');
        return errors;
    }
    
    // Check for required fields
    if (!projectData.name || typeof projectData.name !== 'string') {
        errors.push('Project name is missing or invalid');
    }
    
    // Check drawing data
    if (projectData.drawing) {
        if (!projectData.drawing.elements) {
            errors.push('Drawing elements are missing');
        } else {
            const elements = projectData.drawing.elements;
            if (!Array.isArray(elements.poles)) {
                errors.push('Poles data is not an array');
            }
            if (!Array.isArray(elements.lines)) {
                errors.push('Lines data is not an array');
            }
            if (!Array.isArray(elements.dimensions)) {
                errors.push('Dimensions data is not an array');
            }
        }
    }
    
    // Check title block data
    if (projectData.titleBlockData && typeof projectData.titleBlockData !== 'object') {
        errors.push('Title block data is invalid');
    }
    
    return errors;
};

/**
 * Create project backup before loading new project
 */
ElectricalCADApp.prototype.createBackup = function() {
    try {
        const hasElements = this.drawingEngine.elements.poles.length > 0 || 
                           this.drawingEngine.elements.lines.length > 0 || 
                           this.drawingEngine.elements.dimensions.length > 0;
        
        if (hasElements) {
            const backupData = {
                ...this.currentProject,
                modified: new Date(),
                drawing: this.drawingEngine.exportData(),
                isBackup: true
            };
            
            localStorage.setItem('electricalCAD_backup', JSON.stringify(backupData));
            console.log('Backup created successfully');
        }
    } catch (error) {
        console.warn('Could not create backup:', error);
    }
};

/**
 * Test save/load functionality
 * This function can be called from the browser console to test the system
 */
ElectricalCADApp.prototype.testSaveLoad = function() {
    console.log('Testing save/load functionality...');
    
    try {
        // Create some test data
        this.drawingEngine.elements.poles.push({
            id: 'test_pole_1',
            x: 100,
            y: 100,
            type: 'tiang-baja-existing',
            name: 'Test Pole 1'
        });
        
        this.drawingEngine.elements.lines.push({
            id: 'test_line_1',
            startX: 100,
            startY: 100,
            endX: 200,
            endY: 200,
            type: 'sutm-existing',
            name: 'Test Line 1'
        });
        
        // Test export
        const exportedData = this.drawingEngine.exportData();
        console.log('Export test passed:', exportedData);
        
        // Test project data creation
        const projectData = {
            name: 'Test Project',
            created: new Date(),
            modified: new Date(),
            drawing: exportedData,
            titleBlockData: this.getDefaultTitleBlockData()
        };
        
        // Test validation
        const validationErrors = this.validateProjectData(projectData);
        if (validationErrors.length > 0) {
            throw new Error('Validation failed: ' + validationErrors.join(', '));
        }
        console.log('Validation test passed');
        
        // Test serialization
        const jsonString = JSON.stringify(projectData);
        const parsedData = JSON.parse(jsonString);
        console.log('Serialization test passed');
        
        // Test load
        const originalElementCount = this.drawingEngine.elements.poles.length + this.drawingEngine.elements.lines.length;
        this.loadProject(parsedData);
        const newElementCount = this.drawingEngine.elements.poles.length + this.drawingEngine.elements.lines.length;
        
        if (newElementCount !== originalElementCount) {
            throw new Error('Element count mismatch after load');
        }
        
        console.log('✅ Save/Load functionality test PASSED');
        this.showNotification('Save/Load test completed successfully', 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Save/Load functionality test FAILED:', error);
        this.showNotification('Save/Load test failed: ' + error.message, 'error');
        return false;
    }
};