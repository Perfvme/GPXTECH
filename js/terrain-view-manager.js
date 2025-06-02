class TerrainViewManager {
    constructor() {
        this.viewer = null;
        this.isTerrainView = false;
        this.drawingEngine = null;
        this.entities = [];
    }

    setDrawingEngine(drawingEngine) {
        this.drawingEngine = drawingEngine;
    }

    initializeTerrainView() {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NDA2ZTdlOC02ZGJiLTQ1YzMtYTJiNy00YWQ0YTgzODVjYWIiLCJpZCI6MzA4MzgyLCJpYXQiOjE3NDg4NDk3NDB9.Q3XnVHlzZj5xHo_wZeZA7kJ5hccByn6KznhdZWRglqM';
        if (this.viewer) {
            this.viewer.container.style.display = 'block';
            this.viewer.resize();
            return;
        }
        let imageryProvider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/'
        });
        this.viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: new Cesium.CesiumTerrainProvider({ url: Cesium.IonResource.fromAssetId(1) }),
            imageryProvider: imageryProvider,
            animation: false,
            timeline: false,
            geocoder: false,
            homeButton: true,
            sceneModePicker: true,
            baseLayerPicker: true,
            navigationHelpButton: false,
            infoBox: false,
            selectionIndicator: false,
            fullscreenButton: false,
        });
        this.viewer.scene.globe.enableLighting = true;
        this.enableDefaultMouseControls();
    }

    enableDefaultMouseControls() {
        const scene = this.viewer.scene;
        const controller = scene.screenSpaceCameraController;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
    }

    updateTerrainViewFromDrawing() {
        if (!this.viewer || !this.drawingEngine) return;
        this.viewer.entities.removeAll();
        this.entities = [];
        const { poles, lines } = this.drawingEngine.elements;
        const coordinateSystem = this.drawingEngine.coordinateSystem;
        if (!coordinateSystem.isRealCoordinates) {
            this.showMessageOverlay('3D view requires real coordinates. Load GPX or enable real coordinates.');
            return;
        } else {
            this.hideMessageOverlay();
        }
        let hasValidElements = false;
        poles.forEach(pole => {
            let poleLat, poleLon, poleElev;
            if (pole.originalLat && pole.originalLon) {
                poleLat = pole.originalLat;
                poleLon = pole.originalLon;
                poleElev = pole.elevation || 0;
            } else if (pole.utmX && pole.utmY && coordinateSystem.utmZone) {
                const latLon = this.drawingEngine.utmToLatLon(pole.utmX, pole.utmY, coordinateSystem.utmZone);
                poleLat = latLon.lat;
                poleLon = latLon.lon;
                poleElev = pole.elevation || 0;
            } else {
                return;
            }
            hasValidElements = true;
            const position = Cesium.Cartesian3.fromDegrees(poleLon, poleLat, poleElev);
            let entity;
            if (this.viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
                entity = this.viewer.entities.add({
                    name: pole.name || `Pole ${pole.id}`,
                    position: position,
                    cylinder: {
                        length: 8.0,
                        topRadius: 0.25,
                        bottomRadius: 0.25,
                        material: this.getCesiumColorForPole(pole.type),
                        outline: true,
                        outlineColor: Cesium.Color.BLACK,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    description: `<h4>${pole.name}</h4><p>Type: ${pole.type}</p><p>Elevation: ${poleElev.toFixed(2)}m</p>`
                });
            } else {
                entity = this.viewer.entities.add({
                    name: pole.name || `Pole ${pole.id}`,
                    position: position,
                    point: {
                        pixelSize: 8,
                        color: this.getCesiumColorForPole(pole.type),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    description: `<h4>${pole.name}</h4><p>Type: ${pole.type}</p><p>Elevation: ${poleElev.toFixed(2)}m</p>`
                });
            }
            this.entities.push(entity);
        });
        lines.forEach(line => {
            let startLat, startLon, startElev;
            let endLat, endLon, endElev;
            const startPole = poles.find(p => p.id === line.startPole);
            if (startPole && startPole.originalLat && startPole.originalLon) {
                startLat = startPole.originalLat;
                startLon = startPole.originalLon;
                startElev = startPole.elevation || 0;
            } else if (line.startUtm && coordinateSystem.utmZone) {
                const latLon = this.drawingEngine.utmToLatLon(line.startUtm.x, line.startUtm.y, coordinateSystem.utmZone);
                startLat = latLon.lat;
                startLon = latLon.lon;
                startElev = line.startElevation || 0;
            } else {
                return;
            }
            const endPole = poles.find(p => p.id === line.endPole);
            if (endPole && endPole.originalLat && endPole.originalLon) {
                endLat = endPole.originalLat;
                endLon = endPole.originalLon;
                endElev = endPole.elevation || 0;
            } else if (line.endUtm && coordinateSystem.utmZone) {
                const latLon = this.drawingEngine.utmToLatLon(line.endUtm.x, line.endUtm.y, coordinateSystem.utmZone);
                endLat = latLon.lat;
                endLon = latLon.lon;
                endElev = line.endElevation || 0;
            } else {
                return;
            }
            hasValidElements = true;
            startElev = Number(startElev) || 0;
            endElev = Number(endElev) || 0;
            let positions;
            if (line.sag && line.sag.enabled && typeof line.chordLengthMeters === 'number') {
                // Generate sagged points in world coordinates
                const sagDepth = this.drawingEngine.getAbsoluteSagDepth(line);
                const startPt = { x: startLon, y: startLat, z: startElev };
                const endPt = { x: endLon, y: endLat, z: endElev };
                const saggedPoints = this.drawingEngine.generateSaggedPoints(startPt, endPt, sagDepth, 20);
                positions = saggedPoints.map(pt => Cesium.Cartesian3.fromDegrees(pt.x, pt.y, pt.z));
            } else {
                positions = Cesium.Cartesian3.fromDegreesArrayHeights([
                    startLon, startLat, startElev,
                    endLon, endLat, endElev
                ]);
            }
            const lineEntity = this.viewer.entities.add({
                name: line.name || `Line ${line.id}`,
                polyline: {
                    positions: positions,
                    width: 3,
                    material: this.getCesiumColorForLine(line.type),
                    arcType: Cesium.ArcType.NONE
                },
                description: `<h4>${line.name}</h4><p>Type: ${line.type}</p><p>Length: ${line.chordLengthMeters ? line.chordLengthMeters.toFixed(2) + 'm' : 'N/A'}</p>`
            });
            this.entities.push(lineEntity);
        });
        if (hasValidElements && this.entities.length > 0) {
            this.flyToElements();
        }
    }

    flyToElements() {
        if (this.viewer && this.entities.length > 0) {
            this.viewer.flyTo(this.entities, { duration: 1.5 });
        }
    }

    showMessageOverlay(message) {
        let overlay = document.getElementById('terrainViewOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'terrainViewOverlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '50%';
            overlay.style.left = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.background = 'rgba(0,0,0,0.7)';
            overlay.style.color = '#fff';
            overlay.style.padding = '18px 32px';
            overlay.style.borderRadius = '8px';
            overlay.style.fontSize = '1.1em';
            overlay.style.zIndex = '10';
            overlay.style.pointerEvents = 'none';
            const container = document.getElementById('terrainViewContainer');
            if (container) container.appendChild(overlay);
        }
        overlay.textContent = message;
        overlay.style.display = 'block';
    }

    hideMessageOverlay() {
        const overlay = document.getElementById('terrainViewOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    getCesiumColorForPole(poleType) {
        switch (poleType) {
            case 'tiang-baja-existing': return Cesium.Color.BLACK.withAlpha(0.9);
            case 'tiang-baja-rencana': return Cesium.Color.LIGHTGRAY.withAlpha(0.9);
            case 'tiang-beton-existing': return Cesium.Color.DIMGRAY.withAlpha(0.9);
            case 'tiang-beton-rencana': return Cesium.Color.SILVER.withAlpha(0.9);
            case 'gardu-portal': return Cesium.Color.GOLD.withAlpha(0.9);
            default: return Cesium.Color.GRAY.withAlpha(0.9);
        }
    }

    getCesiumColorForLine(lineType) {
        switch (lineType) {
            case 'sutm-existing':
            case 'sutm-rencana':
                return Cesium.Color.RED.withAlpha(0.8);
            case 'sutr-existing':
            case 'sutr-rencana':
                return Cesium.Color.BLUE.withAlpha(0.8);
            default: return Cesium.Color.YELLOW.withAlpha(0.8);
        }
    }

    destroy() {
        if (this.viewer && !this.viewer.isDestroyed()) {
            this.viewer.destroy();
        }
        this.viewer = null;
    }
} 