// electron-main.js - FIXED VERSION with Loading Screen
const { app, BrowserWindow, ipcMain, shell, session } = require('electron'); // ----- FIX 1: Added 'session'
const { spawn, exec } = require('child_process');
const path = require('path');
const si = require('systeminformation');

const isDev = !app.isPackaged;
let backendProcess = null;
let loadingWindow = null;
let mainWindow = null;

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
  
  // Optional: Open DevTools for debugging
  // loadingWindow.webContents.openDevTools();
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

// Installation handlers with progress callbacks
// ipcMain.handle('install-ollama', async (event) => {
//     const OllamaManager = require('./src/main/ollama-manager');
//     const ollamaManager = new OllamaManager();
    
//     try {
//         await ollamaManager.installOllama((progress, message) => {
//             event.sender.send('ollama-install-progress', progress, message);
//             updateLoadingProgress(progress * 0.3, message); // 0-30% of total loading
//         });
//         return { success: true };
//     } catch (error) {
//         console.error('Ollama installation failed:', error);
//         throw error;
//     }
// });

// ipcMain.handle('start-ollama', async (event) => {
//     const OllamaManager = require('./src/main/ollama-manager');
//     const ollamaManager = new OllamaManager();
    
//     try {
//         await ollamaManager.startOllama({}, (progress, message) => {
//             event.sender.send('ollama-start-progress', progress, message);
//             updateLoadingProgress(30 + (progress * 0.3), message); // 30-60% of total loading
//         });
//         return { success: true, optimization: { 
//             accelerationType: 'CPU/GPU',
//             cpuThreads: Math.floor(require('os').cpus().length * 0.5),
//             gpuOffloading: true
//         }};
//     } catch (error) {
//         console.error('Failed to start Ollama:', error);
//         throw error;
//     }
// });

// ipcMain.handle('setup-n8n', async (event) => {
//     const N8NManager = require('./src/main/n8n-manager');
//     const n8nManager = new N8NManager();
    
//     try {
//         await n8nManager.initialize();
//         updateLoadingProgress(65, 'N8N workspace initialized');
//         return { success: true };
//     } catch (error) {
//         console.error('N8N setup failed:', error);
//         throw error;
//     }
// });

// ipcMain.handle('start-n8n', async (event) => {
//     const N8NManager = require('./src/main/n8n-manager');
//     const n8nManager = new N8NManager();
    
//     try {
//         await n8nManager.initialize();
//         updateLoadingProgress(70, 'Starting N8N server...');
        
//         await n8nManager.start((progress, message) => {
//             event.sender.send('n8n-start-progress', progress, message);
//             updateLoadingProgress(70 + (progress * 0.25), message); // 70-95% of total loading
//         });
        
//         // Wait for N8N to be fully ready
//         await n8nManager.waitForN8N(60, (progress, message) => {
//             event.sender.send('n8n-ready-progress', progress, message);
//             updateLoadingProgress(95 + (progress * 0.05), message); // 95-100% of total loading
//         });
        
//         // Auto-configure Ollama credentials in N8N
//         updateLoadingProgress(98, 'Configuring AI Brain integration...');
//         try {
//             const N8NCredentialInjector = require('./src/main/n8n-credential-injector');
//             const credentialInjector = new N8NCredentialInjector();
            
//             // Wait a bit for N8N database to be fully initialized
//             await new Promise(r => setTimeout(r, 3000));
            
//             const result = await credentialInjector.injectOllamaCredentials();
//             if (result.success) {
//                 console.log('✅ Ollama credentials auto-configured in N8N');
//             } else if (result.alreadyExists) {
//                 console.log('ℹ️ Ollama credentials already exist in N8N');
//             } else if (result.needsRetry) {
//                 console.log('⚠️ N8N not fully initialized, credentials will be configured on next launch');
//             }
//         } catch (credError) {
//             console.error('⚠️ Failed to auto-configure Ollama credentials (non-critical):', credError);
//             // Don't fail the entire startup if credential injection fails
//         }
        
