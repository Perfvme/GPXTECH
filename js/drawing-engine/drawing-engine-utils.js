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
DrawingEngine.prototype.isPointOnLine = function(x, y, line, tolerance = 5) {
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
 * Calculate 2D distance between two points (UTM or canvas)
 */
DrawingEngine.prototype.calculateDistance2D = function(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Calculate 3D distance between two points (UTM coordinates and elevations)
 */
DrawingEngine.prototype.calculateDistance3D = function(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const elev1 = z1 || 0;
    const elev2 = z2 || 0;
    const dz = elev2 - elev1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
 * Calculate angle between three points (p1-p2-p3)
 */
DrawingEngine.prototype.calculateAngle3Points = function(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0; // Avoid division by zero
    }

    let angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));
    let angleDeg = angleRad * 180 / Math.PI;

    return angleDeg;
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
    if (!this.selectedElement) {
        console.warn("No element selected to update property.");
        return;
    }

    const oldValue = this.selectedElement[property];

    // Type coercion for specific properties
    if (property === 'hasGrounding' || property === 'hasGuywire') {
        value = Boolean(value);
    }
    // Add more type coercions if necessary for other properties (e.g., numbers for coordinates)
    // Example: if (property === 'elevation') value = Number(value);

    if (oldValue === value) {
        return; // No change, no need to create a command
    }

    const command = new UpdatePropertyCommand(this, this.selectedElement, property, value, oldValue);
    this.executeCommand(command); // This will call command.execute(), render, and onElementsChanged

    // Potentially, if a coordinate or dimension-affecting property changes,
    // you might need to specifically update related dimensions here.
    // For now, we'll assume rendering handles visual updates.
    
    // If the selected element is part of a multi-selection,
    // this change only applies to the primary `selectedElement`.
    // Batch property updates for multi-selected items would require a different approach.
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
    this.selectedElement = null; // Clear single selection

    let filteredElements = [];

    switch (filterType) {
        case 'pole':
            filteredElements = this.elements.poles;
            break;
        case 'line':
            filteredElements = this.elements.lines;
            break;
        case 'label':
            // Select all elements with labels (poles and lines with names)
            filteredElements = [...this.elements.poles, ...this.elements.lines].filter(el => el.name && el.name.trim() !== '');
            break;
        case 'pole-labels':
            // Select only poles with names (for pole label styling)
            filteredElements = this.elements.poles.filter(pole => pole.name && pole.name.trim() !== '');
            break;
        case 'dimension':
            filteredElements = this.elements.dimensions;
            break;
        case 'all':
            filteredElements = [...this.elements.poles, ...this.elements.lines, ...this.elements.dimensions];
            break;
        case 'dimension-aligned':
            filteredElements = this.elements.dimensions.filter(dim => dim.type === 'aligned');
            break;
        case 'dimension-angular':
            filteredElements = this.elements.dimensions.filter(dim => dim.type === 'angle');
            break;
        case 'selected':
            filteredElements = Array.from(this.selectedElements);
            break;
    }

    filteredElements.forEach(el => this.selectedElements.add(el));

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

/**
 * Batch change name for selected elements
 */
DrawingEngine.prototype.batchChangeName = function(newName, useNumberedNames = false) {
    if (this.selectedElements.size === 0) {
        alert('No elements selected. Please select elements first.');
        return;
    }

    if (!newName || newName.trim() === '') {
        alert('Please enter a name.');
        return;
    }

    const selectedElements = Array.from(this.selectedElements);
    
    // Use command system for undo/redo support
    const command = new BatchChangeNameCommand(this, selectedElements, newName.trim(), useNumberedNames);
    this.executeCommand(command);
    
    this.updatePropertiesPanel(Array.from(this.selectedElements));
    this.render();
    
    alert(`Changed name for ${selectedElements.length} elements.`);
};

/**
 * Apply style to selected dimensions
 */
DrawingEngine.prototype.applyStyleToSelectedDimensions = function(styleUpdates) {
    this.selectedElements.forEach(element => {
        if (element.type === 'aligned' || element.type === 'angle') {
            // Apply style updates directly to the dimension's style object
            // If the dimension's style property references the global style object,
            // this will modify the global style. If it's a copy, it modifies the local copy.
            // For batch updates, it's often desirable to update the individual element's style
            // to the new settings, effectively creating a local override if it was previously referencing global.
            // Given the current structure, Object.assign is fine.
            Object.assign(element.style, styleUpdates);
        }
    });
    this.render();
};

/**
 * Convert Lat/Lon to UTM (approximate, for Indonesia, zone 48-54)
 * For high-accuracy, use a geospatial library.
 * Returns { x, y, zone }
 */
DrawingEngine.prototype.latLonToUTM = function(lat, lon) {
    // WGS84 constants
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e = Math.sqrt(f * (2 - f));
    // UTM zone
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const phi = lat * Math.PI / 180;
    const lambda = lon * Math.PI / 180;
    const N = a / Math.sqrt(1 - Math.pow(e * Math.sin(phi), 2));
    const T = Math.pow(Math.tan(phi), 2);
    const C = Math.pow(e, 2) / (1 - Math.pow(e, 2)) * Math.pow(Math.cos(phi), 2);
    const A = Math.cos(phi) * (lambda - lambda0);
    const M = a * ((1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256) * phi
        - (3 * Math.pow(e, 2) / 8 + 3 * Math.pow(e, 4) / 32 + 45 * Math.pow(e, 6) / 1024) * Math.sin(2 * phi)
        + (15 * Math.pow(e, 4) / 256 + 45 * Math.pow(e, 6) / 1024) * Math.sin(4 * phi)
        - (35 * Math.pow(e, 6) / 3072) * Math.sin(6 * phi));
    const x = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * Math.pow(e, 2) / (1 - Math.pow(e, 2))) * Math.pow(A, 5) / 120) + 500000;
    let y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T + 600 * C - 330 * Math.pow(e, 2) / (1 - Math.pow(e, 2))) * Math.pow(A, 6) / 720));
    if (lat < 0) y += 10000000; // southern hemisphere
    return { x, y, zone };
};

