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
        this.onElementsChanged = null; // Callback for when elements change
        
        // Angular dimension tool state
        this.angleState = {
            mode: 'none', // 'none', 'selecting-first', 'selecting-second', 'selecting-third'
            points: [],
            lines: [],
            previewAngle: null
        };
        this.dimensionStyle = {
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
            backgroundColor: '#ffffff',
            backgroundOpacity: 80
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
}