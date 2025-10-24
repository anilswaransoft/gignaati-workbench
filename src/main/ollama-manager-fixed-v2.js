const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { app } = require('electron');

class OllamaManager {
  constructor() {
    this.ollamaInstallPath = this.getOllamaInstallPath();
    this.cpuCores = os.cpus().length;
    this.ollamaProcess = null;
  }

  getOllamaInstallPath() {
    if (process.platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe');
    } else if (process.platform === 'darwin') {
      return '/usr/local/bin/ollama';
    } else {
      return '/usr/local/bin/ollama';
    }
  }

  isOllamaInstalled() {
    return fs.existsSync(this.ollamaInstallPath);
  }

  async isOllamaRunning(host = 'localhost', port = 11434) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(2000);
      
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
    });
  }

  async downloadFile(url, dest, progressCallback) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          return this.downloadFile(response.headers.location, dest, progressCallback)
            .then(resolve)
            .catch(reject);
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = (downloadedSize / totalSize) * 100;
          if (progressCallback) {
            progressCallback(Math.floor(progress), `Downloading... ${Math.floor(progress)}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }

  async installOllama(progressCallback) {
    try {
      // Check if already installed
      if (this.isOllamaInstalled()) {
        progressCallback && progressCallback(100, 'AI Brain already installed');
        return;
      }

      progressCallback && progressCallback(0, 'Preparing AI Brain installation...');

      if (process.platform === 'win32') {
        // Windows: Use official install script
        progressCallback && progressCallback(10, 'Downloading AI Brain installer...');
        
        await new Promise((resolve, reject) => {
          // Use PowerShell to download and run installer silently
          const psCommand = `
            $ProgressPreference = 'SilentlyContinue';
            Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "$env:TEMP\\OllamaSetup.exe";
            Start-Process -FilePath "$env:TEMP\\OllamaSetup.exe" -ArgumentList "/VERYSILENT","/SUPPRESSMSGBOXES","/NORESTART","/SP-" -Wait;
            Remove-Item "$env:TEMP\\OllamaSetup.exe" -Force;
          `;
          
          const installer = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psCommand
          ], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
          });
          
          let installProgress = 10;
          
          // Simulate progress
          const progressInterval = setInterval(() => {
            if (installProgress < 90) {
              installProgress += 5;
              progressCallback && progressCallback(installProgress, `Installing AI Brain... ${installProgress}%`);
            }
          }, 1000);
          
          installer.stdout.on('data', (data) => {
            console.log(`Installer: ${data}`);
          });
          
          installer.stderr.on('data', (data) => {
            console.error(`Installer error: ${data}`);
          });
          
          installer.on('exit', (code) => {
            clearInterval(progressInterval);
            if (code === 0 || code === null) {
              progressCallback && progressCallback(100, 'AI Brain installed successfully');
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
        // macOS: Use official install script
        progressCallback && progressCallback(20, 'Installing AI Brain on macOS...');
        await new Promise((resolve, reject) => {
          exec('curl -fsSL https://ollama.com/install.sh | sh', (error, stdout, stderr) => {
            if (error) {
              console.error('macOS install error:', stderr);
              reject(error);
            } else {
              console.log('macOS install output:', stdout);
              resolve();
            }
          });
        });
        
      } else {
        // Linux: Use official install script
        progressCallback && progressCallback(20, 'Installing AI Brain on Linux...');
        await new Promise((resolve, reject) => {
          exec('curl -fsSL https://ollama.com/install.sh | sh', (error, stdout, stderr) => {
            if (error) {
              console.error('Linux install error:', stderr);
              reject(error);
            } else {
              console.log('Linux install output:', stdout);
              resolve();
            }
          });
        });
      }

      // Wait for installation to complete
      for (let i = 0; i < 30; i++) {
        if (this.isOllamaInstalled()) {
          progressCallback && progressCallback(100, 'AI Brain installation complete');
          return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      throw new Error('AI Brain installation timed out.');
    } catch (error) {
      console.error('AI Brain installation failed:', error);
      throw error;
    }
  }

  async startOllama(env = {}, progressCallback) {
    if (!this.isOllamaInstalled()) {
      throw new Error('AI Brain not installed, please install first.');
    }

    // Check if already running
    const alreadyRunning = await this.isOllamaRunning();
    if (alreadyRunning) {
      console.log('AI Brain is already running');
      progressCallback && progressCallback(100, 'AI Brain is already running');
      return { alreadyRunning: true };
    }

    const ollamaBin = this.ollamaInstallPath;
    
    // Calculate CPU thread limit (50% of available cores)
    const maxCpuThreads = Math.max(1, Math.floor(this.cpuCores * 0.5));
    
    // Configure environment for GPU usage and CPU limiting
    const childEnv = Object.assign({}, process.env, {
      OLLAMA_NUM_PARALLEL: String(maxCpuThreads),
      OLLAMA_MAX_LOADED_MODELS: '1',
      OLLAMA_GPU_OVERHEAD: '0',
      OLLAMA_GPU_LAYERS: '-1',
      OLLAMA_NUM_GPU: '999',
      OLLAMA_MAX_VRAM: '0',
      OLLAMA_HOST: '0.0.0.0:11434',
      ...env
    });

    progressCallback && progressCallback(10, 'Starting AI Brain...');

    return new Promise((resolve, reject) => {
      this.ollamaProcess = spawn(ollamaBin, ['serve'], {
        env: childEnv,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.ollamaProcess.stdout.on('data', (data) => {
        console.log(`Ollama: ${data}`);
      });

      this.ollamaProcess.stderr.on('data', (data) => {
        console.log(`Ollama: ${data}`);
      });

      this.ollamaProcess.on('error', (error) => {
        console.error('Failed to start Ollama:', error);
        reject(error);
      });

      // Wait for Ollama to be ready
      const checkReady = async () => {
        for (let i = 0; i < 45; i++) { // 90 seconds timeout
          const running = await this.isOllamaRunning();
          if (running) {
            progressCallback && progressCallback(100, 'AI Brain started with CPU/GPU');
            resolve({ success: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
          progressCallback && progressCallback(10 + (i * 2), `Starting AI Brain... ${i * 2}s`);
        }
        reject(new Error('Timed out waiting for AI Brain HTTP API to be available'));
      };

      checkReady();
    });
  }

  async downloadModel(modelName, progressCallback) {
    if (!await this.isOllamaRunning()) {
      throw new Error('AI Brain is not running. Please start it first.');
    }

    return new Promise((resolve, reject) => {
      const pullProcess = spawn(this.ollamaInstallPath, ['pull', modelName], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let lastProgress = 0;
      let downloadedSize = 0;
      let totalSize = 0;
      let startTime = Date.now();

      pullProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Pull output: ${output}`);

        // Parse progress from ollama pull output
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          if (progress !== lastProgress) {
            lastProgress = progress;
            
            // Calculate speed and ETA
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = downloadedSize / elapsed;
            const remaining = totalSize - downloadedSize;
            const eta = remaining / speed;

            progressCallback && progressCallback(
              progress,
              `Downloading ${modelName}...`,
              {
                downloaded: `${(downloadedSize / 1024 / 1024).toFixed(1)} MB`,
                total: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
                speed: `${(speed / 1024 / 1024).toFixed(1)} MB/s`,
                eta: eta > 0 ? `${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s` : 'Calculating...',
                stage: 'downloading'
              }
            );
          }
        }

        // Parse size info
        const sizeMatch = output.match(/(\d+\.?\d*)\s*([KMG]B)\s*\/\s*(\d+\.?\d*)\s*([KMG]B)/);
        if (sizeMatch) {
          downloadedSize = this.parseSize(sizeMatch[1], sizeMatch[2]);
          totalSize = this.parseSize(sizeMatch[3], sizeMatch[4]);
        }
      });

      pullProcess.stderr.on('data', (data) => {
        console.error(`Pull error: ${data}`);
      });

      pullProcess.on('exit', (code) => {
        if (code === 0) {
          progressCallback && progressCallback(100, `${modelName} downloaded successfully`, { stage: 'complete' });
          resolve();
        } else {
          reject(new Error(`Model download failed with code ${code}`));
        }
      });

      pullProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseSize(value, unit) {
    const num = parseFloat(value);
    switch (unit.toUpperCase()) {
      case 'KB': return num * 1024;
      case 'MB': return num * 1024 * 1024;
      case 'GB': return num * 1024 * 1024 * 1024;
      default: return num;
    }
  }

  async listModels() {
    if (!await this.isOllamaRunning()) {
      throw new Error('AI Brain is not running');
    }

    return new Promise((resolve, reject) => {
      exec(`"${this.ollamaInstallPath}" list`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n').slice(1); // Skip header
        const models = lines
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              name: parts[0],
              size: parts[1] || 'Unknown'
            };
          });

        resolve(models);
      });
    });
  }

  stopOllama() {
    if (this.ollamaProcess) {
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
    }
  }
}

module.exports = OllamaManager;