/**
 * Update pole location from properties panel (any coordinate system)
 */
DrawingEngine.prototype.updatePoleLocationFromPanel = function(field, value) {
    if (!this.selectedElement || !(this.selectedElement.type && (this.selectedElement.type.includes('tiang') || this.selectedElement.type.includes('gardu')))) {
        return;
    }
    const pole = this.selectedElement;
    value = parseFloat(value);
    if (isNaN(value)) return;
    let newX = pole.x, newY = pole.y, newUtmX = pole.utmX, newUtmY = pole.utmY, newUtmZone = pole.utmZone, newLat = pole.originalLat, newLon = pole.originalLon, newElevation = pole.elevation;
    const isReal = this.coordinateSystem.isRealCoordinates;
    // Update based on which field was changed
    if (field === 'x' || field === 'y') {
        if (field === 'x') newX = value;
        if (field === 'y') newY = value;
        if (isReal) {
            const utm = this.canvasToUTM(newX, newY);
            newUtmX = utm.x;
            newUtmY = utm.y;
            newUtmZone = this.coordinateSystem.utmZone;
            const latlon = this.utmToLatLon(newUtmX, newUtmY, newUtmZone);
            newLat = latlon.lat;
            newLon = latlon.lon;
        }
    } else if (field === 'utmX' || field === 'utmY' || field === 'utmZone') {
        if (field === 'utmX') newUtmX = value;
        if (field === 'utmY') newUtmY = value;
        if (field === 'utmZone') newUtmZone = value;
        if (isReal) {
            const canvas = this.utmToCanvas(newUtmX, newUtmY);
            newX = canvas.x;
            newY = canvas.y;
            const latlon = this.utmToLatLon(newUtmX, newUtmY, newUtmZone);
            newLat = latlon.lat;
            newLon = latlon.lon;
        }
    } else if (field === 'originalLat' || field === 'originalLon') {
        if (field === 'originalLat') newLat = value;
        if (field === 'originalLon') newLon = value;
        if (isReal) {
            const utm = this.latLonToUTM(newLat, newLon);
            newUtmX = utm.x;
            newUtmY = utm.y;
            newUtmZone = utm.zone;
            const canvas = this.utmToCanvas(newUtmX, newUtmY);
            newX = canvas.x;
            newY = canvas.y;
        }
    } else if (field === 'elevation') {
        newElevation = value;
    }
    // Only update if changed
    if (pole.x !== newX) this.updateElementProperty('x', newX);
    if (pole.y !== newY) this.updateElementProperty('y', newY);
    if (pole.utmX !== newUtmX) this.updateElementProperty('utmX', newUtmX);
    if (pole.utmY !== newUtmY) this.updateElementProperty('utmY', newUtmY);
    if (pole.utmZone !== newUtmZone) this.updateElementProperty('utmZone', newUtmZone);
    if (pole.originalLat !== newLat) this.updateElementProperty('originalLat', newLat);
    if (pole.originalLon !== newLon) this.updateElementProperty('originalLon', newLon);
    if (pole.elevation !== newElevation) this.updateElementProperty('elevation', newElevation);
    // Refresh panel
    this.updatePropertiesPanel(this.selectedElement);
};

