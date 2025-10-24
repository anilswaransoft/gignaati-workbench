const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HardwareDetector = require('./hardware-detector');
const OllamaManager = require('./ollama-manager');
const N8NManager = require('./n8n-manager');
const SystemOptimizer = require('./system-optimizer');

let mainWindow = null;
let hardwareInfo = null;
let ollamaManager = null;
let n8nManager = null;
let systemOptimizer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../main/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../../resources/icons/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/wizard/index.html'));
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  setupIPC();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPC() {
  // Hardware detection
  ipcMain.handle('detect-hardware', async () => {
    try {
      const detector = new HardwareDetector();
      hardwareInfo = await detector.detectSystem();
      systemOptimizer = new SystemOptimizer(hardwareInfo);
      return hardwareInfo;
    } catch (error) {
      console.error('Hardware detection failed:', error);
      throw error;
    }
  });

  // Ollama installation
  ipcMain.handle('install-ollama', async () => {
    try {
      ollamaManager = new OllamaManager();
      
      await ollamaManager.installOllama((progress, message) => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('progress-update', {
              step: 'ollama-install',
              progress,
              message
            });
          }
        } catch (e) { console.warn('Failed to send progress-update to renderer:', e && e.message ? e.message : e); }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Ollama installation failed:', error);
      throw error;
    }
  });

  // Start Ollama
  ipcMain.handle('start-ollama', async () => {
    try {
      if (!ollamaManager) {
        ollamaManager = new OllamaManager();
      }
      
      const env = systemOptimizer ? systemOptimizer.generateOllamaEnv() : {};

      try {
        console.log('Attempting to start Ollama with optimized env');
        await ollamaManager.startOllama(env);
        return {
          success: true,
          optimization: systemOptimizer ? systemOptimizer.getOptimizationSummary() : null,
          usedFallback: false
        };
      } catch (firstErr) {
        console.error('Starting Ollama with optimized env failed:', firstErr);
        // Include captured stdout/stderr if present for easier debugging
        if (firstErr.stdout) console.error('Ollama stdout (snippet):', firstErr.stdout);
        if (firstErr.stderr) console.error('Ollama stderr (snippet):', firstErr.stderr);
        // Try a fallback without custom env (helps when GPU/env vars cause startup failure)
        try {
          console.log('Retrying Ollama start without optimization env (fallback)');
          await ollamaManager.startOllama({});
          return {
            success: true,
            optimization: systemOptimizer ? systemOptimizer.getOptimizationSummary() : null,
            usedFallback: true,
            warning: 'Started Ollama without optimization env; GPU acceleration config may be incompatible'
          };
        } catch (secondErr) {
          console.error('Fallback start also failed:', secondErr);
          if (secondErr.stdout) console.error('Ollama stdout (snippet):', secondErr.stdout);
          if (secondErr.stderr) console.error('Ollama stderr (snippet):', secondErr.stderr);
          throw secondErr;
        }
      }
    } catch (error) {
      console.error('Failed to start Ollama:', error);
      throw error;
    }
  });

  // Download model
  ipcMain.handle('download-model', async (event, modelName) => {
    try {
      await ollamaManager.downloadModel(modelName, (progress, message) => {
        mainWindow.webContents.send('progress-update', {
          step: 'model-download',
          model: modelName,
          progress,
          message
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to download model ${modelName}:`, error);
      throw error;
    }
  });

  // List models
  ipcMain.handle('list-models', async () => {
    try {
      const models = await ollamaManager.listModels();
      return models;
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  });

  // Setup N8N
  ipcMain.handle('setup-n8n', async () => {
    try {
      n8nManager = new N8NManager();
      await n8nManager.initialize();
      return { success: true };
    } catch (error) {
      console.error('N8N setup failed:', error);
      throw error;
    }
  });

  // Start N8N
  ipcMain.handle('start-n8n', async () => {
    try {
      if (!n8nManager) {
        n8nManager = new N8NManager();
        await n8nManager.initialize();
      }
      
      mainWindow.webContents.send('progress-update', {
        step: 'n8n-start',
        progress: 50,
        message: 'Starting N8N server...'
      });
        try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('progress-update', { step: 'n8n-start', progress: 50, message: 'Starting N8N server...' }); } catch(e) {}
      
      const startResult = await n8nManager.start();

      // If start() indicated reuse of an existing healthy instance, we can skip waiting
      if (startResult && startResult.reused) {
        console.log('Reused existing N8N instance on port 5678');
        mainWindow.webContents.send('progress-update', {
          step: 'n8n-start',
          progress: 100,
          message: 'Reusing existing N8N instance (port 5678)'
        });
        return { success: true };
      }

      // Increase wait if n8n was started via npx (may need to install packages)
      const isNpx = n8nManager && n8nManager.lastLauncher && n8nManager.lastLauncher.cmd && n8nManager.lastLauncher.cmd.toLowerCase().includes('npx');
      if (isNpx) {
        console.log('Using extended wait for N8N because launcher is npx');
        await n8nManager.waitForN8N(120); // wait up to ~2 minutes (shortened)
      } else {
        await n8nManager.waitForN8N();
      }
      
      mainWindow.webContents.send('progress-update', {
        step: 'n8n-start',
        progress: 100,
        message: 'N8N is ready!'
      });
        try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('progress-update', { step: 'n8n-start', progress: 100, message: 'N8N is ready!' }); } catch(e) {}
      
      return { success: true };
    } catch (error) {
      console.error('Failed to start N8N:', error);
      throw error;
    }
  });

  // Launch app (open N8N in browser)
  ipcMain.handle('launch-app', async () => {
    try {
      // Open N8N in default browser
      const { shell } = require('electron');
      await shell.openExternal('http://localhost:5678');
      
      // Minimize main window
      try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); } catch (e) {}
      
      return { success: true };
    } catch (error) {
      console.error('Failed to launch app:', error);
      throw error;
    }
  });
}

// Cleanup on exit
app.on('before-quit', async () => {
  if (n8nManager) {
    await n8nManager.stop();
  }
  if (ollamaManager) {
    await ollamaManager.stopOllama();
  }
});

// Process-level safety: log uncaught exceptions and unhandled rejections to avoid crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in main process:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason);
});
