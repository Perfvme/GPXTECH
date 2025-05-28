/**
 * Main Application Controller
 * Handles UI interactions and coordinates between components
 */

class ElectricalCADApp {
    constructor() {
        this.drawingEngine = null;
        this.gpxParser = new GPXParser();
        this.currentProject = {
            name: 'Untitled Project',
            created: new Date(),
            modified: new Date()
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }

    /**
     * Setup the application after DOM is ready
     */
    setupApplication() {
        // Initialize canvas and drawing engine
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize drawing engine
        this.drawingEngine = new DrawingEngine(canvas);
        
        // Make drawing engine globally accessible for property panel
        window.drawingEngine = this.drawingEngine;
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('Electrical CAD Application initialized successfully');
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const canvas = document.getElementById('drawingCanvas');
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (this.drawingEngine) {
            this.drawingEngine.render();
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Header buttons
        document.getElementById('newProject')?.addEventListener('click', () => this.newProject());
        document.getElementById('saveProject')?.addEventListener('click', () => this.saveProject());
        document.getElementById('loadGpx')?.addEventListener('click', () => this.loadGPXFile());
        
        // GPX file input
        document.getElementById('gpxFileInput')?.addEventListener('change', (e) => this.handleGPXFile(e));
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTool(e.target.closest('.tool-btn')));
        });
        
