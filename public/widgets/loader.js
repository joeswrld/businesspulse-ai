// Widget Loader for NoteX
(function() {
    'use strict';
    
    // Auto-detect which widget to load
    const script = document.currentScript;
    const userId = script.getAttribute('data-user-id');
    const version = script.getAttribute('data-version') || '2.0';
    
    if (!userId) {
        console.error('NoteX Widget: User ID is required');
        return;
    }
    
    // Load the appropriate widget version
    const widgetScript = document.createElement('script');
    widgetScript.src = `https://notex.com.ng/widgets/widget-${version}.js`;
    widgetScript.setAttribute('data-user-id', userId);
    widgetScript.async = true;
    
    document.head.appendChild(widgetScript);
})();
