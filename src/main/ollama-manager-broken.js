// src/main/ollama-manager.js - FIXED VERSION
const { execFile, spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const os = require('os');

class OllamaManager {
  constructor() {
    this.platform = process.platform;
    this.ollamaExePath = this.getOllamaExePath();
    
    // Cross-platform Ollama installation paths
    if (process.platform === 'win32') {
      this.ollamaInstallPath = path.join(
        process.env.LOCALAPPDATA || 'C:\\Users\\Public',
        'Programs',
        'Ollama',
        'ollama.exe'
      );
    } else if (process.platform === 'darwin') {
      // macOS
      this.ollamaInstallPath = '/usr/local/bin/ollama';
    } else {
      // Linux
      this.ollamaInstallPath = '/usr/local/bin/ollama';
    }
    
    this.currentProcess = null;
    this.cpuCores = os.cpus().length;
  }

  getOllamaExePath() {
    // Detect correct location whether dev or packaged
    const isDev = !app.isPackaged;
    const baseDir = isDev
      ? path.join(__dirname, '../../resources/binaries')
      : path.join(process.resourcesPath, 'binaries');
    
    if (process.platform === 'win32') {
      return path.join(baseDir, 'OllamaSetup.exe');
    } else if (process.platform === 'darwin') {
      return path.join(baseDir, 'Ollama.dmg');
    } else {
      return path.join(baseDir, 'ollama-linux');
    }
  }

  isOllamaInstalled() {
    return fs.existsSync(this.ollamaInstallPath);
  }

  async isOllamaRunning() {
    const net = require('net');
    const host = '127.0.0.1';
    const port = 11434;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000); // Increased timeout
      
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    async installOllama(progressCallback) {
    try {
      // Check if already installed
      if (this.isOllamaInstalled()) {
        progressCallback && progressCallback(100, 'AI Brain already installed');
        return;
      }

      progressCallback && progressCallback(0, 'Preparing AI Brain installation...');

      // Download installer if not exists
      if (!fs.existsSync(this.ollamaExePath)) {
        progressCallback && progressCallback(5, 'Downloading AI Brain installer...');
        await this.downloadOllamaInstaller(progressCallback);
      }

      if (process.platform === 'win32') {
        // Windows SILENT installation (no popup window)
        progressCallback && progressCallback(10, 'Installing AI Brain silently...');t new Promise((resolve, reject) => {
          // Use /VERYSILENT /SUPPRESSMSGBOXES /NORESTART for completely silent install
          const installer = spawn(this.ollamaExePath, [
            '/VERYSILENT',      // No UI
            '/SUPPRESSMSGBOXES', // No message boxes
            '/NORESTART',        // Don't restart
            '/SP-'               // Skip startup prompt
          ], {
            detached: false,     // Keep attached to track progress
            windowsHide: true,   // Hide console window
            stdio: ['ignore', 'pipe', 'pipe']
          });
          
          let installProgress = 10;
          
          // Simulate progress while installer runs
          const progressInterval = setInterval(() => {
            if (installProgress < 90) {
              installProgress += 5;
              progressCallback && progressCallback(installProgress, `Installing AI Brain... ${installProgress}%`);
            }
          }, 500);
          
          installer.on('exit', (code) => {
            clearInterval(progressInterval);
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Installer exited with code ${code}`));
            }
          });
          
          installer.on('error', (error) => {
            clearInterval(progressInterval);
            reject(error);
          });
        });
      } else if (process.platform === 'darwin') {
        // macOS installation
        progressCallback && progressCallback(20, 'Installing Ollama on macOS...');
        await new Promise((resolve, reject) => {
          exec('curl -fsSL https://ollama.com/install.sh | sh', (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } else {
        // Linux installation
        progressCallback && progressCallback(20, 'Installing Ollama on Linux...');
        await new Promise((resolve, reject) => {
          exec('curl -fsSL https://ollama.com/install.sh | sh', (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      // Wait for installation to complete - INCREASED TIMEOUT
      for (let i = 0; i < 60; i++) { // 2 minutes instead of 1 minute
        if (this.isOllamaInstalled()) {
          progressCallback && progressCallback(100, 'Ollama installation complete');
          return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
        progressCallback && progressCallback(10 + (i * 1.5), `Installing... ${i * 2}s`);
      }

      throw new Error('Ollama installation timed out.');
    } catch (error) {
      console.error('Ollama installation failed:', error);
      throw error;
    }
  }

  async startOllama(env = {}, progressCallback) {
    if (!this.isOllamaInstalled()) {
      throw new Error('Ollama not installed, please install first.');
    }

    // Check if already running
    const alreadyRunning = await this.isOllamaRunning();
    if (alreadyRunning) {
      console.log('Ollama is already running');
      progressCallback && progressCallback(100, 'Ollama is already running');
      return { alreadyRunning: true };
    }

    const ollamaBin = this.ollamaInstallPath;
    
    // Calculate CPU thread limit (50% of available cores)
    const maxCpuThreads = Math.max(1, Math.floor(this.cpuCores * 0.5));
    
    // Configure environment for AGGRESSIVE GPU usage and minimal CPU
    const childEnv = Object.assign({}, process.env, {
      // === CPU LIMITING (50% max) ===
      OLLAMA_NUM_PARALLEL: String(maxCpuThreads),
      OLLAMA_MAX_LOADED_MODELS: '1',
      
      // === AGGRESSIVE GPU OFFLOADING ===
      OLLAMA_GPU_OVERHEAD: '0',        // Prefer GPU immediately (no overhead)
      OLLAMA_GPU_LAYERS: '-1',         // Offload ALL layers to GPU (-1 = all)
      OLLAMA_NUM_GPU: '999',           // Use all available GPUs
      
      // === MEMORY MANAGEMENT ===
      OLLAMA_MAX_VRAM: '0',            // Auto-detect and use ALL available VRAM
      OLLAMA_KEEP_ALIVE: '5m',         // Keep models in VRAM for 5 minutes
      
      // === PERFORMANCE OPTIMIZATION ===
      OLLAMA_FLASH_ATTENTION: '1',     // Enable flash attention (faster inference)
      OLLAMA_NUM_THREAD: String(maxCpuThreads), // Explicit thread limit
      
      ...env
    });

    console.log(`Starting Ollama with ${maxCpuThreads} CPU threads (50% of ${this.cpuCores} cores)`);
    console.log('GPU offloading: ENABLED (all layers will use GPU when available)');
    progressCallback && progressCallback(10, `Starting AI Brain with GPU priority...`);

    const ollamaProcess = spawn(ollamaBin, ['serve'], { 
      env: childEnv, 
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Keep reference so we can stop it later
    this.currentProcess = ollamaProcess;

    let lastStdout = '';
    let lastStderr = '';
    
    if (ollamaProcess.stdout) {
      ollamaProcess.stdout.on('data', (d) => {
        const output = d.toString();
        lastStdout += output;
        console.log('Ollama:', output);
        if (lastStdout.length > 4096) lastStdout = lastStdout.slice(-4096);
        
        // Update progress based on output
        if (output.includes('Listening')) {
          progressCallback && progressCallback(90, 'Ollama server starting...');
        }
      });
    }
    
    if (ollamaProcess.stderr) {
      ollamaProcess.stderr.on('data', (d) => {
        const output = d.toString();
        lastStderr += output;
        console.error('Ollama stderr:', output);
        if (lastStderr.length > 8192) lastStderr = lastStderr.slice(-8192);
      });
    }

    // If process exits early, log it
    ollamaProcess.on('exit', (code, signal) => {
      console.log(`Ollama process exited with code ${code} signal ${signal}`);
      if (code !== 0) {
        console.error('Ollama stdout:', lastStdout);
        console.error('Ollama stderr:', lastStderr);
      }
      this.currentProcess = null;
    });

    // Wait for the Ollama HTTP API port to be ready - INCREASED TIMEOUT
    const net = require('net');
    const host = '127.0.0.1';
    const port = 11434;

    const maxAttempts = 90; // 90 seconds instead of 30 seconds
    const attemptDelay = 1000;

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryConnect = () => {
        attempts += 1;
        const socket = new net.Socket();
        let connected = false;
        socket.setTimeout(3000); // Increased from 2000
        
        socket.once('connect', () => {
          connected = true;
          socket.destroy();
          progressCallback && progressCallback(100, 'Ollama started successfully!');
          console.log('Ollama HTTP API is ready');
          resolve(ollamaProcess);
        });
        
        socket.once('timeout', () => {
          socket.destroy();
        });
        
        socket.once('error', () => {
          socket.destroy();
        });
        
        socket.once('close', () => {
          if (connected) return;
          
          if (attempts >= maxAttempts) {
            const err = new Error('Timed out waiting for Ollama HTTP API to be available');
            err.stdout = lastStdout;
            err.stderr = lastStderr;
            return reject(err);
          }
          
          // Update progress
          const progress = 10 + Math.floor((attempts / maxAttempts) * 80);
          progressCallback && progressCallback(progress, `Waiting for Ollama to start... ${attempts}/${maxAttempts}s`);
          
          setTimeout(tryConnect, attemptDelay);
        });

        socket.connect(port, host);
      };

      // Start first attempt after a longer delay to give the process time to initialize
      setTimeout(tryConnect, 2000); // Increased from 800ms
    });
  }

  async stopOllama() {
    if (this.currentProcess) {
      try {
        // On Windows, .kill() should work for child exe
        this.currentProcess.kill();
        console.log('Ollama process terminated');
      } catch (e) {
        console.warn('Failed to kill Ollama process:', e);
      }
      this.currentProcess = null;
    }
  }

  async downloadModel(modelName, progressCallback, retryCount = 0) {
    if (!this.isOllamaInstalled()) {
      throw new Error('Ollama not installed, please install first.');
    }

    // Check if Ollama is running, start it if not
    const isRunning = await this.isOllamaRunning();
    if (!isRunning) {
      progressCallback && progressCallback(0, 'Starting Ollama service...');
      try {
        await this.startOllama({}, progressCallback);
        progressCallback && progressCallback(5, 'Ollama service started, beginning download...');
      } catch (error) {
        throw new Error(`Failed to start Ollama service: ${error.message}`);
      }
    }

    // Add retry information to progress
    if (retryCount > 0) {
      progressCallback && progressCallback(0, `Retrying download (attempt ${retryCount + 1}/3)...`);
    }

    const ollamaBin = this.ollamaInstallPath;

    return new Promise((resolve, reject) => {
      progressCallback && progressCallback(0, `Starting download of ${modelName}...`);
      
      console.log(`Starting Ollama download: ${ollamaBin} pull ${modelName}`);
      
      const ollamaProcess = spawn(ollamaBin, ['pull', modelName], { 
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let lastOutput = '';
      let downloadStarted = false;
      let lastProgress = 0;
      let downloadedBytes = 0;
      let totalBytes = 0;
      let downloadSpeed = 0;
      let startTime = Date.now();
      let lastUpdateTime = Date.now();
      let lastDownloadedBytes = 0;
      
      // Set timeout for download (30 minutes)
      const downloadTimeout = setTimeout(() => {
        ollamaProcess.kill();
        reject(new Error(`Download timeout after 30 minutes for model: ${modelName}`));
      }, 30 * 60 * 1000);
      
      ollamaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        lastOutput += output;
        console.log('Ollama stdout:', output);
        
        // Parse Ollama's detailed progress output
        // Format: "pulling <hash>... 100% ▕████████████████▏ 1.7 GB/1.7 GB  50 KB/s  6m24s"
        
        if (output.includes('pulling manifest')) {
          progressCallback && progressCallback(5, 'Pulling manifest...', { stage: 'manifest' });
          downloadStarted = true;
        } else if (output.includes('verifying sha256')) {
          progressCallback && progressCallback(90, 'Verifying integrity...', { stage: 'verify' });
        } else if (output.includes('writing manifest')) {
          progressCallback && progressCallback(95, 'Finalizing...', { stage: 'finalize' });
        } else if (output.includes('success')) {
          clearTimeout(downloadTimeout);
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
          progressCallback && progressCallback(100, `Downloaded successfully in ${totalTime}s`, { stage: 'complete' });
        } else {
          // Parse detailed progress: "100% ▕████████████████▏ 1.7 GB/1.7 GB  50 KB/s  6m24s"
          const progressMatch = output.match(/(\d+)%/);
          const sizeMatch = output.match(/([\d.]+\s*[KMGT]?B)\/([\d.]+\s*[KMGT]?B)/);
          const speedMatch = output.match(/([\d.]+\s*[KMGT]?B\/s)/);
          const etaMatch = output.match(/(\d+[hms]\d*[ms]?\d*[s]?)/);
          
          if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            if (progress > lastProgress) {
              lastProgress = progress;
              
              let message = `Downloading... ${progress}%`;
              let details = {};
              
              if (sizeMatch) {
                const downloaded = sizeMatch[1];
                const total = sizeMatch[2];
                message = `${downloaded} / ${total}`;
                details.downloaded = downloaded;
                details.total = total;
              }
              
              if (speedMatch) {
                const speed = speedMatch[1];
                message += ` • ${speed}`;
                details.speed = speed;
              }
              
              if (etaMatch) {
                const eta = etaMatch[1];
                message += ` • ${eta} remaining`;
                details.eta = eta;
              }
              
              details.progress = progress;
              details.stage = 'downloading';
              
              progressCallback && progressCallback(progress, message, details);
            }
          }
        }
      });

      ollamaProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Ollama stderr:', error);
        
        // Check for specific error conditions
        if (error.includes('model not found') || error.includes('no such file')) {
          clearTimeout(downloadTimeout);
          reject(new Error(`Model '${modelName}' not found. Please check the model name.`));
        } else if (error.includes('TLS handshake timeout') || error.includes('timeout')) {
          clearTimeout(downloadTimeout);
          if (retryCount < 2) {
            console.log(`Network timeout, retrying download (attempt ${retryCount + 2}/3)...`);
            setTimeout(() => {
              this.downloadModel(modelName, progressCallback, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 5000);
          } else {
            reject(new Error(`Download failed after 3 attempts: Network timeout`));
          }
        } else if (error.includes('disk') || error.includes('space')) {
          clearTimeout(downloadTimeout);
          reject(new Error(`Insufficient disk space to download ${modelName}`));
        } else if (error.includes('permission') || error.includes('access denied')) {
          clearTimeout(downloadTimeout);
          reject(new Error(`Permission denied while downloading ${modelName}. Please run as administrator.`));
        } else if (error.includes('error') || error.includes('failed')) {
          clearTimeout(downloadTimeout);
          reject(new Error(`Download failed: ${error}`));
        }
      });

      ollamaProcess.on('close', (code) => {
        clearTimeout(downloadTimeout);
        console.log(`Ollama process exited with code: ${code}`);
        
        if (code === 0) {
          progressCallback && progressCallback(100, `Successfully downloaded ${modelName}`);
          resolve();
        } else {
          reject(new Error(`Download failed with exit code ${code}. Output: ${lastOutput}`));
        }
      });

      ollamaProcess.on('error', (error) => {
        clearTimeout(downloadTimeout);
        console.error('Ollama process error:', error);
        
        if (error.code === 'ENOENT') {
          reject(new Error(`Ollama executable not found at ${ollamaBin}. Please reinstall Ollama.`));
        } else if (error.code === 'EACCES') {
          reject(new Error(`Permission denied to run Ollama. Please run as administrator.`));
        } else {
          reject(new Error(`Failed to start download process: ${error.message}`));
        }
      });
    });
  }

  async listModels() {
    if (!this.isOllamaInstalled()) {
      throw new Error('Ollama not installed, please install first.');
    }

    const ollamaBin = this.ollamaInstallPath;

    return new Promise((resolve, reject) => {
      const ollamaProcess = spawn(ollamaBin, ['list'], { 
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      
      ollamaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ollamaProcess.stderr.on('data', (data) => {
        console.error('Ollama stderr:', data.toString());
      });

      ollamaProcess.on('close', (code) => {
        if (code === 0) {
          // Parse the output to extract model names
          const lines = output.split('\n').filter(line => line.trim());
          const models = lines.slice(1).map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              name: parts[0],
              size: parts[1] || 'Unknown',
              modified: parts.slice(2).join(' ') || 'Unknown'
            };
          });
          resolve(models);
        } else {
          reject(new Error(`Failed to list models with exit code ${code}`));
        }
      });

      ollamaProcess.on('error', (error) => {
        reject(new Error(`Failed to list models: ${error.message}`));
      });
    });
  }
}

module.exports = OllamaManager;

