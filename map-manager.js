/**
 * Map Manager for Electrical CAD Drawing
 * Handles Leaflet map integration and GPS coordinate visualization
 */

class MapManager {
    constructor() {
        this.map = null;
        this.isMapView = false;
        this.drawingLayer = null;
        this.poleMarkers = [];
        this.linePolylines = [];
        this.bounds = null;
        this.drawingEngine = null;
        
        // Custom icons for different pole types - matching legend symbols
        this.poleIcons = {
            'tiang-baja-existing': this.createLegendMatchingIcon('tiang-baja-existing'),
            'tiang-baja-rencana': this.createLegendMatchingIcon('tiang-baja-rencana'),
            'tiang-beton-existing': this.createLegendMatchingIcon('tiang-beton-existing'),
            'tiang-beton-rencana': this.createLegendMatchingIcon('tiang-beton-rencana'),
            'gardu-portal': this.createLegendMatchingIcon('gardu-portal')
        };
        
        // Line styles for different types - matching legend colors
        this.lineStyles = {
            'sutm-existing': { color: '#ff0000', weight: 4, dashArray: null, opacity: 0.8 },
            'sutm-rencana': { color: '#ff0000', weight: 4, dashArray: '10, 5', opacity: 0.8 },
            'sutr-existing': { color: '#0000ff', weight: 3, dashArray: null, opacity: 0.8 },
            'sutr-rencana': { color: '#0000ff', weight: 3, dashArray: '5, 3', opacity: 0.8 }
        };
    }

