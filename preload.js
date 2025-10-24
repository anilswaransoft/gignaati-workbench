// preload.js - FIXED VERSION with Loading Screen Support
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing APIs
  openDockerDesktop: () => ipcRenderer.invoke('open-docker-desktop'),
  checkDockerInstalled: () => ipcRenderer.invoke('check-docker-installed'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  detectSystemFull: () => ipcRenderer.invoke('detect-system-full'),
  openN8NWindow: () => ipcRenderer.invoke('open-n8n-window'),
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  
  // Installation APIs
  installOllama: () => ipcRenderer.invoke('install-ollama'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  setupN8N: () => ipcRenderer.invoke('setup-n8n'),
  startN8N: () => ipcRenderer.invoke('start-n8n'),
  
  // Model management
  downloadModel: (modelName) => ipcRenderer.invoke('download-llm-model', modelName),
  cancelDownload: (modelName) => ipcRenderer.invoke('cancel-model-download', modelName),
  listModels: () => ipcRenderer.invoke('list-llm-models'),
  
  // Progress updates
  onProgress: (callback) => ipcRenderer.on('installation-progress', (_event, data) => callback(data)),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (_event, data) => callback(data)),
  removeProgressListener: () => ipcRenderer.removeAllListeners('progress-update'),
  
  // Loading screen specific
  onLoadingProgress: (callback) => {
    ipcRenderer.on('loading-progress', (_event, progress, message) => {
      callback(progress, message);
    });
  },
  loadingComplete: () => {
    // Notify main process that loading is complete
    ipcRenderer.send('loading-complete');
  },
  cancelInstallation: () => {
    ipcRenderer.send('cancel-installation');
  },
  closeApp: () => {
    ipcRenderer.send('close-app');
  },
  
  // Ollama progress
  onOllamaInstallProgress: (callback) => {
    ipcRenderer.on('ollama-install-progress', (_event, progress, message) => {
      callback(progress, message);
    });
  },
  onOllamaStartProgress: (callback) => {
    ipcRenderer.on('ollama-start-progress', (_event, progress, message) => {
      callback(progress, message);
    });
  },
  
  // N8N progress
  onN8NStartProgress: (callback) => {
    ipcRenderer.on('n8n-start-progress', (_event, progress, message) => {
      callback(progress, message);
    });
  },
  onN8NReadyProgress: (callback) => {
    ipcRenderer.on('n8n-ready-progress', (_event, progress, message) => {
      callback(progress, message);
    });
  },
  
  // Model download progress
  onModelDownloadProgress: (callback) => {
    ipcRenderer.on('model-download-progress', (_event, data) => {
      callback(data);
    });
  }
});