//         updateLoadingProgress(100, 'AI Magic added! Ready to go! ✨');
        
//         return { success: true };
//     } catch (error) {
//         console.error('Failed to start N8N:', error);
//         throw error;
//     }
// });

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

// Create main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'gig.ico'),
        show: false, // Don't show until ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Allow loading N8N in iframe
            allowRunningInsecureContent: true, // Allow localhost content
            webviewTag: true // Enable webview support
        }
    });

    // ----- FIX 2: START -----
    // This block intercepts n8n's login cookies and modifies them
    // to work correctly inside the file:// iframe.
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders && details.responseHeaders['Set-Cookie']) {
            const modifiedCookies = details.responseHeaders['Set-Cookie'].map(cookie => {
                // Force cookies from localhost to work in the iframe
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
    // ----- FIX 2: END -----
    
    mainWindow.loadFile('index.html');
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        // Close loading window
        closeLoadingWindow();
        
        // Show main window
        mainWindow.show();
    });
    
    // mainWindow.webContents.openDevTools();
}

// ========== Backend Process ==========
function startBackend() {
    const backendPath = isDev
        ? path.join(__dirname, '..', 'resources', 'backend', 'GignaatiWorkbenchService.exe')
        : path.join(process.resourcesPath, 'backend', 'GignaatiWorkbenchService.exe');

    console.log(`Starting backend from: ${backendPath}`);

    backendProcess = spawn(backendPath, [], {
        stdio: 'pipe',
        detached: false
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend stdout: ${data.toString()}`);
    });
    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend stderr: ${data.toString()}`);
    });
    backendProcess.on('close', (code) => {
        console.log(`Backend exited with code ${code}`);
    });
    backendProcess.on('error', (err) => {
        console.error(`Failed to start backend: ${err.message}`);
    });
}

// ========== Startup Sequence with Loading Screen ==========
async function initializeApp() {
    try {
        updateLoadingProgress(5, 'Initializing application...');
        
        // Start backend if available
        try {
            startBackend();
            updateLoadingProgress(10, 'Backend service started');
        } catch (error) {
            console.warn('Backend service not available:', error);
            updateLoadingProgress(10, 'Continuing without backend service');
        }
        
        // Auto-start Ollama and N8N
        updateLoadingProgress(15, 'Checking Ollama installation...');
        
        const OllamaManager = require('./src/main/ollama-manager');
        const ollamaManager = new OllamaManager();
        
        if (ollamaManager.isOllamaInstalled()) {
            updateLoadingProgress(20, 'Ollama found, starting...');
            
            try {
                await ollamaManager.startOllama({}, (progress, message) => {
                    updateLoadingProgress(20 + (progress * 0.4), message);
                });
                updateLoadingProgress(60, 'Ollama started successfully!');
            } catch (error) {
                console.error('Failed to start Ollama:', error);
                updateLoadingProgress(60, 'Continuing without Ollama');
            }
        } else {
            updateLoadingProgress(60, 'Ollama not installed (will prompt user)');
        }
        
        // Start N8N
        updateLoadingProgress(65, 'Initializing N8N workspace...');
        
        const N8NManager = require('./src/main/n8n-manager');
        const n8nManager = new N8NManager();
        
        try {
            await n8nManager.initialize();
            updateLoadingProgress(70, 'Starting N8N server...');
            
            await n8nManager.start((progress, message) => {
                updateLoadingProgress(70 + (progress * 0.25), message);
            });
            
            updateLoadingProgress(95, 'Waiting for N8N to be ready...');
            
            await n8nManager.waitForN8N(60, (progress, message) => {
                updateLoadingProgress(95 + (progress * 0.05), message);
            });
            
            updateLoadingProgress(100, '✨ AI Magic added! Ready to go!');
        } catch (error) {
            console.error('Failed to start N8N:', error);
            updateLoadingProgress(100, 'Starting without N8N (will prompt user)');
        }
        
        // Wait a moment for user to see completion message
        setTimeout(() => {
            createWindow();
        }, 1500);
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateLoadingProgress(100, 'Starting with limited features');
        
        setTimeout(() => {
            createWindow();
        }, 1500);
    }
}

