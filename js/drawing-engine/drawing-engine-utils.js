/**
 * Drawing Engine Utility Methods
 * Contains utility functions for coordinate conversion, element manipulation, and calculations
 */

/**
 * Check if point is inside a pole
 */
DrawingEngine.prototype.isPointInPole = function(x, y, pole) {
    const distance = Math.sqrt((x - pole.x) ** 2 + (y - pole.y) ** 2);
    return distance <= 15; // 15 pixel radius
};

/**
 * Check if point is on line
 */
DrawingEngine.prototype.isPointOnLine = function(x, y, line) {
    const tolerance = 5;
    const A = { x: line.startX, y: line.startY };
    const B = { x: line.endX, y: line.endY };
    const P = { x, y };
    
    // Calculate distance from point to line
    const AB = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2);
    const AP = Math.sqrt((P.x - A.x) ** 2 + (P.y - A.y) ** 2);
    const BP = Math.sqrt((P.x - B.x) ** 2 + (P.y - B.y) ** 2);
    
    // Check if point is on line segment
    return Math.abs(AP + BP - AB) < tolerance;
};

/**
 * Calculate distance between two points in meters
 */
DrawingEngine.prototype.calculateDistance = function(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Calculate coordinate system center from existing elements
 */
DrawingEngine.prototype.calculateCoordinateSystemCenter = function() {
    const allUtmCoords = [];
    
    // Collect UTM coordinates from poles
    this.elements.poles.forEach(pole => {
        if (pole.utmX !== undefined && pole.utmY !== undefined) {
            allUtmCoords.push({ x: pole.utmX, y: pole.utmY });
            if (pole.utmZone && !this.coordinateSystem.utmZone) {
                this.coordinateSystem.utmZone = pole.utmZone;
            }
        }
    });
    
    // Collect UTM coordinates from lines
    this.elements.lines.forEach(line => {
        if (line.startUtm) {
            allUtmCoords.push({ x: line.startUtm.x, y: line.startUtm.y });
            if (line.startUtm.zone && !this.coordinateSystem.utmZone) {
                this.coordinateSystem.utmZone = line.startUtm.zone;
            }
        }
        if (line.endUtm) {
            allUtmCoords.push({ x: line.endUtm.x, y: line.endUtm.y });
        }
    });
    
    if (allUtmCoords.length > 0) {
        // Calculate center of UTM coordinates
        const sumX = allUtmCoords.reduce((sum, coord) => sum + coord.x, 0);
        const sumY = allUtmCoords.reduce((sum, coord) => sum + coord.y, 0);
        
        this.coordinateSystem.centerUtmX = sumX / allUtmCoords.length;
        this.coordinateSystem.centerUtmY = sumY / allUtmCoords.length;
        this.coordinateSystem.centerCanvasX = this.canvas.width / 2;
        this.coordinateSystem.centerCanvasY = this.canvas.height / 2;
    }
};

/**
 * Convert canvas coordinates to UTM coordinates
 */
DrawingEngine.prototype.canvasToUTM = function(canvasX, canvasY) {
    if (!this.coordinateSystem.isRealCoordinates) {
        return { x: canvasX, y: canvasY };
    }
    
    const utmX = this.coordinateSystem.centerUtmX + (canvasX - this.coordinateSystem.centerCanvasX) / this.coordinateSystem.scale;
    const utmY = this.coordinateSystem.centerUtmY - (canvasY - this.coordinateSystem.centerCanvasY) / this.coordinateSystem.scale;
    
    return { x: utmX, y: utmY };
};

/**
 * Convert UTM coordinates to canvas coordinates
 */
DrawingEngine.prototype.utmToCanvas = function(utmX, utmY) {
    if (!this.coordinateSystem.isRealCoordinates) {
        return { x: utmX, y: utmY };
    }
    
    const canvasX = this.coordinateSystem.centerCanvasX + (utmX - this.coordinateSystem.centerUtmX) * this.coordinateSystem.scale;
    const canvasY = this.coordinateSystem.centerCanvasY - (utmY - this.coordinateSystem.centerUtmY) * this.coordinateSystem.scale;
    
    return { x: canvasX, y: canvasY };
};

/**
 * Convert UTM coordinates to Lat/Lon
 */
DrawingEngine.prototype.utmToLatLon = function(utmX, utmY, zone) {
    const a = 6378137; // WGS84 semi-major axis
    const e = 0.0818191908426; // WGS84 eccentricity
    const k0 = 0.9996; // UTM scale factor
    
    const x = utmX - 500000; // Remove false easting
    
    // Check if this is southern hemisphere (false northing was added)
    const isSouthernHemisphere = utmY >= 10000000;
    const y = isSouthernHemisphere ? utmY - 10000000 : utmY;
    
    const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian in degrees
    const lonOriginRad = lonOrigin * Math.PI / 180; // Convert to radians
    
    const M = y / k0;
    const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256));
    
    const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
    const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
                 + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
                 + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
    
    const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) * Math.sin(phi1));
    const T1 = Math.tan(phi1) * Math.tan(phi1);
    const C1 = (e * e / (1 - e * e)) * Math.cos(phi1) * Math.cos(phi1);
    const R1 = a * (1 - e * e) / Math.pow(1 - e * e * Math.sin(phi1) * Math.sin(phi1), 1.5);
    const D = x / (N1 * k0);
    
    let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e * e / (1 - e * e))) * D * D * D * D / 24
               + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e * e / (1 - e * e)) - 3 * C1 * C1) * D * D * D * D * D * D / 720);
    
    // Calculate longitude in radians first, then convert to degrees
    const lonRad = lonOriginRad + (D - (1 + 2 * T1 + C1) * D * D * D / 6
                  + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e * e / (1 - e * e)) + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1);
    
    // Convert to degrees
    lat = lat * 180 / Math.PI;
    let lon = lonRad * 180 / Math.PI;
    
    // If this was originally from southern hemisphere, make latitude negative
    if (isSouthernHemisphere) {
        lat = -Math.abs(lat);
    }
    
    // Normalize longitude to [-180, 180] range
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    
    return {
        lat: lat,
        lon: lon
    };
};

