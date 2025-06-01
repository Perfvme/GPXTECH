/**
 * Dimension Presets
 * Handles dimension style presets and UI updates
 */

/**
 * Apply a dimension preset
 */
ElectricalCADApp.prototype.applyDimensionPreset = function(preset) {
    const presets = {
        minimal: {
            textSize: 12,
            textColor: '#333333',
            lineColor: '#666666',
            lineWidth: 1,
            lineStyle: 'solid',
            arcSize: 30,
            font: 'Arial',
            textStyle: 'normal',
            unit: '°',
            precision: 1,
            prefix: '',
            suffix: '',
            showBackground: false,
            showArrows: false,
            backgroundColor: '#ffffff',
            backgroundOpacity: 80,
            textOpacity: 100,
            textOffset: 5
        },
        standard: {
            textSize: 14,
            textColor: '#000000',
            lineColor: '#0066cc',
            lineWidth: 2,
            lineStyle: 'solid',
            arcSize: 40,
            font: 'Arial',
            textStyle: 'normal',
            unit: '°',
            precision: 1,
            prefix: '',
            suffix: '',
            showBackground: true,
            showArrows: true,
            backgroundColor: '#ffffff',
            backgroundOpacity: 90,
            textOpacity: 100,
            textOffset: 10
        },
        technical: {
            textSize: 12,
            textColor: '#000000',
            lineColor: '#ff0000',
            lineWidth: 1,
            lineStyle: 'solid',
            arcSize: 35,
            font: 'Courier New',
            textStyle: 'normal',
            unit: '°',
            precision: 2,
            prefix: '∠',
            suffix: '',
            showBackground: true,
            showArrows: true,
            backgroundColor: '#ffffcc',
            backgroundOpacity: 85,
            textOpacity: 100,
            textOffset: 8
        },
        bold: {
            textSize: 16,
            textColor: '#ffffff',
            lineColor: '#ff6600',
            lineWidth: 3,
            lineStyle: 'solid',
            arcSize: 50,
            font: 'Arial',
            textStyle: 'bold',
            unit: '°',
            precision: 0,
            prefix: '',
            suffix: '',
            showBackground: true,
            showArrows: true,
            backgroundColor: '#333333',
            backgroundOpacity: 95,
            textOpacity: 100,
            textOffset: 12
        }
    };

    const presetStyle = presets[preset];
    if (presetStyle) {
        // Apply preset to drawing engine
        Object.assign(this.drawingEngine.dimensionStyle, presetStyle);
        
        // Update UI controls
        this.updateDimensionStyleUI();
        
        // Re-render
        this.drawingEngine.render();
    }
};

/**
 * Update dimension style UI controls
 */
ElectricalCADApp.prototype.updateDimensionStyleUI = function() {
    const style = this.drawingEngine.dimensionStyle;
    
    // Update sliders and their values
    const updateSlider = (id, valueId, value) => {
        const slider = document.getElementById(id);
        const valueEl = document.getElementById(valueId);
        if (slider) slider.value = value;
        if (valueEl) valueEl.textContent = value;
    };
    
    // Update input values directly
    const updateInput = (id, value) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    };
    
    updateInput('dimensionTextSize', style.textSize);
    updateInput('dimensionLineWidth', style.lineWidth);
    updateInput('dimensionLineOpacity', style.lineOpacity);
    updateSlider('dimensionArcSize', 'dimensionArcSizeValue', style.arcSize);
    updateSlider('dimensionPrecision', 'dimensionPrecisionValue', style.precision);
    updateSlider('dimensionBackgroundOpacity', 'dimensionBackgroundOpacityValue', style.backgroundOpacity);
    updateSlider('dimensionTextOpacity', 'dimensionTextOpacityValue', style.textOpacity);
    updateInput('dimensionTextOffset', style.textOffset);
    
    // Update color inputs
    const updateColor = (id, value) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    };
    
    updateColor('dimensionTextColor', style.textColor);
    updateColor('dimensionLineColor', style.lineColor);
    updateColor('dimensionBackgroundColor', style.backgroundColor);
    
    // Update selects
    const updateSelect = (id, value) => {
        const select = document.getElementById(id);
        if (select) select.value = value;
    };
    
    updateSelect('dimensionLineStyle', style.lineStyle);
    updateSelect('dimensionFont', style.font);
    updateSelect('dimensionTextStyle', style.textStyle);
    updateSelect('dimensionUnit', style.unit);
    
    // Update text inputs
    const updateText = (id, value) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    };
    
    updateText('dimensionPrefix', style.prefix);
    updateText('dimensionSuffix', style.suffix);
    
    // Update checkboxes
    const updateCheckbox = (id, value) => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = value;
    };
    
    updateCheckbox('dimensionShowBackground', style.showBackground);
    updateCheckbox('dimensionShowArrows', style.showArrows);
};