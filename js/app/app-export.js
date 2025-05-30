/**
 * Export functionality
 * Handles exporting drawings and projects in various formats
 */

/**
 * Export drawing as image
 */
ElectricalCADApp.prototype.exportAsImage = function() {
    try {
        const canvas = document.getElementById('drawingCanvas');
        const link = document.createElement('a');
        link.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showNotification('Image exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting image:', error);
        this.showNotification('Error exporting image', 'error');
    }
};