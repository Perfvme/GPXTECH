/**
 * UI Updates
 * Handles notifications, theme management, and other UI updates
 */

/**
 * Show notification to user
 */
ElectricalCADApp.prototype.showNotification = function(message, type = 'info') {
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
};

/**
 * Remove notification with animation
 */
ElectricalCADApp.prototype.removeNotification = function(notification) {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
};

/**
 * Toggle dark mode
 */
ElectricalCADApp.prototype.toggleDarkMode = function() {
    const body = document.body;
    const darkModeBtn = document.getElementById('darkModeToggle');
    const icon = darkModeBtn.querySelector('i');
    
    if (body.getAttribute('data-theme') === 'dark') {
        // Switch to light mode
        body.removeAttribute('data-theme');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'light');
        this.showNotification('Switched to light mode', 'success');
    } else {
        // Switch to dark mode
        body.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'dark');
        this.showNotification('Switched to dark mode', 'success');
    }
    
    // Re-render canvas if drawing engine exists
    if (this.drawingEngine) {
        this.drawingEngine.render();
    }
};

/**
 * Initialize theme from localStorage
 */
ElectricalCADApp.prototype.initializeTheme = function() {
    const savedTheme = localStorage.getItem('theme');
    const darkModeBtn = document.getElementById('darkModeToggle');
    const icon = darkModeBtn?.querySelector('i');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (icon) {
            icon.className = 'fas fa-moon';
        }
    }
};