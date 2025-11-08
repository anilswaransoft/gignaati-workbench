// electron-main.js - v4 (Smart API-based Routing)
const { app, BrowserWindow, ipcMain, shell, session, net } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');

const isDev = !app.isPackaged;
let backendProcess = null;
let loadingWindow = null;
let mainWindow = null;
let isMainWindowCreated = false;

// ========== Loading Screen Functions ==========

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: false,
    resizable: false,
    icon: path.join(__dirname, 'gig.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  loadingWindow.loadFile('loading-screen.html');
  loadingWindow.center();
}

function updateLoadingProgress(progress, message) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send('loading-progress', progress, message);
  }
}

function closeLoadingWindow() {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
    loadingWindow = null;
  }
}

// ========== NEW: API Check Logic ==========

// Helper function to perform HTTP GET requests using Electron's net module
// (Works reliably even if standard 'fetch' is not available in your Node version)
function safeFetchJson(url) {
    return new Promise((resolve, reject) => {
        const request = net.request(url);
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Status: ${response.statusCode}`));
            }
            let data = '';
            response.on('data', (chunk) => { data += chunk.toString(); });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        request.on('error', (error) => reject(error));
        request.end();
    });
}

async function determineStartPage() {
    console.log("Starting API checks to determine start page...");
    
    // Try up to 5 times (approx 10 seconds total) to let the backend start
    for (let i = 1; i <= 5; i++) {
        try {
            // Wait 2 seconds between attempts
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`API Check Attempt ${i}/5...`);

            // 1. Call DeviceInfo API
            const deviceData = await safeFetchJson('http://localhost:5000/api/DeviceInfo');
            
            if (!deviceData || !deviceData.deviceId) {
                console.log("DeviceInfo returned no deviceId. Defaulting to index.html");
                return 'index.html';
            }

            console.log(`Got Device ID: ${deviceData.deviceId}. Checking User...`);

            // 2. Call CheckUser API
            const userData = await safeFetchJson(`https://api.gignaati.com/api/User/checkUserByDeviceId?deviceId=${deviceData.deviceId}`);

            if (userData && userData.data === true && userData.message) {
                console.log("✅ User Verified! Loading main-screen.html");
                return {
                    page: 'main-screen.html',
                    email: userData.message
                };
            } else {
                console.log("❌ User Not Verified. Loading index.html");
                return {
                    page: 'index.html',
                    email: null
                };
            }

        } catch (error) {
            // If connection failed (backend not up yet), loop and try again
            console.warn(`Attempt ${i} failed: ${error.message}`);
        }
    }

    console.error("All API attempts failed. Defaulting to index.html");
    return 'index.html';
}

// ========== IPC Handlers ==========

// System Detection Handler
ipcMain.handle('detect-system-full', async () => {
  try {
    const SystemDetector = require('./src/main/system-detector');
    const systemDetector = new SystemDetector();
    
    const systemInfo = await systemDetector.detectAll();
    const performance = systemDetector.determinePerformanceTier(systemInfo);
    
    return {
      ...systemInfo,
      performance
    };
  } catch (error) {
    console.error('System detection failed:', error);
    // Return fallback data
    return {
      cpu: { model: 'Unknown CPU', cores: 4, speed: '2.0' },
      gpu: { model: 'Unknown GPU', vram: 0, type: 'cpu', vendor: 'unknown' },
      memory: { total: 8, free: 4, used: 4, usagePercent: 50 },
      performance: {
        tier: 'STANDARD',
        recommendedModels: ['gemma2:2b', 'qwen2:1.5b'],
        maxModelSize: '7B',
        performance: { category: 'Moderate', tokensPerSec: '10-20', description: 'Standard performance' }
      }
    };
  }
});

// Open external link
ipcMain.handle('open-external-link', async (event, url) => {
    if (url) {
        await shell.openExternal(url);
    }
});

// Open n8n in a new window
ipcMain.handle('open-n8n-window', async () => {
    const n8nWin = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'gig.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    
    // Show loading message while N8N loads
    n8nWin.loadURL('data:text/html,<html><body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#f5f5f5;"><div style="text-align:center;"><div style="font-size:24px;margin-bottom:20px;">🔄 Loading N8N...</div><div style="font-size:14px;color:#666;">Please wait while we prepare your workspace</div></div></body></html>');
    
    // Wait a moment then load actual N8N
    setTimeout(() => {
        n8nWin.loadURL('http://localhost:5678');
    }, 2000);
    
    // n8nWin.webContents.openDevTools();
});