// ========== App Lifecycle ==========
app.whenReady().then(() => {
    // Show loading screen first
    createLoadingWindow();
    
    // Then initialize everything
    setTimeout(() => {
        initializeApp();
    }, 500);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createLoadingWindow();
            setTimeout(() => {
                initializeApp();
            }, 500);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (backendProcess) {
        console.log('Shutting down backend...');
        backendProcess.kill('SIGTERM');
        backendProcess = null;
    }
});

// ========== Existing IPC Handlers ==========

// // Docker check
// ipcMain.handle('check-docker-installed', async () => {
//     return new Promise((resolve) => {
//         exec('docker info', (error) => {
//             resolve(!error);
//         });
//     });
// });

// Open Docker Desktop
// ipcMain.handle('open-docker-desktop', async () => {
//     const dockerPath = '"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"';
//     exec(dockerPath, (error) => {
//         if (error) {
//             console.error('Failed to open Docker Desktop:', error);
//         } else {
//             console.log('Docker Desktop opened successfully.');
//         }
//     });
// });

// function getCpuUsageWindows() {
//     return new Promise((resolve) => {
//         exec('powershell -command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\').CounterSamples[0].CookedValue"', (error, stdout) => {
//             if (error) {
//                 console.error(`Error getting CPU usage with PowerShell: ${error.message}`);
//                 resolve(0);
//             } else {
//                 const value = parseFloat(stdout.trim());
//                 resolve(isNaN(value) ? 0 : Math.round(value));
//             }
//         });
//     });
// }

// GPU usage (Windows)
// function getGpuUsageWindows() {
//     return new Promise((resolve) => {
//         exec('powershell -command "(Get-Counter \'\\GPU Engine(*)\\Utilization Percentage\').CounterSamples | Measure-Object -Property CookedValue -Sum | Select-Object -ExpandProperty Sum"', (error, stdout) => {
//             if (error) {
//                 console.error(`Error getting GPU usage with PowerShell: ${error.message}`);
//                 resolve(0);
//             } else {
//                 const value = parseFloat(stdout.trim());
//                 resolve(isNaN(value) ? 0 : Math.round(value));
//             }
//         });
//     });
// }

// ipcMain.handle('get-system-stats', async () => {
//     let cpuVal = 0;
//     let ramVal = 0;
//     let gpuVal = 0;
//     const npuVal = 0;

//     try {
//         if (process.platform === 'win32') {
//             cpuVal = await getCpuUsageWindows();
//             gpuVal = await getGpuUsageWindows();
//         } else {
//             const cpuSi = await si.currentLoad();
//             cpuVal = (typeof cpuSi.currentload === 'number' && !isNaN(cpuSi.currentload)) ? Math.round(cpuSi.currentload) : 0;
//             const gpuSi = await si.graphics();
//             if (gpuSi.controllers && gpuSi.controllers.length > 0) {
//                 const gpuController = gpuSi.controllers[0];
//                if (gpuController && typeof gpuController.utilizationGpu === 'number' && !isNaN(gpuController.utilizationGpu)) {
//                     gpuVal = Math.round(gpuController.utilizationGpu);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error('Error fetching system stats (non-RAM):', err);
//     }
    
//     try {
//         const mem = await si.mem();
//         ramVal = (mem.total > 0) ? Math.round((mem.active / mem.total) * 100) : 0;
//     } catch (err) {
//         console.error('Error fetching RAM stats:', err);
//     }
    
//     return {
//         cpu: cpuVal,
//         ram: ramVal,
//         gpu: gpuVal,
//         npu: npuVal
//     };
// });