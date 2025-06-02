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
    
    if (element.type && (element.type.includes('tiang') || element.type.includes('gardu'))) {
        // POLE PROPERTIES
        const typeDisplayNames = {
            'tiang-baja-existing': 'Steel Pole (Existing)',
            'tiang-baja-rencana': 'Steel Pole (Planned)',
            'tiang-beton-existing': 'Concrete Pole (Existing)',
            'tiang-beton-rencana': 'Concrete Pole (Planned)',
            'gardu-portal': 'Portal Substation'
        };
        const currentElementName = element.name || '';
        const currentHasGrounding = element.hasGrounding || false;
        const currentHasGuywire = element.hasGuywire || false;

        html = `
            <div class="element-header">
                <div class="element-icon pole-icon"><i class="fas fa-broadcast-tower"></i></div>
                <div class="element-info">
                    <h4>Pole Properties</h4>
                    <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                </div>
            </div>
            
            <div class="properties-form">
                <div class="form-row">
                    <label for="prop-pole-name"><i class="fas fa-tag"></i> Name</label>
                    <input type="text" id="prop-pole-name" value="${currentElementName}" onchange="window.drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter pole name">
                </div>
                
                <div class="form-row">
                    <label for="prop-pole-type"><i class="fas fa-cog"></i> Type</label>
                    <select id="prop-pole-type" onchange="window.drawingEngine.updateElementProperty('type', this.value)">
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
                            <input type="checkbox" ${currentHasGrounding ? 'checked' : ''} onchange="window.drawingEngine.updateElementProperty('hasGrounding', this.checked)">
                            <span class="checkmark"></span>
                            <i class="fas fa-bolt"></i> Grounding
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" ${currentHasGuywire ? 'checked' : ''} onchange="window.drawingEngine.updateElementProperty('hasGuywire', this.checked)">
                            <span class="checkmark"></span>
                            <i class="fas fa-anchor"></i> Guy Wire
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-map-marker-alt"></i> Location</label>
                    <div class="location-info">
                        <div class="coord-item">
                            <span class="coord-label">Canvas</span>
                            <span class="coord-value">
                                X: <input type="number" step="0.01" value="${element.x}" onchange="window.drawingEngine.updatePoleLocationFromPanel('x', this.value)">
                                , Y: <input type="number" step="0.01" value="${element.y}" onchange="window.drawingEngine.updatePoleLocationFromPanel('y', this.value)">
                            </span>
                        </div>
                        ${element.utmX !== undefined ? `
                        <div class="coord-item">
                            <span class="coord-label">UTM</span>
                            <span class="coord-value">
                                <input type="number" step="0.01" value="${element.utmX}" onchange="window.drawingEngine.updatePoleLocationFromPanel('utmX', this.value)">
                                , <input type="number" step="0.01" value="${element.utmY}" onchange="window.drawingEngine.updatePoleLocationFromPanel('utmY', this.value)">
                                (Z<input type="number" step="1" min="1" max="60" value="${element.utmZone || ''}" onchange="window.drawingEngine.updatePoleLocationFromPanel('utmZone', this.value)">)
                            </span>
                        </div>` : ''}
                        ${element.originalLat !== undefined ? `
                        <div class="coord-item">
                            <span class="coord-label">GPS</span>
                            <span class="coord-value">
                                <input type="number" step="0.000001" value="${element.originalLat}" onchange="window.drawingEngine.updatePoleLocationFromPanel('originalLat', this.value)">
                                , <input type="number" step="0.000001" value="${element.originalLon}" onchange="window.drawingEngine.updatePoleLocationFromPanel('originalLon', this.value)">
                            </span>
                        </div>` : ''}
                        ${element.elevation !== undefined && element.elevation !== null ? `
                        <div class="coord-item">
                            <span class="coord-label">Elevation</span>
                            <span class="coord-value">
                                <input type="number" step="0.01" value="${element.elevation}" onchange="window.drawingEngine.updatePoleLocationFromPanel('elevation', this.value)"> m
                            </span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    } else if (element.type && (element.type.includes('sutm') || element.type.includes('sutr'))) {
        // LINE PROPERTIES
        const typeDisplayNames = {
            'sutm-existing': 'Medium Voltage (Existing)',
            'sutm-rencana': 'Medium Voltage (Planned)',
            'sutr-existing': 'Low Voltage (Existing)',
            'sutr-rencana': 'Low Voltage (Planned)'
        };
        const currentLineName = element.name || '';
        
        const canvasLength = Math.round(Math.sqrt((element.endX - element.startX) ** 2 + (element.endY - element.startY) ** 2));
        
        html = `
            <div class="element-header">
                <div class="element-icon line-icon"><i class="fas fa-wave-square"></i></div>
                <div class="element-info">
                    <h4>Line Properties</h4>
                    <span class="element-type">${typeDisplayNames[element.type] || element.type}</span>
                </div>
            </div>
            
            <div class="properties-form">
                <div class="form-row">
                    <label for="prop-line-name"><i class="fas fa-tag"></i> Name</label>
                    <input type="text" id="prop-line-name" value="${currentLineName}" onchange="window.drawingEngine.updateElementProperty('name', this.value)" placeholder="Enter line name">
                </div>
                
                <div class="form-row">
                    <label for="prop-line-type"><i class="fas fa-cog"></i> Type</label>
                    <select id="prop-line-type" onchange="window.drawingEngine.updateElementProperty('type', this.value)">
                        <option value="sutm-existing" ${element.type === 'sutm-existing' ? 'selected' : ''}>Medium Voltage (Existing)</option>
                        <option value="sutm-rencana" ${element.type === 'sutm-rencana' ? 'selected' : ''}>Medium Voltage (Planned)</option>
                        <option value="sutr-existing" ${element.type === 'sutr-existing' ? 'selected' : ''}>Low Voltage (Existing)</option>
                        <option value="sutr-rencana" ${element.type === 'sutr-rencana' ? 'selected' : ''}>Low Voltage (Planned)</option>
                    </select>
                </div>
                
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-ruler"></i> Measurements (Read-Only)</label>
                    <div class="measurement-info">
                        <div class="measure-item">
                            <span class="measure-label">Canvas Length</span>
                            <span class="measure-value">${canvasLength} px</span>
                        </div>
                        ${element.distanceMeters !== undefined ? `
                        <div class="measure-item primary">
                            <span class="measure-label">3D Distance</span>
                            <span class="measure-value">${element.distanceMeters} m</span>
                        </div>
                        <div class="measure-item">
                            <span class="measure-label">Kilometers</span>
                            <span class="measure-value">${(element.distanceMeters / 1000).toFixed(3)} km</span>
                        </div>` : ''}
                        ${element.startElevation !== undefined && element.startElevation !== null ? `
                        <div class="measure-item">
                            <span class="measure-label">Start Elevation</span>
                            <span class="measure-value">${element.startElevation.toFixed(2)} m</span>
                        </div>` : ''}
                        ${element.endElevation !== undefined && element.endElevation !== null ? `
                        <div class="measure-item">
                            <span class="measure-label">End Elevation</span>
                            <span class="measure-value">${element.endElevation.toFixed(2)} m</span>
                        </div>` : ''}
                    </div>
                </div>
                
                ${element.startUtm ? `
                <div class="form-section">
                    <label class="section-label"><i class="fas fa-map-marker-alt"></i> Coordinates (Read-Only)</label>
                    <div class="location-info">
                        <div class="coord-item">
                            <span class="coord-label">Start UTM</span>
                            <span class="coord-value">${Math.round(element.startUtm.x)}, ${Math.round(element.startUtm.y)} (Z${element.startUtm.zone || 'N/A'})</span>
                        </div>
                        <div class="coord-item">
                            <span class="coord-label">End UTM</span>
                            <span class="coord-value">${Math.round(element.endUtm.x)}, ${Math.round(element.endUtm.y)} (Z${element.endUtm.zone || 'N/A'})</span>
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
    } else if (element.type === 'aligned' || element.type === 'angle') {
        // DIMENSION PROPERTIES (mostly read-only, style changes via toolbar)
        const isAligned = element.type === 'aligned';
        const dimName = isAligned ? 'Aligned Dimension' : 'Angular Dimension';
        const valueLabel = isAligned ? 'Distance' : 'Angle';
        // Ensure element.style exists and has properties before trying to access them
        const style = element.style || (isAligned ? this.dimensionStyle.aligned : this.dimensionStyle.angle);
        const precision = style.precision !== undefined ? style.precision : (isAligned ? 2 : 1);
        const unit = style.unit || (isAligned ? 'm' : '°');

        const valueDisplay = isAligned ? `${element.distance.toFixed(precision)} ${unit}`
                                       : `${element.angle.toFixed(precision)} ${unit}`;
        html = `
            <div class="element-header">
                 <div class="element-icon ${isAligned ? 'line-icon' : 'pole-icon'}"><i class="fas fa-ruler-combined"></i></div>
                <div class="element-info">
                    <h4>${dimName} Properties</h4>
                    <span class="element-type">${element.id}</span>
                </div>
            </div>
            <div class="properties-form">
                <div class="form-row">
                    <label><i class="fas fa-ruler-combined"></i> ${valueLabel}</label>
                    <input type="text" value="${valueDisplay}" readonly>
                </div>
                 <div class="form-row">
                    <label><i class="fas fa-palette"></i> Style Options</label>
                    <p style="font-size:12px; color: var(--text-secondary);">Use Dimension Style panel in toolbar to change style. Apply to selection if needed.</p>
                </div>
            </div>
        `;

    } else {
        panel.innerHTML = `<p>Selected element type not fully supported in properties panel yet.</p>`;
        return;
    }
    
    html += `
        <div class="property-actions">
            <button onclick="window.drawingEngine.deleteSelectedElements()" class="delete-btn">
                <i class="fas fa-trash-alt"></i>
                <span>Delete Element</span>
            </button>
        </div>
    `;
    
    panel.innerHTML = html;
};