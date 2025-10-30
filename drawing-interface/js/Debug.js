/**
 * Debug utility - centralized logging system
 * Set window.DEBUG = true in browser console to enable debug logs
 */
(function() {
    'use strict';
    
    // Check for debug flag in URL or localStorage
    var urlParams = new URLSearchParams(window.location.search);
    var debugEnabled = urlParams.get('debug') === 'true' || 
                       localStorage.getItem('p5fab_debug') === 'true' ||
                       window.DEBUG === true;
    
    // Expose debug state globally
    window.DEBUG = debugEnabled;
    
    // Debug logger object
    window.Debug = {
        enabled: debugEnabled,
        
        log: function() {
            if (this.enabled) {
                console.log.apply(console, arguments);
            }
        },
        
        error: function() {
            // Always show errors
            console.error.apply(console, arguments);
        },
        
        warn: function() {
            // Always show warnings
            console.warn.apply(console, arguments);
        },
        
        info: function() {
            if (this.enabled) {
                console.info.apply(console, arguments);
            }
        },
        
        // Enable/disable debug mode
        enable: function() {
            this.enabled = true;
            window.DEBUG = true;
            localStorage.setItem('p5fab_debug', 'true');
            console.log('%cDebug mode enabled', 'color: green; font-weight: bold');
        },
        
        disable: function() {
            this.enabled = false;
            window.DEBUG = false;
            localStorage.removeItem('p5fab_debug');
            console.log('Debug mode disabled');
        },
        
        // Toggle debug mode
        toggle: function() {
            if (this.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        }
    };
    
    // Shortcut function
    window.debugLog = function() {
        window.Debug.log.apply(window.Debug, arguments);
    };
})();

