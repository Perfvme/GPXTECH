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
            this.drawingEngine.dimensionStyle.textSize = size;
            this.drawingEngine.render();
        });
    }

    // Text color
    const textColorInput = document.getElementById('dimensionTextColor');
    if (textColorInput) {
        textColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.textColor = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Line color
    const lineColorInput = document.getElementById('dimensionLineColor');
    if (lineColorInput) {
        lineColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.lineColor = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Line width
    const lineWidthSlider = document.getElementById('dimensionLineWidth');
    if (lineWidthSlider) {
        lineWidthSlider.addEventListener('input', (e) => {
            const width = parseFloat(e.target.value);
            this.drawingEngine.dimensionStyle.lineWidth = width;
            this.drawingEngine.render();
        });
    }

    // Line opacity
    const lineOpacitySlider = document.getElementById('dimensionLineOpacity');
    if (lineOpacitySlider) {
        lineOpacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.drawingEngine.dimensionStyle.lineOpacity = value;
            this.drawingEngine.render();
        });
    }

    // Line style
    const lineStyleSelect = document.getElementById('dimensionLineStyle');
    if (lineStyleSelect) {
        lineStyleSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.lineStyle = e.target.value;
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
            this.drawingEngine.dimensionStyle.arcSize = size;
            this.drawingEngine.render();
        });
    }

    // Font
    const fontSelect = document.getElementById('dimensionFont');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.font = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Text style
    const textStyleSelect = document.getElementById('dimensionTextStyle');
    if (textStyleSelect) {
        textStyleSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.textStyle = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Unit
    const unitSelect = document.getElementById('dimensionUnit');
    if (unitSelect) {
        unitSelect.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.unit = e.target.value;
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
            this.drawingEngine.dimensionStyle.precision = precision;
            this.drawingEngine.render();
        });
    }

    // Prefix
    const prefixInput = document.getElementById('dimensionPrefix');
    if (prefixInput) {
        prefixInput.addEventListener('input', (e) => {
            this.drawingEngine.dimensionStyle.prefix = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Suffix
    const suffixInput = document.getElementById('dimensionSuffix');
    if (suffixInput) {
        suffixInput.addEventListener('input', (e) => {
            this.drawingEngine.dimensionStyle.suffix = e.target.value;
            this.drawingEngine.render();
        });
    }

    // Show background
    const showBackgroundCheck = document.getElementById('dimensionShowBackground');
    if (showBackgroundCheck) {
        showBackgroundCheck.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.showBackground = e.target.checked;
            this.drawingEngine.render();
        });
    }

    // Show arrows
    const showArrowsCheck = document.getElementById('dimensionShowArrows');
    if (showArrowsCheck) {
        showArrowsCheck.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.showArrows = e.target.checked;
            this.drawingEngine.render();
        });
    }

    // Background color
    const backgroundColorInput = document.getElementById('dimensionBackgroundColor');
    if (backgroundColorInput) {
        backgroundColorInput.addEventListener('change', (e) => {
            this.drawingEngine.dimensionStyle.backgroundColor = e.target.value;
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
            this.drawingEngine.dimensionStyle.backgroundOpacity = opacity;
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
                backgroundColor: document.getElementById('dimensionBackgroundColor')?.value,
                backgroundOpacity: parseInt(document.getElementById('dimensionBackgroundOpacity')?.value)
            };

            this.drawingEngine.applyStyleToSelectedDimensions(styleUpdates);
        });
    }
};