    /**
     * Initialize the map
     */
    initializeMap() {
        if (this.map) {
            return;
        }

        // Initialize Leaflet map
        this.map = L.map('leafletMap', {
            center: [-6.2088, 106.8456], // Default to Jakarta
            zoom: 13,
            zoomControl: false // We'll use custom controls
        });

        // Add tile layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        });

        const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
            maxZoom: 17
        });

        // Add default layer
        osmLayer.addTo(this.map);

        // Layer control
        const baseMaps = {
            "OpenStreetMap": osmLayer,
            "Satellite": satelliteLayer,
            "Topographic": topoLayer
        };

        L.control.layers(baseMaps).addTo(this.map);

        // Create drawing layer
        this.drawingLayer = L.layerGroup().addTo(this.map);

        // Setup map event listeners
        this.setupMapEventListeners();

        console.log('Map initialized successfully');
    }

    /**
     * Create custom icon for poles matching canvas symbols exactly
     */
    createLegendMatchingIcon(poleType) {
        let iconHtml = '';
        
        switch(poleType) {
            case 'tiang-baja-existing':
                // Filled black circle (matches canvas drawTiangBajaExisting)
                iconHtml = `<div style="width: 16px; height: 16px; background: #000; border-radius: 50%;"></div>`;
                break;
            case 'tiang-baja-rencana':
                // Empty circle with black border (matches canvas drawTiangBajaRencana)
                iconHtml = `<div style="width: 16px; height: 16px; background: white; border: 2px solid #000; border-radius: 50%;"></div>`;
                break;
            case 'tiang-beton-existing':
                // Black circle with white dot (matches canvas drawTiangBetonExisting)
                iconHtml = `<div style="width: 16px; height: 16px; background: #000; border-radius: 50%; position: relative;"><div style="position: absolute; width: 6px; height: 6px; background: white; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>`;
                break;
            case 'tiang-beton-rencana':
                // White circle with black border and black dot (matches canvas drawTiangBetonRencana)
                iconHtml = `<div style="width: 16px; height: 16px; background: white; border: 2px solid #000; border-radius: 50%; position: relative;"><div style="position: absolute; width: 6px; height: 6px; background: #000; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>`;
                break;
            case 'gardu-portal':
                // Square with lightning bolt (matches canvas drawGarduPortal)
                iconHtml = `<div style="width: 16px; height: 16px; background: white; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 10px;">⚡</div>`;
                break;
            default:
                iconHtml = `<div style="width: 16px; height: 16px; background: #000; border-radius: 50%;"></div>`;
        }
        
        return L.divIcon({
            className: 'custom-pole-icon',
            html: iconHtml,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    /**
     * Setup map event listeners
     */
    setupMapEventListeners() {
        // Map controls
        document.getElementById('mapZoomIn')?.addEventListener('click', () => {
            this.map.zoomIn();
        });

        document.getElementById('mapZoomOut')?.addEventListener('click', () => {
            this.map.zoomOut();
        });

        document.getElementById('mapResetView')?.addEventListener('click', () => {
            this.resetMapView();
        });

        document.getElementById('mapToggleLayers')?.addEventListener('click', () => {
            // Toggle layer control visibility
            const layerControl = document.querySelector('.leaflet-control-layers');
            if (layerControl) {
                layerControl.style.display = layerControl.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    /**
     * Toggle between canvas and map view
     */
    toggleMapView() {
        const canvasContainer = document.getElementById('canvasContainer');
        const mapContainer = document.getElementById('mapContainer');
        const toggleButton = document.getElementById('toggleMapView');

        if (!this.isMapView) {
            // Switch to map view
            canvasContainer.style.display = 'none';
            mapContainer.style.display = 'flex';
            toggleButton.innerHTML = '<i class="fas fa-drafting-compass"></i> Canvas View';
            
            // Initialize map if not already done
            if (!this.map) {
                this.initializeMap();
            }
            
            // Update map display
            setTimeout(() => {
                this.map.invalidateSize();
                this.updateMapFromDrawing();
            }, 100);
            
            this.isMapView = true;
        } else {
            // Switch to canvas view
            canvasContainer.style.display = 'flex';
            mapContainer.style.display = 'none';
            toggleButton.innerHTML = '<i class="fas fa-map"></i> Map View';
            this.isMapView = false;
        }
    }

    /**
     * Set drawing engine reference
     */
    setDrawingEngine(drawingEngine) {
        this.drawingEngine = drawingEngine;
    }

    /**
     * Update map display from drawing engine data
     */
    updateMapFromDrawing() {
        if (!this.map || !this.drawingEngine) {
            return;
        }

        // Clear existing markers and lines
        this.clearMapElements();

        const elements = this.drawingEngine.elements;
        const coordinateSystem = this.drawingEngine.coordinateSystem;

        // Only show on map if we have real coordinates
        if (!coordinateSystem.isRealCoordinates) {
            this.showNoGPSMessage();
            return;
        }

        // Add poles to map
        elements.poles.forEach(pole => {
            if (pole.originalLat && pole.originalLon) {
                this.addPoleToMap(pole);
            }
        });

        // Add lines to map
        elements.lines.forEach(line => {
            this.addLineToMap(line);
        });

        // Fit map to bounds if we have elements
        if (this.poleMarkers.length > 0 || this.linePolylines.length > 0) {
            this.fitMapToBounds();
        }
    }

    /**
     * Add pole to map
     */
    addPoleToMap(pole) {
        if (!pole.originalLat || !pole.originalLon) return;

        const icon = this.poleIcons[pole.type] || this.poleIcons['tiang-baja-existing'];
        const marker = L.marker([pole.originalLat, pole.originalLon], { icon: icon })
            .bindPopup(`
                <div class="pole-popup">
                    <h4>${pole.name}</h4>
                    <p><strong>Type:</strong> ${pole.type}</p>
                    <p><strong>Coordinates:</strong> ${pole.originalLat.toFixed(6)}, ${pole.originalLon.toFixed(6)}</p>
                    ${pole.elevation ? `<p><strong>Elevation:</strong> ${pole.elevation}m</p>` : ''}
                    ${pole.hasGrounding ? '<p><i class="fas fa-bolt"></i> Grounding</p>' : ''}
                    ${pole.hasGuywire ? '<p><i class="fas fa-link"></i> Guy Wire</p>' : ''}
                </div>
            `)
            .addTo(this.drawingLayer);

        this.poleMarkers.push(marker);
    }

    /**
     * Add line to map
     */
    addLineToMap(line) {
        if (!line.startPole || !line.endPole) return;

        const startPole = this.drawingEngine.elements.poles.find(p => p.id === line.startPole);
        const endPole = this.drawingEngine.elements.poles.find(p => p.id === line.endPole);

        if (!startPole || !endPole || !startPole.originalLat || !startPole.originalLon || !endPole.originalLat || !endPole.originalLon) {
            return;
        }

        const style = this.lineStyles[line.type] || this.lineStyles['sutm-existing'];
        const polyline = L.polyline([
            [startPole.originalLat, startPole.originalLon],
            [endPole.originalLat, endPole.originalLon]
        ], style)
            .bindPopup(`
                <div class="line-popup">
                    <h4>${line.name}</h4>
                    <p><strong>Type:</strong> ${line.type}</p>
                    <p><strong>From:</strong> ${startPole.name}</p>
                    <p><strong>To:</strong> ${endPole.name}</p>
                    <p><strong>Length:</strong> ${line.length ? line.length.toFixed(2) + 'm' : 'N/A'}</p>
                </div>
            `)
            .addTo(this.drawingLayer);

        this.linePolylines.push(polyline);
    }

    /**
     * Clear all map elements
     */
    clearMapElements() {
        if (this.drawingLayer) {
            this.drawingLayer.clearLayers();
        }
        this.poleMarkers = [];
        this.linePolylines = [];
    }

    /**
     * Show message when no GPS data is available
     */
    showNoGPSMessage() {
        const popup = L.popup()
            .setLatLng(this.map.getCenter())
            .setContent(`
                <div class="no-gps-message">
                    <h4><i class="fas fa-exclamation-triangle"></i> No GPS Data</h4>
                    <p>Load a GPX file or enable real coordinates to view elements on the map.</p>
                </div>
            `)
            .openOn(this.map);
    }

    /**
     * Fit map to show all elements
     */
    fitMapToBounds() {
        if (this.poleMarkers.length === 0 && this.linePolylines.length === 0) {
            return;
        }

        const group = new L.featureGroup([...this.poleMarkers, ...this.linePolylines]);
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    /**
     * Reset map view to show all elements
     */
    resetMapView() {
        if (this.poleMarkers.length > 0 || this.linePolylines.length > 0) {
            this.fitMapToBounds();
        } else {
            this.map.setView([-6.2088, 106.8456], 13);
        }
    }

    /**
     * Update map when drawing changes
     */
    onDrawingChanged() {
        if (this.isMapView) {
            this.updateMapFromDrawing();
        }
    }

    /**
     * Load GPX data and center map
     */
    loadGPXData(gpxData) {
        if (!this.map || !gpxData.bounds) {
            return;
        }

        // Center map on GPX bounds
        const bounds = gpxData.bounds;
        if (bounds.minLat && bounds.maxLat && bounds.minLon && bounds.maxLon) {
            const leafletBounds = L.latLngBounds(
                [bounds.minLat, bounds.minLon],
                [bounds.maxLat, bounds.maxLon]
            );
            this.map.fitBounds(leafletBounds, { padding: [20, 20] });
        }

        // Update map display
        this.updateMapFromDrawing();
    }
}