// Error state management with safe DOM manipulation
var errorState = new Proxy({ message: "" }, {
    set(target, prop, val) {
        target[prop] = val;
        var errorConsole = window.document.getElementById("error-log");
        if (errorConsole) {
            if (val === "") {
                errorConsole.style.display = "none";
            } else {
                errorConsole.style.display = "block";
                // Use textContent instead of innerHTML to prevent XSS
                errorConsole.textContent = val;
            }
        }
    }
});

function evaluateJs(code) {
    // Note: eval() is necessary for code editor functionality
    // This function injects try/catch blocks around function declarations
    // to handle errors that occur in p5 loops (draw, etc.)
    try {
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid code input');
        }
        
        var ast = acorn.parse(code, { ecmaVersion: 2020 });
        var codeToEval = '';
        errorState.message = "";
        
        for (const n in ast['body']) {
            var nodeBody = code.slice(ast['body'][n]['start'], ast['body'][n]['end']);
            if (ast['body'][n]['type'] === 'FunctionDeclaration') {
                var functionDeclaration = code.slice(ast['body'][n]['start'], ast['body'][n]['body']['start'] + 1);
                var functionBody = code.slice(ast['body'][n]['body']['start'] + 1, ast['body'][n]['end'] - 1);
                nodeBody = functionDeclaration + '\ntry {\n' + functionBody + '\n}\ncatch (e){\nwindow.parent.errorState.message=e.message;\n}\n}\n';
            }
            codeToEval += nodeBody;
        }
        
        var previewWindow = document.getElementById('preview');
        if (previewWindow && previewWindow.contentWindow) {
            previewWindow.contentWindow.eval(codeToEval);
        } else {
            throw new Error('Preview window not available');
        }
    }
    catch (e) {
        // Use console.error directly as this is a critical error that should always be shown
        // Debug object may not be available in editor context
        if (typeof Debug !== 'undefined' && Debug.error) {
            Debug.error('Code evaluation error:', e.message);
        } else {
            console.error('Code evaluation error:', e.message);
        }
        errorState.message = e.message;
    }
}