        // Symbol buttons
        document.querySelectorAll('.symbol-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectSymbol(e.target.closest('.symbol-btn')));
        });
        
        // Line type buttons
        document.querySelectorAll('.line-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectLineType(e.target.closest('.line-type-btn')));
        });
        
        // Canvas controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.drawingEngine.zoomIn());
        document.getElementById('zoomOut')?.addEventListener('click', () => this.drawingEngine.zoomOut());
        document.getElementById('resetView')?.addEventListener('click', () => this.drawingEngine.resetView());
        
        // Accessories checkboxes
        document.getElementById('addGrounding')?.addEventListener('change', (e) => {
            this.drawingEngine.setGrounding(e.target.checked);
        });
        
        document.getElementById('addGuywire')?.addEventListener('change', (e) => {
            this.drawingEngine.setGuywire(e.target.checked);
        });
        
        // Display options
        document.getElementById('showNameLabels')?.addEventListener('change', (e) => {
            this.drawingEngine.toggleNameLabels(e.target.checked);
        });
        
        // Legend controls
        this.setupLegendControls();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /**
     * Setup legend controls (dragging and minimizing)
     */
    setupLegendControls() {
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
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Prevent default for our shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newProject();
                    break;
                case 'o':
                    e.preventDefault();
                    this.loadGPXFile();
                    break;
            }
        }
        
        // Tool shortcuts
        switch (e.key.toLowerCase()) {
            case 'v':
                this.selectToolByType('select');
                break;
            case 'h':
                this.selectToolByType('pan');
                break;
            case 'l':
                this.selectToolByType('line');
                break;
            case 'p':
                this.selectToolByType('pole');
                break;
            case 'delete':
            case 'backspace':
                this.drawingEngine.deleteSelected();
                break;
            case 'escape':
                this.drawingEngine.selectedElement = null;
                this.drawingEngine.updatePropertiesPanel(null);
                this.drawingEngine.render();
                break;
        }
    }

    /**
     * Select tool by type
     */
    selectToolByType(toolType) {
        const toolBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (toolBtn) {
            this.selectTool(toolBtn);
        }
    }

    /**
     * Select a drawing tool
     */
    selectTool(toolBtn) {
        // Remove active class from all tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        toolBtn.classList.add('active');
        
        // Set tool in drawing engine
        const tool = toolBtn.dataset.tool;
        this.drawingEngine.setTool(tool);
    }

    /**
     * Select a symbol type
     */
    selectSymbol(symbolBtn) {
        // Remove active class from all symbol buttons
        document.querySelectorAll('.symbol-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        symbolBtn.classList.add('active');
        
        // Set pole type in drawing engine
        const type = symbolBtn.dataset.type;
        this.drawingEngine.setPoleType(type);
        
        // Auto-select pole tool
        this.selectToolByType('pole');
    }

    /**
     * Select a line type
     */
    selectLineType(lineBtn) {
        // Remove active class from all line type buttons
        document.querySelectorAll('.line-type-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected button
        lineBtn.classList.add('active');
        
        // Set line type in drawing engine
        const type = lineBtn.dataset.type;
        this.drawingEngine.setLineType(type);
        
        // Auto-select line tool
        this.selectToolByType('line');
    }

    /**
     * Create a new project
     */
    newProject() {
        if (confirm('Are you sure you want to create a new project? Any unsaved changes will be lost.')) {
            this.drawingEngine.clear();
            this.currentProject = {
                name: 'Untitled Project',
                created: new Date(),
                modified: new Date()
            };
            this.showNotification('New project created', 'success');
        }
    }

    /**
     * Save current project
     */
    saveProject() {
        try {
            const projectData = {
                ...this.currentProject,
                modified: new Date(),
                drawing: this.drawingEngine.exportData()
            };
            
            const dataStr = JSON.stringify(projectData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.json`;
            link.click();
            
            this.showNotification('Project saved successfully', 'success');
        } catch (error) {
            console.error('Error saving project:', error);
            this.showNotification('Error saving project', 'error');
        }
    }

    /**
     * Load GPX file
     */
    loadGPXFile() {
        document.getElementById('gpxFileInput').click();
    }

    /**
     * Handle GPX file selection
     */
    handleGPXFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            this.showNotification('Please select a valid GPX file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.processGPXContent(e.target.result);
            } catch (error) {
                console.error('Error processing GPX file:', error);
                this.showNotification('Error processing GPX file: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }

    /**
     * Process GPX file content
     */
    processGPXContent(gpxContent) {
        try {
            // Parse GPX
            const gpxData = this.gpxParser.parseGPX(gpxContent);
            
            if (gpxData.waypoints.length === 0 && gpxData.tracks.length === 0 && gpxData.routes.length === 0) {
                this.showNotification('No waypoints, tracks, or routes found in GPX file', 'warning');
                return;
            }
            
            // Project coordinates to canvas
            const canvas = document.getElementById('drawingCanvas');
            this.gpxParser.projectToCanvas(gpxData.bounds, canvas.width, canvas.height);
            
            // Convert to drawing elements
            const elements = this.gpxParser.toDrawingElements();
            
            // Load into drawing engine
            this.drawingEngine.loadFromGPX(elements);
            
            // Update project info
            this.currentProject.name = `GPX Import - ${new Date().toLocaleDateString()}`;
            this.currentProject.modified = new Date();
            
            // Show success message
            const totalElements = elements.poles.length + elements.lines.length;
            this.showNotification(
                `GPX loaded successfully: ${elements.poles.length} poles, ${elements.lines.length} lines`,
                'success'
            );
            
            // Reset view to fit content
            this.drawingEngine.resetView();
            
        } catch (error) {
            console.error('Error processing GPX:', error);
            this.showNotification('Error processing GPX file: ' + error.message, 'error');
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    padding: 15px;
                    border-radius: 6px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s ease;
                }
                
                .notification-info {
                    background: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    color: #1976d2;
                }
                
                .notification-success {
                    background: #e8f5e8;
                    border-left: 4px solid #4caf50;
                    color: #2e7d32;
                }
                
                .notification-warning {
                    background: #fff3e0;
                    border-left: 4px solid #ff9800;
                    color: #f57c00;
                }
                
                .notification-error {
                    background: #ffebee;
                    border-left: 4px solid #f44336;
                    color: #c62828;
                }
                
                .notification-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-message {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                    opacity: 0.7;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                this.removeNotification(notification);
            }
        }, 5000);
    }

    /**
     * Remove notification with animation
     */
    removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Load project from file
     */
    loadProject(projectData) {
        try {
            this.currentProject = {
                name: projectData.name || 'Loaded Project',
                created: new Date(projectData.created) || new Date(),
                modified: new Date(projectData.modified) || new Date()
            };
            
            if (projectData.drawing) {
                this.drawingEngine.importData(projectData.drawing);
            }
            
            this.showNotification('Project loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading project:', error);
            this.showNotification('Error loading project: ' + error.message, 'error');
        }
    }

    /**
     * Export drawing as image
     */
    exportAsImage() {
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
    }
}

// Initialize application when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ElectricalCADApp();
});

// Add some additional CSS for properties panel
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .property-group {
        margin-bottom: 15px;
    }
    
    .property-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 5px;
        color: #2c3e50;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .property-group input,
    .property-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }
    
    .property-group input:focus,
    .property-group select:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .property-actions {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }
    
    .btn-danger {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: background 0.3s ease;
    }
    
    .btn-danger:hover {
        background: #c0392b;
    }
`;
document.head.appendChild(additionalStyles);