// Helper to get absolute sag depth in meters
DrawingEngine.prototype.getAbsoluteSagDepth = function(line) {
    if (!line.sag || !line.sag.enabled || !line.chordLengthMeters) {
        return 0;
    }
    if (line.sag.type === 'absolute') {
        return line.sag.value;
    } else if (line.sag.type === 'percentage') {
        return line.chordLengthMeters * line.sag.value;
    }
    return 0;
};

// Calculate arc length of sagged cable (parabolic approximation)
DrawingEngine.prototype.calculateSaggedLineLength = function(line) {
    if (!line.sag || !line.sag.enabled || !line.chordLengthMeters) {
        return line.chordLengthMeters || 0;
    }
    const L = line.chordLengthMeters;
    const h = this.getAbsoluteSagDepth(line);
    if (h === 0 || L === 0) {
        return L;
    }
    const sagRatio = h / L;
    const arcLength = L * (1 + (8/3) * Math.pow(sagRatio, 2));
    return Math.round(arcLength * 100) / 100;
};

// Generate intermediate points for a sagged cable between two 3D points
DrawingEngine.prototype.generateSaggedPoints = function(startPt3D, endPt3D, sagDepth, numPoints = 20) {
    const points = [];
    const L_chord_3d = Math.sqrt(
        Math.pow(endPt3D.x - startPt3D.x, 2) +
        Math.pow(endPt3D.y - startPt3D.y, 2) +
        Math.pow(endPt3D.z - startPt3D.z, 2)
    );
    if (L_chord_3d === 0 || sagDepth === 0) {
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            points.push({
                x: startPt3D.x + t * (endPt3D.x - startPt3D.x),
                y: startPt3D.y + t * (endPt3D.y - startPt3D.y),
                z: startPt3D.z + t * (endPt3D.z - startPt3D.z)
            });
        }
        return points;
    }
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x_chord = startPt3D.x + t * (endPt3D.x - startPt3D.x);
        const y_chord = startPt3D.y + t * (endPt3D.y - startPt3D.y);
        const z_chord = startPt3D.z + t * (endPt3D.z - startPt3D.z);
        const x_local_for_sag = t * L_chord_3d;
        const y_parabolic_drop = (4 * sagDepth * x_local_for_sag * (L_chord_3d - x_local_for_sag)) / (L_chord_3d * L_chord_3d);
        const z_sagged = z_chord - y_parabolic_drop;
        points.push({ x: x_chord, y: y_chord, z: z_sagged });
    }
    return points;
};

// Update sag property on a line element, using UpdatePropertyCommand for undo/redo
DrawingEngine.prototype.updateElementSagProperty = function(key, value) {
    if (!this.selectedElement || !(this.selectedElement.type && (this.selectedElement.type.includes('sutm') || this.selectedElement.type.includes('sutr')))) {
        return;
    }
    const line = this.selectedElement;
    const oldSag = JSON.parse(JSON.stringify(line.sag || { value: 0.01, type: 'percentage', enabled: false }));
    const newSag = { ...oldSag, [key]: value };
    // If enabling/disabling, recalculate lengths
    if (key === 'enabled' || key === 'value' || key === 'type') {
        // Recalculate actualLengthMeters
        line.sag = newSag;
        if (line.chordLengthMeters) {
            line.actualLengthMeters = this.calculateSaggedLineLength({ ...line, sag: newSag });
        }
    }
    // Use UpdatePropertyCommand for undo/redo
    const command = new UpdatePropertyCommand(this, line, 'sag', newSag, oldSag);
    this.executeCommand(command);
    this.updatePropertiesPanel(line);
    this.render();
};