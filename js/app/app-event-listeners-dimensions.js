/**
 * Dimension Style Event Listeners
 * Handles all dimension style control event listeners
 */

ElectricalCADApp.prototype.setupDimensionStyleControlListeners = function() {
    // Text size
    const textSizeSlider = document.getElementById('dimensionTextSize');
    if (textSizeSlider) {
        textSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.drawingEngine.dimensionStyle.angle.textSize = size;
            this.drawingEngine.render();
        });
    }

    // Text color
    const textColorInput = document.getElementById('dimensionTextColor');
    if (textColorInput) {
        textColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.textColor = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Line color
    const lineColorInput = document.getElementById('dimensionLineColor');
    if (lineColorInput) {
        lineColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.lineColor = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Line width
    const lineWidthSlider = document.getElementById('dimensionLineWidth');
    if (lineWidthSlider) {
        lineWidthSlider.addEventListener('input', (e) => {
            const width = parseFloat(e.target.value);
            this.drawingEngine.dimensionStyle.angle.lineWidth = width;
            this.drawingEngine.render();
        });
    }

    // Line opacity
    const lineOpacitySlider = document.getElementById('dimensionLineOpacity');
    if (lineOpacitySlider) {
        lineOpacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.drawingEngine.dimensionStyle.angle.lineOpacity = value;
            this.drawingEngine.render();
        });
    }

    // Line style
    const lineStyleSelect = document.getElementById('dimensionLineStyle');
    if (lineStyleSelect) {
        lineStyleSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.lineStyle = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Arc size
    const arcSizeSlider = document.getElementById('dimensionArcSize');
    const arcSizeValue = document.getElementById('dimensionArcSizeValue');
    if (arcSizeSlider && arcSizeValue) {
        arcSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            arcSizeValue.textContent = size;
            this.drawingEngine.dimensionStyle.angle.arcSize = size;
            this.drawingEngine.render();
        });
    }

    // Font
    const fontSelect = document.getElementById('dimensionFont');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.font = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Text style
    const textStyleSelect = document.getElementById('dimensionTextStyle');
    if (textStyleSelect) {
        textStyleSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.textStyle = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Unit
    const unitSelect = document.getElementById('dimensionUnit');
    if (unitSelect) {
        unitSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.unit = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Precision
    const precisionSlider = document.getElementById('dimensionPrecision');
    const precisionValue = document.getElementById('dimensionPrecisionValue');
    if (precisionSlider && precisionValue) {
        precisionSlider.addEventListener('input', (e) => {
            const precision = parseInt(e.target.value);
            precisionValue.textContent = precision;
            this.drawingEngine.dimensionStyle.angle.precision = precision;
            this.drawingEngine.render();
        });
    }

    // Prefix
    const prefixInput = document.getElementById('dimensionPrefix');
    if (prefixInput) {
        prefixInput.addEventListener('input', (e) => {
            this.drawingEngine.dimensionStyle.angle.prefix = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Suffix
    const suffixInput = document.getElementById('dimensionSuffix');
    if (suffixInput) {
        suffixInput.addEventListener('input', (e) => {
            this.drawingEngine.dimensionStyle.angle.suffix = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Show background
    const showBackgroundCheck = document.getElementById('dimensionShowBackground');
    if (showBackgroundCheck) {
        showBackgroundCheck.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.showBackground = e.target.checked;
            this.drawingEngine.render();
        });
    }

    // Show arrows
    const showArrowsCheck = document.getElementById('dimensionShowArrows');
    if (showArrowsCheck) {
        showArrowsCheck.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.showArrows = e.target.checked;
            this.drawingEngine.render();
        });
    }

    // Show deflection
    const showDeflectionCheck = document.getElementById('dimensionShowDeflection');
    if (showDeflectionCheck) {
        showDeflectionCheck.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.showDeflection = e.target.checked;
            this.drawingEngine.render();
        });
    }

    // Background color
    const backgroundColorInput = document.getElementById('dimensionBackgroundColor');
    if (backgroundColorInput) {
        backgroundColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.angle.backgroundColor = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Background opacity
    const backgroundOpacitySlider = document.getElementById('dimensionBackgroundOpacity');
    const backgroundOpacityValue = document.getElementById('dimensionBackgroundOpacityValue');
    if (backgroundOpacitySlider && backgroundOpacityValue) {
        backgroundOpacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            backgroundOpacityValue.textContent = opacity;
            this.drawingEngine.dimensionStyle.angle.backgroundOpacity = opacity;
            this.drawingEngine.render();
        });
    }

    // Text opacity
    const textOpacitySlider = document.getElementById('dimensionTextOpacity');
    const textOpacityValue = document.getElementById('dimensionTextOpacityValue');
    if (textOpacitySlider && textOpacityValue) {
        textOpacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            textOpacityValue.textContent = opacity;
            this.drawingEngine.dimensionStyle.angle.textOpacity = opacity;
            this.drawingEngine.render();
        });
    }

    // Text offset
    const textOffsetSlider = document.getElementById('dimensionTextOffset');
    if (textOffsetSlider) {
        textOffsetSlider.addEventListener('input', (e) => {
            const offset = parseInt(e.target.value);
            this.drawingEngine.dimensionStyle.angle.textOffset = offset;
            this.drawingEngine.render();
        });
    }

    // Apply style to selected dimensions
    const applyStyleButton = document.getElementById('applyDimensionStyleToSelection');
    if (applyStyleButton) {
        applyStyleButton.addEventListener('click', () => {
            const styleUpdates = {
                textSize: parseFloat(document.getElementById('dimensionTextSize')?.value),
                textColor: document.getElementById('dimensionTextColor')?.value,
                lineColor: document.getElementById('dimensionLineColor')?.value,
                lineWidth: parseFloat(document.getElementById('dimensionLineWidth')?.value),
                lineOpacity: parseFloat(document.getElementById('dimensionLineOpacity')?.value),
                lineStyle: document.getElementById('dimensionLineStyle')?.value,
                arcSize: parseInt(document.getElementById('dimensionArcSize')?.value),
                font: document.getElementById('dimensionFont')?.value,
                textStyle: document.getElementById('dimensionTextStyle')?.value,
                unit: document.getElementById('dimensionUnit')?.value,
                precision: parseInt(document.getElementById('dimensionPrecision')?.value),
                prefix: document.getElementById('dimensionPrefix')?.value,
                suffix: document.getElementById('dimensionSuffix')?.value,
                showBackground: document.getElementById('dimensionShowBackground')?.checked,
                showArrows: document.getElementById('dimensionShowArrows')?.checked,
                showDeflection: document.getElementById('dimensionShowDeflection')?.checked,
                backgroundColor: document.getElementById('dimensionBackgroundColor')?.value,
                backgroundOpacity: parseInt(document.getElementById('dimensionBackgroundOpacity')?.value),
                textOpacity: parseInt(document.getElementById('dimensionTextOpacity')?.value),
                textOffset: parseInt(document.getElementById('dimensionTextOffset')?.value)
            };

            this.drawingEngine.applyStyleToSelectedDimensions(styleUpdates);
        });
    }

    // Initialize controls with current style values
    this.updateDimensionStyleControls();
};