/**
 * Enable real coordinate system for manual drawing
 */
DrawingEngine.prototype.enableRealCoordinates = function(referencePoint = null) {
    this.coordinateSystem.isRealCoordinates = true;
    
    if (referencePoint) {
        // Use provided reference point (e.g., from GPX data)
        this.coordinateSystem.centerUtmX = referencePoint.utmX || 0;
        this.coordinateSystem.centerUtmY = referencePoint.utmY || 0;
        this.coordinateSystem.utmZone = referencePoint.utmZone || 33;
        this.coordinateSystem.scale = referencePoint.scale || 1;
    } else {
        // Check if we already have coordinate system data from loaded GPX
        if (this.coordinateSystem.utmZone && this.coordinateSystem.centerUtmX !== 0) {
            // Use existing coordinate system from GPX data
            console.log('Using existing coordinate system from GPX data');
            // Keep existing centerUtmX, centerUtmY, utmZone, and scale
        } else {
            // Calculate from existing elements if available
            this.calculateCoordinateSystemCenter();
            
            // If still no coordinate system, use defaults
            if (!this.coordinateSystem.utmZone) {
                this.coordinateSystem.centerUtmX = 500000; // Default UTM easting
                this.coordinateSystem.centerUtmY = 0; // Default UTM northing
                this.coordinateSystem.utmZone = 33; // Default UTM zone
                this.coordinateSystem.scale = 1; // 1 meter per pixel
            }
        }
    }
    
    this.coordinateSystem.centerCanvasX = this.canvas.width / 2;
    this.coordinateSystem.centerCanvasY = this.canvas.height / 2;
    
    // Update metadata
    this.metadata.coordinateSystem = 'UTM';
    this.metadata.metersPerPixel = 1 / this.coordinateSystem.scale;
};

/**
 * Update element property
 */
DrawingEngine.prototype.updateElementProperty = function(property, value) {
    if (this.selectedElement) {
        const oldValue = this.selectedElement[property];
        
        // Use command system for undo/redo support
        const command = new UpdatePropertyCommand(this, this.selectedElement, property, value, oldValue);
        this.executeCommand(command);
    }
};

/**
 * Clear selection
 */
DrawingEngine.prototype.clearSelection = function() {
    this.selectedElements.clear();
    this.selectedElement = null;
    this.updatePropertiesPanel(null);
    this.render();
};

/**
 * Select elements by filter
 */
DrawingEngine.prototype.selectByFilter = function(filterType) {
    this.selectedElements.clear();
    this.selectedElement = null;
    
    switch (filterType) {
        case 'all':
            this.selectAll();
            return;
        case 'poles':
            for (let pole of this.elements.poles) {
                this.selectedElements.add(pole);
            }
            break;
        case 'lines':
            for (let line of this.elements.lines) {
                this.selectedElements.add(line);
            }
            break;
        case 'tiang-baja':
            for (let pole of this.elements.poles) {
                if (pole.type && pole.type.includes('tiang-baja')) {
                    this.selectedElements.add(pole);
                }
            }
            break;
        case 'tiang-beton':
            for (let pole of this.elements.poles) {
                if (pole.type && pole.type.includes('tiang-beton')) {
                    this.selectedElements.add(pole);
                }
            }
            break;
        case 'gardu-portal':
            for (let pole of this.elements.poles) {
                if (pole.type && pole.type.includes('gardu-portal')) {
                    this.selectedElements.add(pole);
                }
            }
            break;
        case 'sutm':
            for (let line of this.elements.lines) {
                if (line.type && line.type.includes('sutm')) {
                    this.selectedElements.add(line);
                }
            }
            break;
        case 'sutr':
            for (let line of this.elements.lines) {
                if (line.type && line.type.includes('sutr')) {
                    this.selectedElements.add(line);
                }
            }
            break;
    }
    
    this.updatePropertiesPanel(this.selectedElements.size > 0 ? Array.from(this.selectedElements) : null);
    this.render();
};

/**
 * Batch change type for selected elements
 */
DrawingEngine.prototype.batchChangeType = function(newType) {
    if (this.selectedElements.size === 0) {
        alert('No elements selected. Please select elements first.');
        return;
    }

    const selectedElements = Array.from(this.selectedElements);
    const compatibleElements = [];
    
    for (let element of selectedElements) {
        // Check if the new type is compatible with the element
        if (element.hasOwnProperty('x') && element.hasOwnProperty('y') && !element.hasOwnProperty('startX')) {
            // This is a pole
            if (['tiang-baja-existing', 'tiang-baja-rencana', 'tiang-beton-existing', 'tiang-beton-rencana', 'gardu-portal'].includes(newType)) {
                compatibleElements.push(element);
            }
        } else if (element.hasOwnProperty('startX') && element.hasOwnProperty('startY')) {
            // This is a line
            if (['sutm', 'sutr'].includes(newType)) {
                compatibleElements.push(element);
            }
        }
    }

    if (compatibleElements.length > 0) {
        // Use command system for undo/redo support
        const command = new BatchChangeTypeCommand(this, compatibleElements, newType);
        this.executeCommand(command);
        
        this.updatePropertiesPanel(Array.from(this.selectedElements));
        this.render();
        
        alert(`Changed type for ${compatibleElements.length} compatible elements.`);
    } else {
        alert('No compatible elements found for the selected type.');
    }
};