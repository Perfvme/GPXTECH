/**
 * Dimension Preset Event Listeners
 * Handles dimension preset control event listeners
 */

ElectricalCADApp.prototype.setupDimensionPresetControlListeners = function() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const preset = e.target.dataset.preset;
            this.applyDimensionPreset(preset);
            
            // Update active state
            presetButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
};