/**
 * Update dimension style controls to reflect current style values
 */
ElectricalCADApp.prototype.updateDimensionStyleControls = function() {
    const style = this.drawingEngine.dimensionStyle.angle;
    
    // Update all controls with current style values
    const controls = [
        { id: 'dimensionTextSize', value: style.textSize },
        { id: 'dimensionTextColor', value: style.textColor },
        { id: 'dimensionLineColor', value: style.lineColor },
        { id: 'dimensionLineWidth', value: style.lineWidth },
        { id: 'dimensionLineOpacity', value: style.lineOpacity },
        { id: 'dimensionLineStyle', value: style.lineStyle },
        { id: 'dimensionArcSize', value: style.arcSize },
        { id: 'dimensionFont', value: style.font },
        { id: 'dimensionTextStyle', value: style.textStyle },
        { id: 'dimensionUnit', value: style.unit },
        { id: 'dimensionPrecision', value: style.precision },
        { id: 'dimensionPrefix', value: style.prefix },
        { id: 'dimensionSuffix', value: style.suffix },
        { id: 'dimensionBackgroundColor', value: style.backgroundColor },
        { id: 'dimensionBackgroundOpacity', value: style.backgroundOpacity },
        { id: 'dimensionTextOpacity', value: style.textOpacity },
        { id: 'dimensionTextOffset', value: style.textOffset }
    ];

    controls.forEach(control => {
        const element = document.getElementById(control.id);
        if (element) {
            element.value = control.value;
        }
    });

    // Update checkboxes
    const checkboxes = [
        { id: 'dimensionShowBackground', checked: style.showBackground },
        { id: 'dimensionShowArrows', checked: style.showArrows },
        { id: 'dimensionShowDeflection', checked: style.showDeflection }
    ];

    checkboxes.forEach(checkbox => {
        const element = document.getElementById(checkbox.id);
        if (element) {
            element.checked = checkbox.checked;
        }
    });

    // Update range display values
    const rangeDisplays = [
        { id: 'dimensionArcSizeValue', valueId: 'dimensionArcSize' }
    ];

    rangeDisplays.forEach(display => {
        const displayElement = document.getElementById(display.id);
        const valueElement = document.getElementById(display.valueId);
        if (displayElement && valueElement) {
            displayElement.textContent = valueElement.value;
        }
    });
};