// Download LLM model
ipcMain.handle('download-llm-model', async (event, modelName) => {
    const OllamaManager = require('./src/main/ollama-manager');
    const ollamaManager = new OllamaManager();
    
    try {
        await ollamaManager.downloadModel(modelName, (progress, message, details) => {
            event.sender.send('model-download-progress', { modelName, progress, message, details });
        });
        return { success: true, modelName };
    } catch (error) {
        console.error(`Failed to download model ${modelName}:`, error);
        throw error;
    }
});

// Cancel LLM model download
ipcMain.handle('cancel-model-download', async (event, modelName) => {
    const OllamaManager = require('./src/main/ollama-manager');
    const ollamaManager = new OllamaManager();
    
    try {
        const result = ollamaManager.cancelDownload(modelName);
        return result;
    } catch (error) {
        console.error(`Failed to cancel download of ${modelName}:`, error);
        throw error;
    }
});

// List installed LLM models
ipcMain.handle('list-llm-models', async () => {
    const OllamaManager = require('./src/main/ollama-manager');
    const ollamaManager = new OllamaManager();
    
    try {
        const models = await ollamaManager.listModels();
        return { success: true, models };
    } catch (error) {
        console.error('Failed to list models:', error);
        throw error;
    }
});

// Cancel installation handler
ipcMain.on('cancel-installation', () => {
    console.log('Installation cancelled by user');
    // TODO: Add logic to cancel ongoing Ollama/N8N installations
    // For now, just close the app
    app.quit();
});

// Close app handler
ipcMain.on('close-app', () => {
    console.log('Closing app as requested');
    app.quit();
});

// ========== Main Window Creation ==========

// UPDATED: Now accepts a page info object with filename and email
function createWindow(pageInfo) {
    if (isMainWindowCreated) return;
    isMainWindowCreated = true;

    // Handle both string and object parameters for backward compatibility
    const filename = typeof pageInfo === 'string' ? pageInfo : pageInfo.page;
    const email = typeof pageInfo === 'object' ? pageInfo.email : null;

    console.log(`Creating main window with: ${filename}, email: ${email || 'none'}`);

    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        icon: path.join(__dirname, 'gig.ico'),
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
            webviewTag: true
        }
    });

    // Session fix for iframes (n8n)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders && details.responseHeaders['Set-Cookie']) {
            const modifiedCookies = details.responseHeaders['Set-Cookie'].map(cookie => {
                if (details.url.startsWith('http://localhost')) {
                    return cookie.replace(/; SameSite=Lax/ig, '; SameSite=None; Secure')
                                 .replace(/; SameSite=Strict/ig, '; SameSite=None; Secure');
                }
                return cookie;
            });
            details.responseHeaders['Set-Cookie'] = modifiedCookies;
        }
        callback({ responseHeaders: details.responseHeaders });
    });
    
    // Load the determined file with email parameter if available
    if (email && filename === 'main-screen.html') {
        mainWindow.loadFile(filename, { query: { email: email } });
    } else {
        mainWindow.loadFile(filename);
    }
    
    mainWindow.once('ready-to-show', () => {
        closeLoadingWindow();
        mainWindow.maximize();
        mainWindow.show();
    });
}

// ========== Backend Process ==========
function startBackend() {
    const backendPath = isDev
        ? path.join(__dirname, 'resources', 'backend', 'GignaatiWorkbenchService.exe')
        : path.join(process.resourcesPath, 'backend', 'GignaatiWorkbenchService.exe');
    
    console.log("Starting backend path:", backendPath);
    backendProcess = spawn(backendPath, [], { stdio: 'pipe', detached: false });
    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
}

// ========== App Lifecycle ==========

app.whenReady().then(async () => {
    // 1. Show loading screen immediately
    createLoadingWindow();
    
    // 2. Start the backend
    startBackend();

    // 3. Determine which page to load (waits for backend APIs)
    // This might take a few seconds while the backend starts up.
    // The loading screen will stay visible during this time.
    const startPage = await determineStartPage();

    // 4. Open the correct window
    createWindow(startPage);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow('index.html'); // Default if re-activated
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill('SIGTERM');
    }
});