/**
 * GPX Parser for Electrical CAD Drawing
 * Converts GPX waypoints into electrical network elements
 */

class GPXParser {
    constructor() {
        this.waypoints = [];
        this.tracks = [];
        this.routes = [];
    }

    /**
     * Parse GPX file content
     * @param {string} gpxContent - XML content of GPX file
     * @returns {Object} Parsed GPX data
     */
    parseGPX(gpxContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
            
            // Check for parsing errors
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid GPX file format');
            }

            // Parse waypoints
            this.waypoints = this.parseWaypoints(xmlDoc);
            
            // Parse tracks
            this.tracks = this.parseTracks(xmlDoc);
            
            // Parse routes
            this.routes = this.parseRoutes(xmlDoc);

            return {
                waypoints: this.waypoints,
                tracks: this.tracks,
                routes: this.routes,
                bounds: this.calculateBounds()
            };
        } catch (error) {
            console.error('Error parsing GPX:', error);
            throw error;
        }
    }

    /**
     * Parse waypoints from GPX
     * @param {Document} xmlDoc - Parsed XML document
     * @returns {Array} Array of waypoint objects
     */
    parseWaypoints(xmlDoc) {
        const waypoints = [];
        const wptElements = xmlDoc.querySelectorAll('wpt');
        
        wptElements.forEach((wpt, index) => {
            const lat = parseFloat(wpt.getAttribute('lat'));
            const lon = parseFloat(wpt.getAttribute('lon'));
            const name = this.getElementText(wpt, 'name') || `Point ${index + 1}`;
            const desc = this.getElementText(wpt, 'desc') || '';
            const ele = this.getElementText(wpt, 'ele');
            
            waypoints.push({
                id: `wpt_${index}`,
                lat: lat,
                lon: lon,
                name: name,
                description: desc,
                elevation: ele ? parseFloat(ele) : null,
                type: this.determineDefaultPoleType(name, desc),
                hasGrounding: false,
                hasGuywire: false,
                x: 0, // Will be calculated during projection
                y: 0  // Will be calculated during projection
            });
        });
        
        return waypoints;
    }

    /**
     * Parse tracks from GPX
     * @param {Document} xmlDoc - Parsed XML document
     * @returns {Array} Array of track objects
     */
    parseTracks(xmlDoc) {
        const tracks = [];
        const trkElements = xmlDoc.querySelectorAll('trk');
        
        trkElements.forEach((trk, trkIndex) => {
            const name = this.getElementText(trk, 'name') || `Track ${trkIndex + 1}`;
            const desc = this.getElementText(trk, 'desc') || '';
            
            const trksegs = trk.querySelectorAll('trkseg');
            trksegs.forEach((trkseg, segIndex) => {
                const points = [];
                const trkpts = trkseg.querySelectorAll('trkpt');
                
                trkpts.forEach(trkpt => {
                    const lat = parseFloat(trkpt.getAttribute('lat'));
                    const lon = parseFloat(trkpt.getAttribute('lon'));
                    const ele = this.getElementText(trkpt, 'ele');
                    
                    points.push({
                        lat: lat,
                        lon: lon,
                        elevation: ele ? parseFloat(ele) : null,
                        x: 0, // Will be calculated during projection
                        y: 0  // Will be calculated during projection
                    });
                });
                
                if (points.length > 0) {
                    tracks.push({
                        id: `trk_${trkIndex}_${segIndex}`,
                        name: name,
                        description: desc,
                        points: points,
                        type: this.determineDefaultLineType(name, desc)
                    });
                }
            });
        });
        
        return tracks;
    }

    /**
     * Parse routes from GPX
     * @param {Document} xmlDoc - Parsed XML document
     * @returns {Array} Array of route objects
     */
    parseRoutes(xmlDoc) {
        const routes = [];
        const rteElements = xmlDoc.querySelectorAll('rte');
        
        rteElements.forEach((rte, rteIndex) => {
            const name = this.getElementText(rte, 'name') || `Route ${rteIndex + 1}`;
            const desc = this.getElementText(rte, 'desc') || '';
            
            const points = [];
            const rtepts = rte.querySelectorAll('rtept');
            
            rtepts.forEach(rtept => {
                const lat = parseFloat(rtept.getAttribute('lat'));
                const lon = parseFloat(rtept.getAttribute('lon'));
                const ele = this.getElementText(rtept, 'ele');
                const ptName = this.getElementText(rtept, 'name') || '';
                
                points.push({
                    lat: lat,
                    lon: lon,
                    name: ptName,
                    elevation: ele ? parseFloat(ele) : null,
                    x: 0, // Will be calculated during projection
                    y: 0  // Will be calculated during projection
                });
            });
            
            if (points.length > 0) {
                routes.push({
                    id: `rte_${rteIndex}`,
                    name: name,
                    description: desc,
                    points: points,
                    type: this.determineDefaultLineType(name, desc)
                });
            }
        });
        
        return routes;
    }

    /**
     * Get text content from XML element
     * @param {Element} parent - Parent element
     * @param {string} tagName - Tag name to search for
     * @returns {string|null} Text content or null
     */
    getElementText(parent, tagName) {
        const element = parent.querySelector(tagName);
        return element ? element.textContent.trim() : null;
    }

    /**
     * Determine default pole type based on name and description
     * @param {string} name - Waypoint name
     * @param {string} desc - Waypoint description
     * @returns {string} Default pole type
     */
    determineDefaultPoleType(name, desc) {
        const text = (name + ' ' + desc).toLowerCase();
        
        if (text.includes('gardu') || text.includes('portal')) {
            return 'gardu-portal';
        } else if (text.includes('beton')) {
            if (text.includes('rencana') || text.includes('plan')) {
                return 'tiang-beton-rencana';
            } else {
                return 'tiang-beton-existing';
            }
        } else if (text.includes('baja') || text.includes('steel')) {
            if (text.includes('rencana') || text.includes('plan')) {
                return 'tiang-baja-rencana';
            } else {
                return 'tiang-baja-existing';
            }
        }
        
        // Default to steel existing
        return 'tiang-baja-existing';
    }

    /**
     * Determine default line type based on name and description
     * @param {string} name - Track/route name
     * @param {string} desc - Track/route description
     * @returns {string} Default line type
     */
    determineDefaultLineType(name, desc) {
        const text = (name + ' ' + desc).toLowerCase();
        
        if (text.includes('sutm')) {
            if (text.includes('rencana') || text.includes('plan')) {
                return 'sutm-rencana';
            } else {
                return 'sutm-existing';
            }
        } else if (text.includes('sutr')) {
            if (text.includes('rencana') || text.includes('plan')) {
                return 'sutr-rencana';
            } else {
                return 'sutr-existing';
            }
        } else if (text.includes('medium') || text.includes('20kv') || text.includes('tengah')) {
            return 'sutm-existing';
        } else if (text.includes('low') || text.includes('rendah') || text.includes('380v')) {
            return 'sutr-existing';
        }
        
        // Default to SUTM existing
        return 'sutm-existing';
    }

    /**
     * Calculate bounds of all GPS coordinates
     * @returns {Object} Bounds object with min/max lat/lon
     */
    calculateBounds() {
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        
        // Check waypoints
        this.waypoints.forEach(wpt => {
            minLat = Math.min(minLat, wpt.lat);
            maxLat = Math.max(maxLat, wpt.lat);
            minLon = Math.min(minLon, wpt.lon);
            maxLon = Math.max(maxLon, wpt.lon);
        });
        
        // Check tracks
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                minLat = Math.min(minLat, pt.lat);
                maxLat = Math.max(maxLat, pt.lat);
                minLon = Math.min(minLon, pt.lon);
                maxLon = Math.max(maxLon, pt.lon);
            });
        });
        
        // Check routes
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                minLat = Math.min(minLat, pt.lat);
                maxLat = Math.max(maxLat, pt.lat);
                minLon = Math.min(minLon, pt.lon);
                maxLon = Math.max(maxLon, pt.lon);
            });
        });
        
        return {
            minLat: minLat === Infinity ? 0 : minLat,
            maxLat: maxLat === -Infinity ? 0 : maxLat,
            minLon: minLon === Infinity ? 0 : minLon,
            maxLon: maxLon === -Infinity ? 0 : maxLon
        };
    }

    /**
     * Convert GPS coordinates to UTM coordinates (metric)
     * @param {number} lat - Latitude in decimal degrees
     * @param {number} lon - Longitude in decimal degrees
     * @returns {Object} UTM coordinates {x, y, zone}
     */
    latLonToUTM(lat, lon) {
        const a = 6378137; // WGS84 semi-major axis
        const e = 0.0818191908426; // WGS84 eccentricity
        const k0 = 0.9996; // UTM scale factor
        
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        
        // Determine UTM zone
        const zone = Math.floor((lon + 180) / 6) + 1;
        const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian
        const lonOriginRad = lonOrigin * Math.PI / 180;
        
        const N = a / Math.sqrt(1 - e * e * Math.sin(latRad) * Math.sin(latRad));
        const T = Math.tan(latRad) * Math.tan(latRad);
        const C = (e * e / (1 - e * e)) * Math.cos(latRad) * Math.cos(latRad);
        const A = Math.cos(latRad) * (lonRad - lonOriginRad);
        
        const M = a * ((1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256) * latRad
                    - (3 * e * e / 8 + 3 * e * e * e * e / 32 + 45 * e * e * e * e * e * e / 1024) * Math.sin(2 * latRad)
                    + (15 * e * e * e * e / 256 + 45 * e * e * e * e * e * e / 1024) * Math.sin(4 * latRad)
                    - (35 * e * e * e * e * e * e / 3072) * Math.sin(6 * latRad));
        
        const x = k0 * N * (A + (1 - T + C) * A * A * A / 6
                           + (5 - 18 * T + T * T + 72 * C - 58 * (e * e / (1 - e * e))) * A * A * A * A * A / 120) + 500000;
        
        const y = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
                       + (61 - 58 * T + T * T + 600 * C - 330 * (e * e / (1 - e * e))) * A * A * A * A * A * A / 720));
        
        return {
            x: x,
            y: lat >= 0 ? y : y + 10000000, // Add false northing for southern hemisphere
            zone: zone
        };
    }

    /**
     * Convert latitude/longitude to UTM coordinates using a specific UTM zone
     * @param {number} lat - Latitude in decimal degrees
     * @param {number} lon - Longitude in decimal degrees
     * @param {number} targetZone - Target UTM zone to use for conversion
     * @returns {Object} UTM coordinates {x, y, zone}
     */
    latLonToUTMWithZone(lat, lon, targetZone) {
        const a = 6378137; // WGS84 semi-major axis
        const e = 0.0818191908426; // WGS84 eccentricity
        const k0 = 0.9996; // UTM scale factor
        
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        
        // Use the specified target zone instead of calculating from longitude
        const zone = targetZone;
        const lonOrigin = (zone - 1) * 6 - 180 + 3; // Central meridian
        const lonOriginRad = lonOrigin * Math.PI / 180;
        
        const N = a / Math.sqrt(1 - e * e * Math.sin(latRad) * Math.sin(latRad));
        const T = Math.tan(latRad) * Math.tan(latRad);
        const C = (e * e / (1 - e * e)) * Math.cos(latRad) * Math.cos(latRad);
        const A = Math.cos(latRad) * (lonRad - lonOriginRad);
        
        const M = a * ((1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256) * latRad
                    - (3 * e * e / 8 + 3 * e * e * e * e / 32 + 45 * e * e * e * e * e * e / 1024) * Math.sin(2 * latRad)
                    + (15 * e * e * e * e / 256 + 45 * e * e * e * e * e * e / 1024) * Math.sin(4 * latRad)
                    - (35 * e * e * e * e * e * e / 3072) * Math.sin(6 * latRad));
        
        const x = k0 * N * (A + (1 - T + C) * A * A * A / 6
                           + (5 - 18 * T + T * T + 72 * C - 58 * (e * e / (1 - e * e))) * A * A * A * A * A / 120) + 500000;
        
        const y = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
                       + (61 - 58 * T + T * T + 600 * C - 330 * (e * e / (1 - e * e))) * A * A * A * A * A * A / 720));
        
        return {
            x: x,
            y: lat >= 0 ? y : y + 10000000, // Add false northing for southern hemisphere
            zone: zone
        };
    }
    
    /**
     * Calculate distance between two points in meters
     * @param {number} x1 - First point X coordinate (UTM)
     * @param {number} y1 - First point Y coordinate (UTM)
     * @param {number} x2 - Second point X coordinate (UTM)
     * @param {number} y2 - Second point Y coordinate (UTM)
     * @returns {number} Distance in meters
     */
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Calculate the dominant UTM zone from all points in the GPX data
     * @returns {number} The most frequently occurring UTM zone
     */
    calculateDominantUtmZone() {
        const zoneCount = {};
        
        // Count UTM zones from waypoints
        this.waypoints.forEach(wpt => {
            if (wpt.utmZone) {
                zoneCount[wpt.utmZone] = (zoneCount[wpt.utmZone] || 0) + 1;
            }
        });
        
        // Count UTM zones from track points
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                if (pt.utmZone) {
                    zoneCount[pt.utmZone] = (zoneCount[pt.utmZone] || 0) + 1;
                }
            });
        });
        
        // Count UTM zones from route points
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                if (pt.utmZone) {
                    zoneCount[pt.utmZone] = (zoneCount[pt.utmZone] || 0) + 1;
                }
            });
        });
        
        // Find the zone with the highest count
        let dominantZone = 33; // Default zone
        let maxCount = 0;
        
        for (const zone in zoneCount) {
            if (zoneCount[zone] > maxCount) {
                maxCount = zoneCount[zone];
                dominantZone = parseInt(zone);
            }
        }
        
        return dominantZone;
    }

    /**
     * Convert GPS coordinates to canvas coordinates using real metric projection
     * @param {Object} bounds - GPS bounds
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} padding - Padding around the drawing
     */
    projectToCanvas(bounds, canvasWidth, canvasHeight, padding = 50) {
        const drawWidth = canvasWidth - (padding * 2);
        const drawHeight = canvasHeight - (padding * 2);
        
        // Convert all coordinates to UTM first
        const utmCoords = [];
        
        // Convert waypoints to UTM
        this.waypoints.forEach(wpt => {
            const utm = this.latLonToUTM(wpt.lat, wpt.lon);
            wpt.utmX = utm.x;
            wpt.utmY = utm.y;
            wpt.utmZone = utm.zone;
            utmCoords.push({x: utm.x, y: utm.y});
        });
        
        // Convert track points to UTM
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                const utm = this.latLonToUTM(pt.lat, pt.lon);
                pt.utmX = utm.x;
                pt.utmY = utm.y;
                pt.utmZone = utm.zone;
                utmCoords.push({x: utm.x, y: utm.y});
            });
        });
        
        // Convert route points to UTM
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                const utm = this.latLonToUTM(pt.lat, pt.lon);
                pt.utmX = utm.x;
                pt.utmY = utm.y;
                pt.utmZone = utm.zone;
                utmCoords.push({x: utm.x, y: utm.y});
            });
        });
        
        // Calculate dominant UTM zone
        const dominantZone = this.calculateDominantUtmZone();
        
        // Recalculate all coordinates using the dominant UTM zone for consistency
        const consistentUtmCoords = [];
        
        // Recalculate waypoints with dominant zone
        this.waypoints.forEach(wpt => {
            const utm = this.latLonToUTMWithZone(wpt.lat, wpt.lon, dominantZone);
            wpt.utmX = utm.x;
            wpt.utmY = utm.y;
            wpt.utmZone = dominantZone;
            consistentUtmCoords.push({x: utm.x, y: utm.y});
        });
        
        // Recalculate track points with dominant zone
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                const utm = this.latLonToUTMWithZone(pt.lat, pt.lon, dominantZone);
                pt.utmX = utm.x;
                pt.utmY = utm.y;
                pt.utmZone = dominantZone;
                consistentUtmCoords.push({x: utm.x, y: utm.y});
            });
        });
        
        // Recalculate route points with dominant zone
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                const utm = this.latLonToUTMWithZone(pt.lat, pt.lon, dominantZone);
                pt.utmX = utm.x;
                pt.utmY = utm.y;
                pt.utmZone = dominantZone;
                consistentUtmCoords.push({x: utm.x, y: utm.y});
            });
        });
        
        // Use consistent coordinates for bounds calculation
        const utmCoordsForBounds = consistentUtmCoords;
        
        if (utmCoordsForBounds.length === 0) return;
        
        // Find bounds in UTM coordinates using consistent coordinates
        const minX = Math.min(...utmCoordsForBounds.map(c => c.x));
        const maxX = Math.max(...utmCoordsForBounds.map(c => c.x));
        const minY = Math.min(...utmCoordsForBounds.map(c => c.y));
        const maxY = Math.max(...utmCoordsForBounds.map(c => c.y));
        
        const utmWidth = maxX - minX;
        const utmHeight = maxY - minY;
        
        // Calculate scale to maintain real proportions
        const scaleX = drawWidth / utmWidth;
        const scaleY = drawHeight / utmHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Store scale for distance calculations
        this.metersPerPixel = 1 / scale;
        
        // Calculate center offset
        const centerUtmX = (minX + maxX) / 2;
        const centerUtmY = (minY + maxY) / 2;
        const centerCanvasX = canvasWidth / 2;
        const centerCanvasY = canvasHeight / 2;
        
        // Store coordinate system parameters as instance properties
        this.centerUtmX = centerUtmX;
        this.centerUtmY = centerUtmY;
        this.utmZone = dominantZone;
        
        // Project waypoints to canvas
        this.waypoints.forEach(wpt => {
            wpt.x = centerCanvasX + (wpt.utmX - centerUtmX) * scale;
            wpt.y = centerCanvasY - (wpt.utmY - centerUtmY) * scale; // Flip Y axis
        });
        
        // Project track points to canvas
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                pt.x = centerCanvasX + (pt.utmX - centerUtmX) * scale;
                pt.y = centerCanvasY - (pt.utmY - centerUtmY) * scale; // Flip Y axis
            });
        });
        
        // Project route points to canvas
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                pt.x = centerCanvasX + (pt.utmX - centerUtmX) * scale;
                pt.y = centerCanvasY - (pt.utmY - centerUtmY) * scale; // Flip Y axis
            });
        });
    }

    /**
     * Convert GPX data to electrical drawing elements with real metric coordinates
     * @returns {Object} Drawing elements with distance information
     */
    toDrawingElements() {
        const elements = {
            poles: [],
            lines: [],
            metadata: {
                metersPerPixel: this.metersPerPixel || 1,
                coordinateSystem: 'UTM',
                totalDistance: 0,
                centerUtmX: this.centerUtmX,
                centerUtmY: this.centerUtmY,
                utmZone: this.utmZone
            }
        };
        
        // Convert waypoints to poles
        this.waypoints.forEach(wpt => {
            elements.poles.push({
                id: wpt.id,
                x: wpt.x,
                y: wpt.y,
                type: wpt.type,
                name: wpt.name,
                description: wpt.description,
                elevation: wpt.elevation,
                hasGrounding: wpt.hasGrounding,
                hasGuywire: wpt.hasGuywire,
                originalLat: wpt.lat,
                originalLon: wpt.lon,
                utmX: wpt.utmX,
                utmY: wpt.utmY,
                utmZone: wpt.utmZone
            });
        });
        
        let totalDistance = 0;
        
        // Convert tracks to lines with real distance calculations
        this.tracks.forEach(track => {
            if (track.points.length > 1) {
                for (let i = 0; i < track.points.length - 1; i++) {
                    const startPt = track.points[i];
                    const endPt = track.points[i + 1];
                    
                    // Calculate real distance in meters
                    const distanceMeters = this.calculateDistance(
                        startPt.utmX, startPt.utmY,
                        endPt.utmX, endPt.utmY
                    );
                    
                    totalDistance += distanceMeters;
                    
                    elements.lines.push({
                        id: `${track.id}_line_${i}`,
                        startX: startPt.x,
                        startY: startPt.y,
                        endX: endPt.x,
                        endY: endPt.y,
                        type: track.type,
                        name: `${track.name} - Segment ${i + 1}`,
                        trackId: track.id,
                        distanceMeters: Math.round(distanceMeters * 100) / 100, // Round to cm
                        startUtm: { x: startPt.utmX, y: startPt.utmY, zone: startPt.utmZone },
                        endUtm: { x: endPt.utmX, y: endPt.utmY, zone: endPt.utmZone }
                    });
                }
            }
        });
        
        // Convert routes to lines with real distance calculations
        this.routes.forEach(route => {
            if (route.points.length > 1) {
                for (let i = 0; i < route.points.length - 1; i++) {
                    const startPt = route.points[i];
                    const endPt = route.points[i + 1];
                    
                    // Calculate real distance in meters
                    const distanceMeters = this.calculateDistance(
                        startPt.utmX, startPt.utmY,
                        endPt.utmX, endPt.utmY
                    );
                    
                    totalDistance += distanceMeters;
                    
                    elements.lines.push({
                        id: `${route.id}_line_${i}`,
                        startX: startPt.x,
                        startY: startPt.y,
                        endX: endPt.x,
                        endY: endPt.y,
                        type: route.type,
                        name: `${route.name} - Segment ${i + 1}`,
                        routeId: route.id,
                        distanceMeters: Math.round(distanceMeters * 100) / 100, // Round to cm
                        startUtm: { x: startPt.utmX, y: startPt.utmY, zone: startPt.utmZone },
                        endUtm: { x: endPt.utmX, y: endPt.utmY, zone: endPt.utmZone }
                    });
                }
            }
        });
        
        elements.metadata.totalDistance = Math.round(totalDistance * 100) / 100;
        
        return elements;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPXParser;
}