/**
 * Main Application Controller
 * Handles UI interactions and coordinates between components
 */

class ElectricalCADApp {
    constructor() {
        this.drawingEngine = null;
        this.mapManager = new MapManager();
        this.gpxParser = new GPXParser();
        this.currentProject = {
            name: 'Untitled Project',
            created: new Date(),
            modified: new Date()
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }

    /**
     * Setup the application after DOM is ready
     */
    setupApplication() {
        // Initialize canvas and drawing engine
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize drawing engine
        this.drawingEngine = new DrawingEngine(canvas);
        
        // Make drawing engine globally accessible for property panel
        window.drawingEngine = this.drawingEngine;
        
        // Connect map manager with drawing engine
        this.mapManager.setDrawingEngine(this.drawingEngine);
        
        // Set up callback for status bar updates and map updates
        this.drawingEngine.onElementsChanged = () => {
            this.updateStatusBar();
            this.mapManager.onDrawingChanged();
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize theme
        this.initializeTheme();
        
        // Initialize status bar
        this.updateStatusBar();
        
        console.log('Electrical CAD Application initialized successfully');
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const canvas = document.getElementById('drawingCanvas');
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (this.drawingEngine) {
            this.drawingEngine.render();
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Header buttons
        document.getElementById('newProject')?.addEventListener('click', () => this.newProject());
        document.getElementById('saveProject')?.addEventListener('click', () => this.saveProject());
        document.getElementById('loadGpx')?.addEventListener('click', () => this.loadGPXFile());
        document.getElementById('toggleMapView')?.addEventListener('click', () => this.mapManager.toggleMapView());
        document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());
        
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
        
        // Tool buttons
        document.querySelectorAll('.tool-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTool(e.target.closest('.tool-btn-icon')));
        });
        
        // Add angle tool event listener if it exists
        document.getElementById('angleTool')?.addEventListener('click', () => this.selectToolByType('angle'));
        
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
        
        snapDistanceSlider.addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            this.drawingEngine.setSnapDistance(distance);
            snapDistanceValue.textContent = distance + 'px';
        });
        
        // Initialize snap distance display
        snapDistanceValue.textContent = snapDistanceSlider.value + 'px';
        
        // Dimension style controls
        this.setupDimensionStyleControls();
        
        // Setup dimension preset controls
        this.setupDimensionPresetControls();
        
