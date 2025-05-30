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
        
        // Setup legend controls
        this.setupLegendControls();
        
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
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make app globally accessible
    window.app = new ElectricalCADApp();
});