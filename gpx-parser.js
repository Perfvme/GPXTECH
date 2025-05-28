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
     * Convert GPS coordinates to canvas coordinates
     * @param {Object} bounds - GPS bounds
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} padding - Padding around the drawing
     */
    projectToCanvas(bounds, canvasWidth, canvasHeight, padding = 50) {
        const drawWidth = canvasWidth - (padding * 2);
        const drawHeight = canvasHeight - (padding * 2);
        
        const latRange = bounds.maxLat - bounds.minLat;
        const lonRange = bounds.maxLon - bounds.minLon;
        
        // Calculate scale to fit both dimensions
        const latScale = drawHeight / latRange;
        const lonScale = drawWidth / lonRange;
        const scale = Math.min(latScale, lonScale);
        
        // Calculate center offset
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Project waypoints
        this.waypoints.forEach(wpt => {
            wpt.x = centerX + (wpt.lon - centerLon) * scale;
            wpt.y = centerY - (wpt.lat - centerLat) * scale; // Flip Y axis
        });
        
        // Project track points
        this.tracks.forEach(track => {
            track.points.forEach(pt => {
                pt.x = centerX + (pt.lon - centerLon) * scale;
                pt.y = centerY - (pt.lat - centerLat) * scale; // Flip Y axis
            });
        });
        
        // Project route points
        this.routes.forEach(route => {
            route.points.forEach(pt => {
                pt.x = centerX + (pt.lon - centerLon) * scale;
                pt.y = centerY - (pt.lat - centerLat) * scale; // Flip Y axis
            });
        });
    }

    /**
     * Convert GPX data to electrical drawing elements
     * @returns {Object} Drawing elements
     */
    toDrawingElements() {
        const elements = {
            poles: [],
            lines: []
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
                originalLon: wpt.lon
            });
        });
        
        // Convert tracks to lines
        this.tracks.forEach(track => {
            if (track.points.length > 1) {
                for (let i = 0; i < track.points.length - 1; i++) {
                    const startPt = track.points[i];
                    const endPt = track.points[i + 1];
                    
                    elements.lines.push({
                        id: `${track.id}_line_${i}`,
                        startX: startPt.x,
                        startY: startPt.y,
                        endX: endPt.x,
                        endY: endPt.y,
                        type: track.type,
                        name: `${track.name} - Segment ${i + 1}`,
                        trackId: track.id
                    });
                }
            }
        });
        
        // Convert routes to lines
        this.routes.forEach(route => {
            if (route.points.length > 1) {
                for (let i = 0; i < route.points.length - 1; i++) {
                    const startPt = route.points[i];
                    const endPt = route.points[i + 1];
                    
                    elements.lines.push({
                        id: `${route.id}_line_${i}`,
                        startX: startPt.x,
                        startY: startPt.y,
                        endX: endPt.x,
                        endY: endPt.y,
                        type: route.type,
                        name: `${route.name} - Segment ${i + 1}`,
                        routeId: route.id
                    });
                }
            }
        });
        
        return elements;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPXParser;
}