        // Initialize snap details as collapsed
        const snapDetails = document.getElementById('snapDetails');
        const snapHeader = document.querySelector('.snap-header');
        snapDetails.classList.add('expanded'); // Start expanded for better UX
        
        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.drawingEngine.undo();
            this.updateUndoRedoButtons();
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.drawingEngine.redo();
            this.updateUndoRedoButtons();
        });
        
        // Initial update of undo/redo button states
        this.updateUndoRedoButtons();
        
        // Legend controls
        this.setupLegendControls();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }



    /**
     * Select tool by type
     */
    selectToolByType(toolType) {
        const toolBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (toolBtn) {
            this.selectTool(toolBtn);
        }
    }

    /**
     * Select a drawing tool
     */
    selectTool(toolBtn) {
        // Remove active class from all tool buttons
        document.querySelectorAll('.tool-btn-icon').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        toolBtn.classList.add('active');
        
        // Set tool in drawing engine
        const tool = toolBtn.dataset.tool;
        this.drawingEngine.setTool(tool);
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.drawingEngine.canUndo();
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.drawingEngine.canRedo();
        }
    }

    /**
     * Setup dimension style controls
     */
    setupDimensionStyleControls() {
        // Text size
        const textSizeSlider = document.getElementById('dimensionTextSize');
        const textSizeValue = document.getElementById('dimensionTextSizeValue');
        if (textSizeSlider && textSizeValue) {
            textSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                textSizeValue.textContent = size;
                this.drawingEngine.dimensionStyle.textSize = size;
                this.drawingEngine.render();
            });
        }

        // Text color
        const textColorInput = document.getElementById('dimensionTextColor');
        if (textColorInput) {
            textColorInput.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.textColor = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Line color
        const lineColorInput = document.getElementById('dimensionLineColor');
        if (lineColorInput) {
            lineColorInput.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.lineColor = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Line width
        const lineWidthSlider = document.getElementById('dimensionLineWidth');
        const lineWidthValue = document.getElementById('dimensionLineWidthValue');
        if (lineWidthSlider && lineWidthValue) {
            lineWidthSlider.addEventListener('input', (e) => {
                const width = parseInt(e.target.value);
                lineWidthValue.textContent = width;
                this.drawingEngine.dimensionStyle.lineWidth = width;
                this.drawingEngine.render();
            });
        }

        // Line opacity
        const lineOpacitySlider = document.getElementById('dimension-line-opacity');
        const lineOpacityValue = document.getElementById('dimension-line-opacity-value');
        if (lineOpacitySlider && lineOpacityValue) {
            lineOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.drawingEngine.dimensionStyle.lineOpacity = value;
                lineOpacityValue.textContent = value + '%';
                this.drawingEngine.render();
            });
        }

        // Line style
        const lineStyleSelect = document.getElementById('dimensionLineStyle');
        if (lineStyleSelect) {
            lineStyleSelect.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.lineStyle = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Arc size
        const arcSizeSlider = document.getElementById('dimensionArcSize');
        const arcSizeValue = document.getElementById('dimensionArcSizeValue');
        if (arcSizeSlider && arcSizeValue) {
            arcSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                arcSizeValue.textContent = size;
                this.drawingEngine.dimensionStyle.arcSize = size;
                this.drawingEngine.render();
            });
        }

        // Font
        const fontSelect = document.getElementById('dimensionFont');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.font = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Text style
        const textStyleSelect = document.getElementById('dimensionTextStyle');
        if (textStyleSelect) {
            textStyleSelect.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.textStyle = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Unit
        const unitSelect = document.getElementById('dimensionUnit');
        if (unitSelect) {
            unitSelect.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.unit = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Precision
        const precisionSlider = document.getElementById('dimensionPrecision');
        const precisionValue = document.getElementById('dimensionPrecisionValue');
        if (precisionSlider && precisionValue) {
            precisionSlider.addEventListener('input', (e) => {
                const precision = parseInt(e.target.value);
                precisionValue.textContent = precision;
                this.drawingEngine.dimensionStyle.precision = precision;
                this.drawingEngine.render();
            });
        }

        // Prefix
        const prefixInput = document.getElementById('dimensionPrefix');
        if (prefixInput) {
            prefixInput.addEventListener('input', (e) => {
                this.drawingEngine.dimensionStyle.prefix = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Suffix
        const suffixInput = document.getElementById('dimensionSuffix');
        if (suffixInput) {
            suffixInput.addEventListener('input', (e) => {
                this.drawingEngine.dimensionStyle.suffix = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Show background
        const showBackgroundCheck = document.getElementById('dimensionShowBackground');
        if (showBackgroundCheck) {
            showBackgroundCheck.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.showBackground = e.target.checked;
                this.drawingEngine.render();
            });
        }

        // Show arrows
        const showArrowsCheck = document.getElementById('dimensionShowArrows');
        if (showArrowsCheck) {
            showArrowsCheck.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.showArrows = e.target.checked;
                this.drawingEngine.render();
            });
        }

        // Background color
        const backgroundColorInput = document.getElementById('dimensionBackgroundColor');
        if (backgroundColorInput) {
            backgroundColorInput.addEventListener('change', (e) => {
                this.drawingEngine.dimensionStyle.backgroundColor = e.target.value;
                this.drawingEngine.render();
            });
        }

        // Background opacity
        const backgroundOpacitySlider = document.getElementById('dimensionBackgroundOpacity');
        const backgroundOpacityValue = document.getElementById('dimensionBackgroundOpacityValue');
        if (backgroundOpacitySlider && backgroundOpacityValue) {
            backgroundOpacitySlider.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value);
                backgroundOpacityValue.textContent = opacity;
                this.drawingEngine.dimensionStyle.backgroundOpacity = opacity;
                this.drawingEngine.render();
            });
        }
    }

    /**
     * Setup dimension preset controls
     */
    setupDimensionPresetControls() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyDimensionPreset(preset);
                
                // Update active state
                presetButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    /**
     * Apply dimension preset
     */
    applyDimensionPreset(preset) {
        const presets = {
            minimal: {
                textSize: 12,
                textColor: '#333333',
                lineColor: '#666666',
                lineWidth: 1,
                lineStyle: 'solid',
                arcSize: 30,
                font: 'Arial',
                textStyle: 'normal',
                unit: '°',
                precision: 1,
                prefix: '',
                suffix: '',
                showBackground: false,
                showArrows: false,
                backgroundColor: '#ffffff',
                backgroundOpacity: 80
            },
            standard: {
                textSize: 14,
                textColor: '#000000',
                lineColor: '#0066cc',
                lineWidth: 2,
                lineStyle: 'solid',
                arcSize: 40,
                font: 'Arial',
                textStyle: 'normal',
                unit: '°',
                precision: 1,
                prefix: '',
                suffix: '',
                showBackground: true,
                showArrows: true,
                backgroundColor: '#ffffff',
                backgroundOpacity: 90
            },
            technical: {
                textSize: 12,
                textColor: '#000000',
                lineColor: '#ff0000',
                lineWidth: 1,
                lineStyle: 'solid',
                arcSize: 35,
                font: 'Courier New',
                textStyle: 'normal',
                unit: '°',
                precision: 2,
                prefix: '∠',
                suffix: '',
                showBackground: true,
                showArrows: true,
                backgroundColor: '#ffffcc',
                backgroundOpacity: 85
            },
            bold: {
                textSize: 16,
                textColor: '#ffffff',
                lineColor: '#ff6600',
                lineWidth: 3,
                lineStyle: 'solid',
                arcSize: 50,
                font: 'Arial',
                textStyle: 'bold',
                unit: '°',
                precision: 0,
                prefix: '',
                suffix: '',
                showBackground: true,
                showArrows: true,
                backgroundColor: '#333333',
                backgroundOpacity: 95
            }
        };

        const presetStyle = presets[preset];
        if (presetStyle) {
            // Apply preset to drawing engine
            Object.assign(this.drawingEngine.dimensionStyle, presetStyle);
            
            // Update UI controls
            this.updateDimensionStyleUI();
            
            // Re-render
            this.drawingEngine.render();
        }
    }

    /**
     * Update dimension style UI controls
     */
    updateDimensionStyleUI() {
        const style = this.drawingEngine.dimensionStyle;
        
        // Update sliders and their values
        const updateSlider = (id, valueId, value) => {
            const slider = document.getElementById(id);
            const valueEl = document.getElementById(valueId);
            if (slider) slider.value = value;
            if (valueEl) valueEl.textContent = value;
        };
        
        updateSlider('dimensionTextSize', 'dimensionTextSizeValue', style.textSize);
        updateSlider('dimensionLineWidth', 'dimensionLineWidthValue', style.lineWidth);
        updateSlider('dimensionArcSize', 'dimensionArcSizeValue', style.arcSize);
        updateSlider('dimensionPrecision', 'dimensionPrecisionValue', style.precision);
        updateSlider('dimensionBackgroundOpacity', 'dimensionBackgroundOpacityValue', style.backgroundOpacity);
        
        // Update line opacity slider
        const lineOpacitySlider = document.getElementById('dimension-line-opacity');
        const lineOpacityValue = document.getElementById('dimension-line-opacity-value');
        if (lineOpacitySlider && lineOpacityValue) {
            lineOpacitySlider.value = style.lineOpacity;
            lineOpacityValue.textContent = style.lineOpacity + '%';
        }
        
        // Update color inputs
        const updateColor = (id, value) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
        };
        
        updateColor('dimensionTextColor', style.textColor);
        updateColor('dimensionLineColor', style.lineColor);
        updateColor('dimensionBackgroundColor', style.backgroundColor);
        
        // Update selects
        const updateSelect = (id, value) => {
            const select = document.getElementById(id);
            if (select) select.value = value;
        };
        
        updateSelect('dimensionLineStyle', style.lineStyle);
        updateSelect('dimensionFont', style.font);
        updateSelect('dimensionTextStyle', style.textStyle);
        updateSelect('dimensionUnit', style.unit);
        
        // Update text inputs
        const updateText = (id, value) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
        };
        
        updateText('dimensionPrefix', style.prefix);
        updateText('dimensionSuffix', style.suffix);
        
        // Update checkboxes
        const updateCheckbox = (id, value) => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = value;
        };
        
        updateCheckbox('dimensionShowBackground', style.showBackground);
        updateCheckbox('dimensionShowArrows', style.showArrows);
    }

    /**
     * Select a symbol type
     */
    selectSymbol(symbolBtn) {
        // Remove active class from all symbol buttons
        document.querySelectorAll('.symbol-btn-icon').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        symbolBtn.classList.add('active');
        
        // Set pole type in drawing engine
        const type = symbolBtn.dataset.type;
        this.drawingEngine.setPoleType(type);
        
        // Auto-select pole tool
        this.selectToolByType('pole');
    }

    /**
     * Select a line type
     */
    selectLineType(lineBtn) {
        // Remove active class from all line type buttons
        document.querySelectorAll('.line-type-btn-icon').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        lineBtn.classList.add('active');
        
        // Set line type in drawing engine
        const type = lineBtn.dataset.type;
        this.drawingEngine.setLineType(type);
        
        // Auto-select line tool
        this.selectToolByType('line');
    }

    /**
     * Create a new project
     */
    newProject() {
        if (confirm('Are you sure you want to create a new project? Any unsaved changes will be lost.')) {
            this.drawingEngine.clear();
            this.currentProject = {
                name: 'Untitled Project',
                created: new Date(),
                modified: new Date()
            };
            this.showNotification('New project created', 'success');
        }
    }

    /**
     * Save current project
     */
    saveProject() {
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
    }

    /**
     * Load GPX file
     */
    loadGPXFile() {
        document.getElementById('gpxFileInput').click();
    }

    /**
     * Handle GPX file selection
     */
    handleGPXFile(event) {
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
    }

    /**
     * Process GPX file content
     */
    processGPXContent(gpxContent) {
        try {
            // Parse GPX
            const gpxData = this.gpxParser.parseGPX(gpxContent);
            
            if (gpxData.waypoints.length === 0 && gpxData.tracks.length === 0 && gpxData.routes.length === 0) {
                this.showNotification('No waypoints, tracks, or routes found in GPX file', 'warning');
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
            
        } catch (error) {
            console.error('Error processing GPX:', error);
            this.showNotification('Error processing GPX file: ' + error.message, 'error');
        }
    }






}

// Initialize application when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ElectricalCADApp();
});

// Add some additional CSS for properties panel
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .property-group {
        margin-bottom: 15px;
    }
    
    .property-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 5px;
        color: #2c3e50;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .property-group input,
    .property-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }
    
    .property-group input:focus,
    .property-group select:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .property-actions {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }
    
    .btn-danger {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: background 0.3s ease;
    }
    
    .btn-danger:hover {
        background: #c0392b;
    }
`;
document.head.appendChild(additionalStyles);