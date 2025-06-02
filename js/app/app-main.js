/**
 * Main Application Controller
 * Handles UI interactions and coordinates between components
 */

class ElectricalCADApp {
    constructor() {
        this.drawingEngine = null;
        this.mapManager = new MapManager();
        this.elevationProfileManager = null;
        this.terrainViewManager = null;
        this.gpxParser = new GPXParser();
        this.currentProject = {
            name: 'Untitled Project',
            created: new Date(),
            modified: new Date(),
            titleBlockData: this.getDefaultTitleBlockData()
        };
        this.currentView = 'canvas';
        this.gpxRawData = null;
        
        this.init();
    }

    getDefaultTitleBlockData() {
        return {
            companyName: "PT PLN (PERSERO)",
            projectUnit: "UNIT PELAKSANA PROYEK KETENAGALISTRIKAN",
            province: "PROVINSI SULAWESI UTARA",
            drawingTitle: "GAMBAR RENCANA PEMBANGUNAN JARINGAN SUTR DESA TORAUT, BOLAANG MONGONDOW",
            rows: [
                { label: "DIRENCANA", nama: "UP2K SULUT", paraf: "", jabatan: "", noGbrPart: "" },
                { label: "DIGAMBAR", nama: "NN", paraf: "", jabatan: "NN", noGbrPart: "" },
                { label: "DIPERIKSA", nama: "", paraf: "", jabatan: "", noGbrPart: "" },
                { label: "DISETUJUI", nama: "", paraf: "", jabatan: "", noGbrPart: "" }
            ],
            drawingNumber: "01",
            includeInExport: false
        };
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
        
        // Elevation profile manager
        this.elevationProfileManager = new ElevationProfileManager('elevationChartCanvas');
        this.elevationProfileManager.setDrawingEngine(this.drawingEngine);

        // Terrain view manager
        this.terrainViewManager = new TerrainViewManager();
        this.terrainViewManager.setDrawingEngine(this.drawingEngine);
        
        // Set up callback for status bar updates and map/elevation/terrain updates
        this.drawingEngine.onElementsChanged = () => {
            this.updateStatusBar();
            if (this.mapManager.isMapView) {
                this.mapManager.onDrawingChanged();
            }
            if (this.elevationProfileManager.isProfileView) {
                this.elevationProfileManager.updateProfileData(this.gpxRawData, this.drawingEngine.elements);
            }
            if (this.terrainViewManager.isTerrainView) {
                this.terrainViewManager.updateTerrainViewFromDrawing();
            }
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup legend controls
        this.setupLegendControls();
        
        // Initialize theme
        this.initializeTheme();
        
        // Initialize status bar
        this.updateStatusBar();
        
        // Setup title block modal
        this.setupTitleBlockModal();
        
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

    // Method to provide data for the elevation profile
    getGpxDataForProfile() {
        return {
            gpxData: this.gpxRawData,
            drawingElements: this.drawingEngine.elements
        };
    }

    // Toggle Map View
    toggleMapView() {
        const canvasContainer = document.getElementById('canvasContainer');
        const mapContainer = document.getElementById('mapContainer');
        const elevationContainer = document.getElementById('elevationProfileContainer');
        const mapToggleButton = document.getElementById('toggleMapView');
        const elevationToggleButton = document.getElementById('toggleElevationView');
        if (this.currentView !== 'map') {
            canvasContainer.style.display = 'none';
            elevationContainer.style.display = 'none';
            mapContainer.style.display = 'flex';
            mapToggleButton.innerHTML = '<i class="fas fa-drafting-compass"></i> Canvas View';
            mapToggleButton.classList.add('active');
            elevationToggleButton.classList.remove('active');
            elevationToggleButton.innerHTML = '<i class="fas fa-chart-line"></i> Elevation Profile';
            if (!this.mapManager.map) {
                this.mapManager.initializeMap();
            }
            this.mapManager.isMapView = true;
            setTimeout(() => {
                this.mapManager.map.invalidateSize();
                this.mapManager.updateMapFromDrawing();
            }, 100);
            this.currentView = 'map';
        } else {
            mapContainer.style.display = 'none';
            canvasContainer.style.display = 'flex';
            mapToggleButton.innerHTML = '<i class="fas fa-map"></i> Map View';
            mapToggleButton.classList.remove('active');
            this.currentView = 'canvas';
            this.mapManager.isMapView = false;
        }
        this.elevationProfileManager.isProfileView = false;
    }

    // Toggle Elevation Profile View
    toggleElevationProfileView() {
        const canvasContainer = document.getElementById('canvasContainer');
        const mapContainer = document.getElementById('mapContainer');
        const elevationContainer = document.getElementById('elevationProfileContainer');
        const elevationToggleButton = document.getElementById('toggleElevationView');
        const mapToggleButton = document.getElementById('toggleMapView');
        if (this.currentView !== 'elevation') {
            canvasContainer.style.display = 'none';
            mapContainer.style.display = 'none';
            elevationContainer.style.display = 'flex';
            elevationToggleButton.innerHTML = '<i class="fas fa-drafting-compass"></i> Canvas View';
            elevationToggleButton.classList.add('active');
            mapToggleButton.classList.remove('active');
            mapToggleButton.innerHTML = '<i class="fas fa-map"></i> Map View';
            if (!this.elevationProfileManager.chart) {
                this.elevationProfileManager.initializeChart();
            }
            this.elevationProfileManager.isProfileView = true;
            this.elevationProfileManager.updateProfileData(this.gpxRawData, this.drawingEngine.elements);
            setTimeout(() => {
                if (this.elevationProfileManager.chart) this.elevationProfileManager.chart.resize();
            }, 100);
            this.currentView = 'elevation';
        } else {
            elevationContainer.style.display = 'none';
            canvasContainer.style.display = 'flex';
            elevationToggleButton.innerHTML = '<i class="fas fa-chart-line"></i> Elevation Profile';
            elevationToggleButton.classList.remove('active');
            this.currentView = 'canvas';
            this.elevationProfileManager.isProfileView = false;
        }
        this.mapManager.isMapView = false;
    }

    // Toggle 3D Terrain View
    toggleTerrainView() {
        const canvasContainer = document.getElementById('canvasContainer');
        const mapContainer = document.getElementById('mapContainer');
        const elevationContainer = document.getElementById('elevationProfileContainer');
        const terrainContainer = document.getElementById('terrainViewContainer');
        const terrainToggleButton = document.getElementById('toggleTerrainView');
        const mapToggleButton = document.getElementById('toggleMapView');
        const elevationToggleButton = document.getElementById('toggleElevationView');
        const terrainZoomBtn = document.getElementById('terrainZoomAllBtn');
        if (this.currentView !== 'terrain') {
            this.currentView = 'terrain';
            canvasContainer.style.display = 'none';
            mapContainer.style.display = 'none';
            elevationContainer.style.display = 'none';
            terrainContainer.style.display = 'flex';
            terrainToggleButton.innerHTML = '<i class="fas fa-drafting-compass"></i> Canvas View';
            terrainToggleButton.classList.add('active');
            mapToggleButton.classList.remove('active');
            mapToggleButton.innerHTML = '<i class="fas fa-map"></i> Map View';
            elevationToggleButton.classList.remove('active');
            elevationToggleButton.innerHTML = '<i class="fas fa-chart-line"></i> Elevation Profile';
            if (!this.terrainViewManager.viewer) {
                this.terrainViewManager.initializeTerrainView();
            } else {
                this.terrainViewManager.viewer.resize();
            }
            this.terrainViewManager.isTerrainView = true;
            this.terrainViewManager.updateTerrainViewFromDrawing();
            this.mapManager.isMapView = false;
            this.elevationProfileManager.isProfileView = false;
            if (terrainZoomBtn) {
                terrainZoomBtn.style.display = '';
                terrainZoomBtn.onclick = () => this.terrainViewManager.flyToElements();
            }
        } else {
            this.currentView = 'canvas';
            terrainContainer.style.display = 'none';
            canvasContainer.style.display = 'flex';
            terrainToggleButton.innerHTML = '<i class="fas fa-globe-americas"></i> 3D Terrain';
            terrainToggleButton.classList.remove('active');
            this.terrainViewManager.isTerrainView = false;
            if (terrainZoomBtn) terrainZoomBtn.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make app globally accessible
    window.app = new ElectricalCADApp();
});