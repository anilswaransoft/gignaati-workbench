// Direct N8N Integration using Electron webview

function createN8NView() {
    // Create the container
    const container = document.createElement('div');
    container.id = 'n8n-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 99999;
        display: flex;
        flex-direction: column;
    `;

    // Create the header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    header.innerHTML = `
        <div style="font-size: 1.2rem; font-weight: 600;">🤖 Agentic Platform</div>
        <button onclick="closeN8NView()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
        ">← Back to Dashboard</button>
    `;

    // Create the webview element
    const webview = document.createElement('webview');
    webview.id = 'n8n-webview';
    webview.setAttribute('src', 'http://localhost:5678');
    webview.setAttribute('nodeintegration', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=false');
    
    webview.style.cssText = `
        flex: 1;
        width: 100%;
        border: none;
    `;

    // Add loading indicator
    const loader = document.createElement('div');
    loader.id = 'n8n-loader';
    loader.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    `;
    loader.innerHTML = `
        <div class="spinner" style="
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    // Assemble the container
    container.appendChild(header);
    container.appendChild(webview);
   // container.appendChild(loader);
    
    // Add webview event listeners
    webview.addEventListener('dom-ready', () => {
        const loader = document.getElementById('n8n-loader');
        if (loader) loader.style.display = 'none';
        
        // Inject custom CSS to hide N8N's header (optional)
        webview.insertCSS(`
            header.main-header { display: none !important; }
            .layout-default { padding-top: 0 !important; }
        `);
    });

    webview.addEventListener('did-fail-load', (event) => {
        const loader = document.getElementById('n8n-loader');
        if (loader) {
            loader.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom: 10px; color: #333;">Connection Failed</h3>
                    <p style="margin-bottom: 15px; color: #666;">Unable to connect to N8N. Please ensure the service is running.</p>
                    <button onclick="retryN8NConnection()" style="
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Retry Connection</button>
                </div>
            `;
        }
    });

    return container;
}

function showN8NView() {
    // Remove any existing instance
    const existingContainer = document.getElementById('n8n-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create and add the new view
    const container = createN8NView();
    document.body.appendChild(container);
}

function closeN8NView() {
    const container = document.getElementById('n8n-container');
    if (container) {
        container.remove();
    }
}

function retryN8NConnection() {
    const webview = document.getElementById('n8n-webview');
    const loader = document.getElementById('n8n-loader');
    
    if (webview && loader) {
        loader.style.display = 'block';
        webview.reload();
    }
}

// Make functions available globally
window.showN8NView = showN8NView;
window.closeN8NView = closeN8NView;
window.retryN8NConnection = retryN8NConnection;