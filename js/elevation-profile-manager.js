class ElevationProfileManager {
    constructor(canvasId) {
        this.chartCanvas = document.getElementById(canvasId);
        this.chart = null;
        this.isProfileView = false;
        this.drawingEngine = null;
        this.verticalScale = 1;
        this.poleIndices = [];
        this._setupScaleControls();
    }

    _setupScaleControls() {
        const range = document.getElementById('elevationScaleRange');
        const input = document.getElementById('elevationScaleInput');
        if (!range || !input) return;
        range.value = this.verticalScale;
        input.value = this.verticalScale;
        range.addEventListener('input', (e) => {
            this.verticalScale = parseFloat(e.target.value);
            input.value = this.verticalScale;
            this._applyVerticalScale();
        });
        input.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val < 0.1) val = 0.1;
            if (val > 10) val = 10;
            this.verticalScale = val;
            range.value = this.verticalScale;
            this._applyVerticalScale();
        });
    }

    _applyVerticalScale() {
        if (!this.chart) return;
        // Re-apply y-axis min/max with scale
        const data = this.chart.data.datasets[0].data;
        if (!data.length) return;
        const elevations = data;
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const padding = (maxElevation - minElevation) * 0.1;
        const center = (maxElevation + minElevation) / 2;
        const halfRange = ((maxElevation - minElevation) / 2 + padding) * this.verticalScale;
        this.chart.options.scales.y.min = Math.floor(center - halfRange);
        this.chart.options.scales.y.max = Math.ceil(center + halfRange);
        this.chart.update();
    }

    setDrawingEngine(drawingEngine) {
        this.drawingEngine = drawingEngine;
    }

    initializeChart() {
        if (!this.chartCanvas) {
            console.error("Elevation chart canvas not found!");
            return;
        }
        const ctx = this.chartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Elevation Profile',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        order: 1,
                    },
                    {
                        label: 'Poles',
                        data: [],
                        type: 'scatter',
                        pointBackgroundColor: '#e74c3c',
                        pointBorderColor: '#fff',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false,
                        order: 2,
                        borderWidth: 0,
                        backgroundColor: '#e74c3c',
                        borderColor: '#fff',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Distance (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Elevation (m)'
                        },
                        beginAtZero: false
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Poles') {
                                    return `Pole: ${context.parsed.y.toFixed(2)} m at ${context.parsed.x.toFixed(2)} m`;
                                }
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += `${context.parsed.y.toFixed(2)} m (Elevation)`;
                                }
                                const distance = context.parsed.x;
                                label += ` at ${distance.toFixed(2)} m (Distance)`;
                                return label;
                            }
                        }
                    }
                }
            }
        });
        this._applyVerticalScale();
        console.log('Elevation chart initialized.');
    }

    updateProfileData(gpxData, drawingElements) {
        if (!this.chart) {
            this.initializeChart();
            if (!this.chart) return;
        }

        const profilePoints = [];
        let cumulativeDistance = 0;
        this.poleIndices = [];
        let poleMarkers = [];

        if (gpxData && gpxData.tracks && gpxData.tracks.length > 0) {
            gpxData.tracks.forEach(track => {
                track.points.forEach((point, index, arr) => {
                    if (index === 0) {
                        if (point.elevation !== null && point.elevation !== undefined) {
                            profilePoints.push({ x: cumulativeDistance, y: point.elevation });
                            // Always add a pole marker at the start
                            poleMarkers.push({ x: cumulativeDistance, y: point.elevation });
                        }
                    } else {
                        const prevPoint = arr[index-1];
                        if (point.utmX && prevPoint.utmX) {
                            const segmentDistance = Math.sqrt(
                                Math.pow(point.utmX - prevPoint.utmX, 2) +
                                Math.pow(point.utmY - prevPoint.utmY, 2)
                            );
                            cumulativeDistance += segmentDistance;
                            if (point.elevation !== null && point.elevation !== undefined) {
                                profilePoints.push({ x: cumulativeDistance, y: point.elevation });
                                // Always add a pole marker at the end of each segment
                                poleMarkers.push({ x: cumulativeDistance, y: point.elevation });
                            }
                        }
                    }
                });
            });
            // Find pole points from drawingElements (poles with trackPointIndex)
            if (drawingElements && drawingElements.poles && drawingElements.poles.length > 0) {
                drawingElements.poles.forEach(pole => {
                    if (typeof pole.trackPointIndex === 'number' && gpxData.tracks[pole.trackIndex || 0]) {
                        // Find cumulative distance for this pole
                        let dist = 0;
                        const track = gpxData.tracks[pole.trackIndex || 0];
                        for (let i = 1; i <= pole.trackPointIndex; i++) {
                            const pt = track.points[i];
                            const prevPt = track.points[i-1];
                            if (pt && prevPt && pt.utmX && prevPt.utmX) {
                                dist += Math.sqrt(
                                    Math.pow(pt.utmX - prevPt.utmX, 2) +
                                    Math.pow(pt.utmY - prevPt.utmY, 2)
                                );
                            }
                        }
                        const elev = track.points[pole.trackPointIndex]?.elevation;
                        if (typeof elev === 'number') {
                            poleMarkers.push({ x: dist, y: elev });
                        }
                    }
                });
            }
        } else if (drawingElements && drawingElements.lines && drawingElements.lines.length > 0) {
            // Use sagged points for each line if sag is enabled
            let prevEnd = null;
            drawingElements.lines.forEach(line => {
                let startX = 0, endX = 0;
                let startElev = line.startElevation || 0;
                let endElev = line.endElevation || 0;
                if (profilePoints.length > 0) {
                    startX = profilePoints[profilePoints.length - 1].x;
                }
                if (typeof line.chordLengthMeters === 'number') {
                    endX = startX + line.chordLengthMeters;
                } else if (typeof line.distanceMeters === 'number') {
                    endX = startX + line.distanceMeters;
                } else {
                    endX = startX + 1;
                }
                // Generate sagged points if sag enabled
                let points = [];
                if (line.sag && line.sag.enabled && typeof line.chordLengthMeters === 'number') {
                    const sagDepth = this.drawingEngine.getAbsoluteSagDepth(line);
                    const startPt = { x: startX, y: 0, z: startElev };
                    const endPt = { x: endX, y: 0, z: endElev };
                    points = this.drawingEngine.generateSaggedPoints(startPt, endPt, sagDepth, 20);
                    // Map to profile points: x = horizontal distance, y = sagged elevation
                    points.forEach(pt => {
                        profilePoints.push({ x: pt.x, y: pt.z });
                    });
                } else {
                    // No sag: just straight line
                    profilePoints.push({ x: startX, y: startElev });
                    profilePoints.push({ x: endX, y: endElev });
                }
                // Always add a pole marker at the end of the line
                poleMarkers.push({ x: endX, y: endElev });
            });
            // Try to find poles at line endpoints
            if (drawingElements && drawingElements.poles && drawingElements.poles.length > 0) {
                drawingElements.poles.forEach(pole => {
                    if (typeof pole.lineIndex === 'number' && drawingElements.lines[pole.lineIndex]) {
                        const line = drawingElements.lines[pole.lineIndex];
                        let dist = 0;
                        for (let i = 0; i < pole.lineIndex; i++) {
                            dist += drawingElements.lines[i].chordLengthMeters || drawingElements.lines[i].distanceMeters || 0;
                        }
                        const elev = (pole.elevation !== undefined) ? pole.elevation : (line.startElevation || line.endElevation);
                        if (typeof elev === 'number') {
                            poleMarkers.push({ x: dist, y: elev });
                        }
                    }
                });
            }
        }

        if (profilePoints.length > 0) {
            this.chart.data.labels = profilePoints.map(p => p.x);
            this.chart.data.datasets[0].data = profilePoints.map(p => p.y);
            this.chart.data.datasets[1].data = poleMarkers;
            const elevations = profilePoints.map(p => p.y);
            const minElevation = Math.min(...elevations);
            const maxElevation = Math.max(...elevations);
            const padding = (maxElevation - minElevation) * 0.1;
            const center = (maxElevation + minElevation) / 2;
            const halfRange = ((maxElevation - minElevation) / 2 + padding) * this.verticalScale;
            this.chart.options.scales.y.min = Math.floor(center - halfRange);
            this.chart.options.scales.y.max = Math.ceil(center + halfRange);
        } else {
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.options.scales.y.min = undefined;
            this.chart.options.scales.y.max = undefined;
            console.log("No elevation data to display.");
        }
        this.chart.update();
    }

    toggleView(app) {
        const canvasContainer = document.getElementById('canvasContainer');
        const mapContainer = document.getElementById('mapContainer');
        const elevationContainer = document.getElementById('elevationProfileContainer');
        const toggleButton = document.getElementById('toggleElevationView');
        const mapToggleButton = document.getElementById('toggleMapView');
        if (!this.isProfileView) {
            canvasContainer.style.display = 'none';
            mapContainer.style.display = 'none';
            elevationContainer.style.display = 'flex';
            toggleButton.innerHTML = '<i class="fas fa-drafting-compass"></i> Canvas View';
            toggleButton.classList.add('active');
            mapToggleButton.classList.remove('active');
            if (!this.chart) {
                this.initializeChart();
            }
            if (app && typeof app.getGpxDataForProfile === 'function') {
                const { gpxData, drawingElements } = app.getGpxDataForProfile();
                this.updateProfileData(gpxData, drawingElements);
            }
            setTimeout(() => {
                if (this.chart) this.chart.resize();
            }, 100);
            this.isProfileView = true;
            app.currentView = 'elevation';
        } else {
            elevationContainer.style.display = 'none';
            canvasContainer.style.display = 'flex';
            toggleButton.innerHTML = '<i class="fas fa-chart-line"></i> Elevation Profile';
            toggleButton.classList.remove('active');
            this.isProfileView = false;
            app.currentView = 'canvas';
        }
    }
} 