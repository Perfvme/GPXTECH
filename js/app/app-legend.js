/**
 * Legend Controls
 * Handles legend dragging and minimizing functionality
 */

ElectricalCADApp.prototype.setupLegendControls = function() {
    const legend = document.getElementById('legend');
    const legendHeader = legend.querySelector('.legend-header');
    const legendMinimize = document.getElementById('legendMinimize');
    const legendContent = document.getElementById('legendContent');
    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Minimize/maximize functionality
    legendMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        legend.classList.toggle('minimized');
        const icon = legendMinimize.querySelector('i');
        if (legend.classList.contains('minimized')) {
            icon.className = 'fas fa-plus';
        } else {
            icon.className = 'fas fa-minus';
        }
    });
    
    // Dragging functionality
    legendHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('.legend-control-btn')) return;
        
        isDragging = true;
        const rect = legend.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        legend.style.position = 'fixed';
        legend.style.zIndex = '1000';
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
    });
    
    function handleDrag(e) {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        // Keep legend within viewport bounds
        const maxX = window.innerWidth - legend.offsetWidth;
        const maxY = window.innerHeight - legend.offsetHeight;
        
        legend.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        legend.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        legend.style.bottom = 'auto';
    }
    
    function handleDragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    }
};