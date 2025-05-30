/**
 * Drawing Engine - Properties Panel Module
 * Handles updating the properties panel for selected elements
 */

/**
 * Update properties panel with element information
 */
DrawingEngine.prototype.updatePropertiesPanel = function(element) {
    const panel = document.getElementById('propertiesContent');
    
    if (!element) {
        panel.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-mouse-pointer"></i>
                <p>Select an element to edit properties</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    if (element.type && element.type.includes('tiang')) {
        // It's a pole
        const typeDisplayNames = {
            'tiang-baja-existing': 'Steel Pole (Existing)',
            'tiang-baja-rencana': 'Steel Pole (Planned)',
            'tiang-beton-existing': 'Concrete Pole (Existing)',
            'tiang-beton-rencana': 'Concrete Pole (Planned)',
            'gardu-portal': 'Portal Substation'
        };
        
        html = `
            <div class="element-header">
                <div class="element-icon pole-icon"></div>
                <div class="element-info">
                    <h4>Pole Properties</h4>
                    <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                </div>
            </div>
            
            <div class="properties-form">
                <div class="form-row">
                    <label><i class="fas fa-tag"></i> Name</label>
                    <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter pole name">
                </div>
                
                <div class="form-row">
                    <label><i class="fas fa-cog"></i> Type</label>
                    <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                        <option value="tiang-baja-existing" ${element.type === 'tiang-baja-existing' ? 'selected' : ''}>Steel Pole (Existing)</option>
                        <option value="tiang-baja-rencana" ${element.type === 'tiang-baja-rencana' ? 'selected' : ''}>Steel Pole (Planned)</option>
                        <option value="tiang-beton-existing" ${element.type === 'tiang-beton-existing' ? 'selected' : ''}>Concrete Pole (Existing)</option>
                        <option value="tiang-beton-rencana" ${element.type === 'tiang-beton-rencana' ? 'selected' : ''}>Concrete Pole (Planned)</option>
                        <option value="gardu-portal" ${element.type === 'gardu-portal' ? 'selected' : ''}>Portal Substation</option>
                    </select>
                </div>
                
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-plus-circle"></i> Accessories</label>
                    <div class="checkbox-group">
                        <label class="checkbox-item">
                            <input type="checkbox" ${element.hasGrounding ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGrounding', this.checked)">
                            <span class="checkmark"></span>
                            <i class="fas fa-bolt"></i> Grounding
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" ${element.hasGuywire ? 'checked' : ''} onchange="drawingEngine.updateElementProperty('hasGuywire', this.checked)">
                            <span class="checkmark"></span>
                            <i class="fas fa-link"></i> Guy Wire
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-map-marker-alt"></i> Location</label>
                    <div class="location-info">
                        <div class="coord-item">
                            <span class="coord-label">Canvas</span>
                            <span class="coord-value">X: ${Math.round(element.x)}, Y: ${Math.round(element.y)}</span>
                        </div>
                        ${element.utmX ? `
                        <div class="coord-item">
                            <span class="coord-label">UTM</span>
                            <span class="coord-value">${Math.round(element.utmX)}, ${Math.round(element.utmY)} (${element.utmZone})</span>
                        </div>` : ''}
                        ${element.originalLat ? `
                        <div class="coord-item">
                            <span class="coord-label">GPS</span>
                            <span class="coord-value">${element.originalLat.toFixed(6)}, ${element.originalLon.toFixed(6)}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    } else {
        // It's a line
        const typeDisplayNames = {
            'sutm-existing': 'Medium Voltage (Existing)',
            'sutm-rencana': 'Medium Voltage (Planned)',
            'sutr-existing': 'Low Voltage (Existing)',
            'sutr-rencana': 'Low Voltage (Planned)'
        };
        
        const canvasLength = Math.round(Math.sqrt((element.endX - element.startX) ** 2 + (element.endY - element.startY) ** 2));
        
        html = `
            <div class="element-header">
                <div class="element-icon line-icon"></div>
                <div class="element-info">
                    <h4>Line Properties</h4>
                    <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                </div>
            </div>
            
            <div class="properties-form">
                <div class="form-row">
                    <label><i class="fas fa-tag"></i> Name</label>
                    <input type="text" value="${element.name}" onchange="drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter line name">
                </div>
                
                <div class="form-row">
                    <label><i class="fas fa-cog"></i> Type</label>
                    <select onchange="drawingEngine.updateElementProperty('type', this.value)">
                        <option value="sutm-existing" ${element.type === 'sutm-existing' ? 'selected' : ''}>Medium Voltage (Existing)</option>
                        <option value="sutm-rencana" ${element.type === 'sutm-rencana' ? 'selected' : ''}>Medium Voltage (Planned)</option>
                        <option value="sutr-existing" ${element.type === 'sutr-existing' ? 'selected' : ''}>Low Voltage (Existing)</option>
                        <option value="sutr-rencana" ${element.type === 'sutr-rencana' ? 'selected' : ''}>Low Voltage (Planned)</option>
                    </select>
                </div>
                
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-ruler"></i> Measurements</label>
                    <div class="measurement-info">
                        <div class="measure-item">
                            <span class="measure-label">Canvas Length</span>
                            <span class="measure-value">${canvasLength} px</span>
                        </div>
                        ${element.distanceMeters ? `
                        <div class="measure-item primary">
                            <span class="measure-label">Real Distance</span>
                            <span class="measure-value">${element.distanceMeters} m</span>
                        </div>
                        <div class="measure-item">
                            <span class="measure-label">Kilometers</span>
                            <span class="measure-value">${(element.distanceMeters / 1000).toFixed(3)} km</span>
                        </div>` : ''}
                    </div>
                </div>
                
                ${element.startUtm ? `
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-map-marker-alt"></i> Coordinates</label>
                    <div class="location-info">
                        <div class="coord-item">
                            <span class="coord-label">Start UTM</span>
                            <span class="coord-value">${Math.round(element.startUtm.x)}, ${Math.round(element.startUtm.y)} (${element.startUtm.zone})</span>
                        </div>
                        <div class="coord-item">
                            <span class="coord-label">End UTM</span>
                            <span class="coord-value">${Math.round(element.endUtm.x)}, ${Math.round(element.endUtm.y)} (${element.endUtm.zone})</span>
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
    }
    
    html += `
        <div class="property-actions">
            <button onclick="drawingEngine.deleteSelected()" class="delete-btn">
                <i class="fas fa-trash-alt"></i>
                <span>Delete Element</span>
            </button>
        </div>
    `;
    
    panel.innerHTML = html;
};