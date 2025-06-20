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
        const poleMarkers = [];
        let cumulativeDistance = 0;
        this.poleIndices = [];

        // Strategy: Prioritize drawing elements over GPX data for consistency
        // If we have drawing elements (lines), use them as the primary source
        // Use GPX data only when no drawing elements exist
        
        if (drawingElements && drawingElements.lines && drawingElements.lines.length > 0) {
            // Primary approach: Use drawing elements (manually drawn lines and poles)
            console.log('Using drawing elements for elevation profile');
            
            // Process each line segment sequentially
            let currentDistance = 0;
            const lineEndPositions = []; // Track where each line ends for pole placement
            
            drawingElements.lines.forEach((line, lineIndex) => {
                const startDistance = currentDistance;
                let startElevation = line.startElevation || 0;
                let endElevation = line.endElevation || 0;
                
                // Calculate line length (prefer chord length for sagged lines)
                let lineLength = 0;
                if (typeof line.chordLengthMeters === 'number' && line.chordLengthMeters > 0) {
                    lineLength = line.chordLengthMeters;
                } else if (typeof line.distanceMeters === 'number' && line.distanceMeters > 0) {
                    lineLength = line.distanceMeters;
                } else {
                    // Calculate from coordinates if no distance stored
                    if (this.drawingEngine && this.drawingEngine.coordinateSystem.isRealCoordinates) {
                        const startUtm = this.drawingEngine.canvasToUTM(line.startX, line.startY);
                        const endUtm = this.drawingEngine.canvasToUTM(line.endX, line.endY);
                        lineLength = Math.sqrt(
                            Math.pow(endUtm.x - startUtm.x, 2) + 
                            Math.pow(endUtm.y - startUtm.y, 2)
                        );
                    } else {
                        // Fallback to canvas coordinates
                        lineLength = Math.sqrt(
                            Math.pow(line.endX - line.startX, 2) + 
                            Math.pow(line.endY - line.startY, 2)
                        );
                    }
                }
                
                const endDistance = startDistance + lineLength;
                
                // Generate profile points for this line
                if (line.sag && line.sag.enabled && this.drawingEngine) {
                    // Generate sagged line profile
                    const sagDepth = this.drawingEngine.getAbsoluteSagDepth ? 
                        this.drawingEngine.getAbsoluteSagDepth(line) : (line.sag.depth || 0);
                    
                    // Create 3D points for sag calculation
                    const startPt = { x: startDistance, y: 0, z: startElevation };
                    const endPt = { x: endDistance, y: 0, z: endElevation };
                    
                    if (this.drawingEngine.generateSaggedPoints) {
                        const saggedPoints = this.drawingEngine.generateSaggedPoints(startPt, endPt, sagDepth, 20);
                        saggedPoints.forEach(pt => {
                            profilePoints.push({ x: pt.x, y: pt.z });
                        });
                    } else {
                        // Fallback: generate simple catenary approximation
                        const steps = 20;
                        for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const x = startDistance + t * lineLength;
                            const elevationAtT = startElevation + t * (endElevation - startElevation);
                            // Simple catenary sag: deepest at middle
                            const sagAtT = sagDepth * 4 * t * (1 - t);
                            const y = elevationAtT - sagAtT;
                            profilePoints.push({ x, y });
                        }
                    }
                } else {
                    // Straight line - just add start and end points
                    if (lineIndex === 0 || profilePoints.length === 0) {
                        profilePoints.push({ x: startDistance, y: startElevation });
                    }
                    profilePoints.push({ x: endDistance, y: endElevation });
                }
                
                // Track line end positions for pole placement
                lineEndPositions.push({
                    distance: endDistance,
                    elevation: endElevation,
                    lineIndex: lineIndex
                });
                
                currentDistance = endDistance;
            });
            
            // Add pole markers at line endpoints and specific pole positions
            if (drawingElements.poles && drawingElements.poles.length > 0) {
                drawingElements.poles.forEach(pole => {
                    let poleDistance = 0;
                    let poleElevation = pole.elevation || 0;
                    
                    // Determine pole position based on available data
                    if (typeof pole.lineIndex === 'number' && pole.lineIndex < lineEndPositions.length) {
                        // Pole is associated with a specific line end
                        const lineEnd = lineEndPositions[pole.lineIndex];
                        poleDistance = lineEnd.distance;
                        if (poleElevation === 0) poleElevation = lineEnd.elevation;
                    } else if (typeof pole.trackPointIndex === 'number' && gpxData && gpxData.tracks) {
                        // Pole is associated with a GPX track point - calculate distance
                        let dist = 0;
                        const track = gpxData.tracks[pole.trackIndex || 0];
                        if (track && track.points) {
                            for (let i = 1; i <= pole.trackPointIndex && i < track.points.length; i++) {
                                const pt = track.points[i];
                                const prevPt = track.points[i-1];
                                if (pt && prevPt && pt.utmX && prevPt.utmX) {
                                    dist += Math.sqrt(
                                        Math.pow(pt.utmX - prevPt.utmX, 2) +
                                        Math.pow(pt.utmY - prevPt.utmY, 2)
                                    );
                                }
                            }
                            poleDistance = dist;
                            const trackPoint = track.points[pole.trackPointIndex];
                            if (trackPoint && typeof trackPoint.elevation === 'number' && poleElevation === 0) {
                                poleElevation = trackPoint.elevation;
                            }
                        }
                    } else {
                        // Try to position pole based on its coordinates relative to lines
                        // This is a fallback for manually placed poles
                        let bestDistance = 0;
                        let minDistToLine = Infinity;
                        
                        drawingElements.lines.forEach((line, lineIndex) => {
                            // Calculate distance from pole to line
                            const lineStart = { x: line.startX, y: line.startY };
                            const lineEnd = { x: line.endX, y: line.endY };
                            const polePos = { x: pole.x, y: pole.y };
                            
                            // Project pole onto line to find closest point
                            const A = { x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y };
                            const B = { x: polePos.x - lineStart.x, y: polePos.y - lineStart.y };
                            const AB = A.x * B.x + A.y * B.y;
                            const AA = A.x * A.x + A.y * A.y;
                            
                            if (AA > 0) {
                                const t = Math.max(0, Math.min(1, AB / AA));
                                const closest = {
                                    x: lineStart.x + t * A.x,
                                    y: lineStart.y + t * A.y
                                };
                                const distToPole = Math.sqrt(
                                    Math.pow(polePos.x - closest.x, 2) + 
                                    Math.pow(polePos.y - closest.y, 2)
                                );
                                
                                if (distToPole < minDistToLine) {
                                    minDistToLine = distToPole;
                                    // Calculate distance along profile
                                    let distanceAlongProfile = 0;
                                    for (let i = 0; i < lineIndex; i++) {
                                        const prevLine = drawingElements.lines[i];
                                        distanceAlongProfile += prevLine.chordLengthMeters || prevLine.distanceMeters || 100;
                                    }
                                    // Add partial distance along current line
                                    const currentLineLength = line.chordLengthMeters || line.distanceMeters || 100;
                                    distanceAlongProfile += t * currentLineLength;
                                    bestDistance = distanceAlongProfile;
                                }
                            }
                        });
                        
                        poleDistance = bestDistance;
                    }
                    
                    poleMarkers.push({ x: poleDistance, y: poleElevation });
                });
            } else {
                // No poles defined - add markers at line endpoints
                lineEndPositions.forEach(pos => {
                    poleMarkers.push({ x: pos.distance, y: pos.elevation });
                });
            }
            
        } else if (gpxData && gpxData.tracks && gpxData.tracks.length > 0) {
            // Secondary approach: Use GPX data when no drawing elements
            console.log('Using GPX data for elevation profile');
            
            gpxData.tracks.forEach(track => {
                if (track.points && track.points.length > 0) {
                    track.points.forEach((point, index) => {
                        if (index === 0) {
                            // First point
                            if (typeof point.elevation === 'number') {
                                profilePoints.push({ x: cumulativeDistance, y: point.elevation });
                                poleMarkers.push({ x: cumulativeDistance, y: point.elevation });
                            }
                        } else {
                            // Calculate distance from previous point
                            const prevPoint = track.points[index - 1];
                            if (point.utmX && prevPoint.utmX) {
                                const segmentDistance = Math.sqrt(
                                    Math.pow(point.utmX - prevPoint.utmX, 2) +
                                    Math.pow(point.utmY - prevPoint.utmY, 2)
                                );
                                cumulativeDistance += segmentDistance;
                                
                                if (typeof point.elevation === 'number') {
                                    profilePoints.push({ x: cumulativeDistance, y: point.elevation });
                                    poleMarkers.push({ x: cumulativeDistance, y: point.elevation });
                                }
                            }
                        }
                    });
                }
            });
        }

        // Update chart with processed data
        if (profilePoints.length > 0) {
            this.chart.data.labels = profilePoints.map(p => p.x.toFixed(1));
            this.chart.data.datasets[0].data = profilePoints.map(p => p.y);
            this.chart.data.datasets[1].data = poleMarkers;
            
            // Calculate appropriate y-axis range
            const elevations = profilePoints.map(p => p.y);
            const minElevation = Math.min(...elevations);
            const maxElevation = Math.max(...elevations);
            const padding = Math.max((maxElevation - minElevation) * 0.1, 5); // Minimum 5m padding
            const center = (maxElevation + minElevation) / 2;
            const halfRange = ((maxElevation - minElevation) / 2 + padding) * this.verticalScale;
            
            this.chart.options.scales.y.min = Math.floor(center - halfRange);
            this.chart.options.scales.y.max = Math.ceil(center + halfRange);
            
            console.log(`Elevation profile updated: ${profilePoints.length} points, ${poleMarkers.length} poles`);
        } else {
            // No data available
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