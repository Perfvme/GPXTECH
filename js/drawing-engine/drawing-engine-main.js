/**
 * Drawing Engine Main Class
 * Core functionality and constructor for the drawing engine
 */

class DrawingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.elements = {
            poles: [],
            lines: [],
            dimensions: []
        };
        this.metadata = {
            metersPerPixel: 1,
            coordinateSystem: 'Canvas',
            totalDistance: 0
        };
        // Real coordinate system properties
        this.coordinateSystem = {
            isRealCoordinates: false,
            utmZone: null,
            centerUtmX: 0,
            centerUtmY: 0,
            centerCanvasX: 0,
            centerCanvasY: 0,
            scale: 1
        };
        this.selectedElement = null;
        this.selectedElements = new Set(); // For multiple selection
        this.dragSelection = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        };
        this.currentTool = 'select';
        this.currentPoleType = 'tiang-baja-existing';
        this.currentLineType = 'sutm-existing';
        this.addGrounding = false;
        this.addGuywire = false;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.tempLine = null;
        this.gridSize = 20;
        this.showGrid = true;
        this.showNameLabels = true;
        this.showDimensions = true;
        this.onElementsChanged = null; // Callback for when elements change
        
        // Angular dimension tool state
        this.angleState = {
            mode: 'none', // 'none', 'selecting-first', 'selecting-second', 'selecting-third'
            points: [],
            lines: [],
            previewAngle: null
        };
        // Aligned dimension tool state
        this.alignedDimensionState = {
            mode: 'none', // 'none', 'selecting-first', 'selecting-second'
            points: [],
            previewDistance: null
        };
        this.dimensionStyle = {
            // Default style for angle dimensions
            angle: {
                textSize: 14,
                textColor: '#000000',
                lineColor: '#0066cc',
                lineWidth: 1,
                lineStyle: 'solid',
                lineOpacity: 100,
                arcSize: 30,
                font: 'Arial',
                textStyle: 'normal',
                unit: '°',
                precision: 1,
                prefix: '',
                suffix: '',
                showBackground: true,
                showArrows: false,
                showDeflection: false,
                backgroundColor: '#ffffff',
                backgroundOpacity: 80,
                textOpacity: 100,
                textOffset: 10
            },
            // Default style for aligned dimensions
            aligned: {
                textSize: 12,
                textColor: '#333333',
                lineColor: '#666666',
                lineWidth: 0.8,
                lineStyle: 'solid',
                lineOpacity: 90,
                font: 'Arial',
                textStyle: 'normal',
                unit: 'm',
                precision: 2,
                prefix: '',
                suffix: '',
                showBackground: true,
                showArrows: true,
                backgroundColor: '#f8f8f8',
                backgroundOpacity: 90,
                textOpacity: 100,
                textOffset: 10
            }
        };
        
        // Pole label style system
        this.poleLabelStyle = {
            textSize: 5,
            textColor: '#333333',
            font: 'Arial',
            textStyle: 'normal',
            showBackground: false,
            backgroundColor: '#ffffff',
            backgroundOpacity: 80,
            textOffset: 12.5
        };
        
        // Undo/Redo system
        this.commandHistory = [];
        this.currentCommandIndex = -1;
        this.maxHistorySize = 50;
        
        // Advanced line drawing features
        this.snapEnabled = true;
        this.snapDistance = 15; // pixels
        this.lineDrawingMode = 'normal'; // 'normal', 'angle-length'
        this.preciseInputs = {
            angle: { value: 0, locked: false },
            length: { value: 0, locked: false }
        };
        this.snapPoint = null;
        this.previewLine = null;
        this.inputOverlay = null;
        
        // Enhanced snap system
        this.snapTypes = {
            grid: true,
            endpoints: true,
            midpoints: true,
            intersections: true,
            perpendicular: true,
            parallel: true,
            center: true
        };
        this.snapToGrid = true;
        this.snapPriority = ['endpoints', 'intersections', 'midpoints', 'perpendicular', 'grid', 'center'];
        this.snapCache = new Map(); // Cache for performance
        this.lastSnapUpdate = 0;
        this.snapUpdateThrottle = 16; // ~60fps
        
        this.setupEventListeners();
        this.render();
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.currentTool = tool;
        this.tempLine = null;
        
        // Reset angle tool state when switching tools
        if (tool !== 'angle') {
            this.resetAngleTool();
        } else {
            this.angleState.mode = 'selecting-first';
        }
        
        // Reset aligned dimension tool state when switching tools
        if (tool !== 'aligned-dimension') {
            this.resetAlignedDimensionTool();
        } else {
            this.alignedDimensionState.mode = 'selecting-first';
        }
        
        // Remove all tool classes
        this.canvas.classList.remove('tool-select', 'tool-line', 'tool-pole', 'tool-angle', 
                                    'tool-aligned-dimension', 'tool-pan', 'tool-drag-select');
        
        // Add current tool class
        this.canvas.classList.add(`tool-${tool}`);
        
        switch (tool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'angle':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }

    /**
     * Set current pole type
     */
    setPoleType(type) {
        this.currentPoleType = type;
    }

    /**
     * Set current line type
     */
    setLineType(type) {
        this.currentLineType = type;
    }

    /**
     * Set grounding option
     */
    setGrounding(enabled) {
        this.addGrounding = enabled;
    }

    /**
     * Set guywire option
     */
    setGuywire(enabled) {
        this.addGuywire = enabled;
    }

    /**
     * Toggle name labels visibility
     */
    toggleNameLabels(show) {
        this.showNameLabels = show;
        this.render();
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.render();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.render();
    }

    /**
     * Reset view
     */
    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    /**
     * Reset angle tool state
     */
    resetAngleTool() {
        this.angleState = {
            mode: 'none',
            points: [],
            lines: [],
            previewAngle: null
        };
    }

    /**
     * Reset aligned dimension tool state
     */
    resetAlignedDimensionTool() {
        this.alignedDimensionState = {
            mode: 'none',
            points: [],
            previewDistance: null
        };
    }

    /**
     * Delete selected elements
     */
    deleteSelectedElements() {
        if (this.selectedElement) {
            this.executeCommand(new DeleteElementCommand(this, this.selectedElement));
            this.selectedElement = null;
        } else if (this.selectedElements.size > 0) {
            // Convert Set to Array to allow iteration and modification within loop
            const elementsToDelete = Array.from(this.selectedElements);
            for (const element of elementsToDelete) {
                this.executeCommand(new DeleteElementCommand(this, element));
            }
            this.selectedElements.clear();
        }
        this.render();
        if (this.onElementsChanged) {
            this.onElementsChanged();
        }
    }

    /**
     * Undo last command
     */
    undo() {
        if (this.currentCommandIndex > 0) {
            this.currentCommandIndex--;
            this.commandHistory[this.currentCommandIndex].undo();
            this.render();
        }
    }

    /**
     * Redo last command
     */
    redo() {
        if (this.currentCommandIndex < this.commandHistory.length - 1) {
            this.currentCommandIndex++;
            this.commandHistory[this.currentCommandIndex].execute();
            this.render();
        }
    }

    /**
     * Execute a command and add to history
     */
    executeCommand(command) {
        // Clear redo history if a new command is executed
        if (this.currentCommandIndex < this.commandHistory.length - 1) {
            this.commandHistory = this.commandHistory.slice(0, this.currentCommandIndex + 1);
        }
        this.commandHistory.push(command);
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift(); // Remove oldest command
        }
        this.currentCommandIndex = this.commandHistory.length - 1;
        command.execute();
    }

    /**
     * Set individual dimension style property
     * @param {string} type - 'angle' or 'aligned'
     * @param {string} property - Style property name (e.g., 'textColor', 'lineWidth')
     * @param {*} value - New value for the property
     */
    setDimensionStyle(type, property, value) {
        if (this.dimensionStyle[type] && this.dimensionStyle[type].hasOwnProperty(property)) {
            this.dimensionStyle[type][property] = value;
            // Update all existing dimensions of this type
            this.elements.dimensions.forEach(dim => {
                if (dim.type === type) {
                    // Ensure it's a reference, not a copy
                    dim.style = this.dimensionStyle[type];
                }
            });
            this.render(); // Re-render to apply changes
        } else {
            console.warn(`Dimension style property '${property}' not found for type '${type}'.`);
        }
    }

    /**
     * Set multiple dimension style properties at once for a given type
     * @param {string} type - 'angle' or 'aligned'
     * @param {Object} properties - Object with style property names and new values
     */
    setBatchDimensionStyle(type, properties) {
        if (this.dimensionStyle[type]) {
            Object.assign(this.dimensionStyle[type], properties);
            // Update all existing dimensions of this type
            this.elements.dimensions.forEach(dim => {
                if (dim.type === type) {
                    // Ensure it's a reference, not a copy
                    dim.style = this.dimensionStyle[type];
                }
            });
            this.render(); // Re-render to apply changes
        } else {
            console.warn(`Dimension style type '${type}' not found.`);
        }
    }

    /**
     * Update pole label style property
     * @param {string} property - Style property name (e.g., 'textColor', 'textSize')
     * @param {*} value - New value for the property
     */
    updatePoleLabelStyle(property, value) {
        if (this.poleLabelStyle.hasOwnProperty(property)) {
            const oldValue = this.poleLabelStyle[property];
            
            // Use command system for undo/redo support
            const command = new PoleLabelStyleChangeCommand(this, property, value, oldValue);
            this.executeCommand(command);
        } else {
            console.warn(`Pole label style property '${property}' not found.`);
        }
    }

    /**
     * Update pole label preview canvas
     */
    updatePoleLabelPreview() {
        const previewCanvas = document.getElementById('poleLabelPreview');
        if (!previewCanvas) return;
        
        const ctx = previewCanvas.getContext('2d');
        const style = this.poleLabelStyle;
        
        // Clear canvas
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Set up font
        const fontStyle = style.textStyle === 'bold italic' ? 'bold italic' : 
                         style.textStyle === 'bold' ? 'bold' : 
                         style.textStyle === 'italic' ? 'italic' : 'normal';
        ctx.font = `${fontStyle} ${style.textSize * 3}px ${style.font}`;
        ctx.textAlign = 'center';
        
        const centerX = previewCanvas.width / 2;
        const centerY = previewCanvas.height / 2;
        const sampleText = 'Pole 1';
        
        // Draw background if enabled
        if (style.showBackground) {
            const textMetrics = ctx.measureText(sampleText);
            const textWidth = textMetrics.width;
            const textHeight = style.textSize * 3;
            
            ctx.globalAlpha = style.backgroundOpacity / 100;
            ctx.fillStyle = style.backgroundColor;
            ctx.fillRect(centerX - textWidth/2 - 2, centerY - textHeight/2 - 1, textWidth + 4, textHeight + 2);
            ctx.globalAlpha = 1;
        }
        
        // Draw text
        ctx.fillStyle = style.textColor;
        ctx.fillText(sampleText, centerX, centerY + (style.textSize * 3) / 3);
    }

    /**
     * Reset pole label style to default values
     */
    resetPoleLabelStyle() {
        this.poleLabelStyle = {
            textSize: 5,
            textColor: '#333333',
            font: 'Arial',
            textStyle: 'normal',
            showBackground: false,
            backgroundColor: '#ffffff',
            backgroundOpacity: 80,
            textOffset: 12.5
        };
        
        // Update the properties panel if pole labels are selected
        const selectedElements = Array.from(this.selectedElements);
        const poleLabels = selectedElements.filter(el => el.type && (el.type.includes('tiang') || el.type.includes('gardu')) && el.name && el.name.trim() !== '');
        if (poleLabels.length > 0 && poleLabels.length === selectedElements.length) {
            this.showPoleLabelStylePanel(poleLabels);
        }
        
        // Re-render to apply changes
        this.render();
    }
}