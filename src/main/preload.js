const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Hardware detection
  detectHardware: () => ipcRenderer.invoke('detect-hardware'),
  
  // Ollama management
  installOllama: () => ipcRenderer.invoke('install-ollama'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  downloadModel: (modelName) => ipcRenderer.invoke('download-model', modelName),
  listModels: () => ipcRenderer.invoke('list-models'),
  
  // N8N management
  setupN8N: () => ipcRenderer.invoke('setup-n8n'),
  startN8N: () => ipcRenderer.invoke('start-n8n'),
  
  // Final launch
  launchApp: () => ipcRenderer.invoke('launch-app'),
  
  // Progress listeners
  onProgress: (callback) => {
    ipcRenderer.on('progress-update', (_event, data) => callback(data));
  },
  
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('progress-update');
  }
});

