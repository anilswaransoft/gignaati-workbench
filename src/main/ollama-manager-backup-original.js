// // src/main/ollama-manager.js
// const { execFile } = require('child_process');
// const path = require('path');
// const fs = require('fs');
// const { app } = require('electron');

// class OllamaManager {
//   constructor() {
//     this.platform = process.platform;
//     this.ollamaExePath = this.getOllamaExePath();
//     this.ollamaInstallPath = path.join(
//       process.env.LOCALAPPDATA || 'C:\\Users\\Public',
//       'Programs',
//       'Ollama',
//       'ollama.exe'
//     );
//   }

//   getOllamaExePath() {
//     // Detect correct location whether dev or packaged
//     const isDev = !app.isPackaged;
//     const baseDir = isDev
//       ? path.join(__dirname, '../../resources/binaries')
//       : path.join(process.resourcesPath, 'binaries');
//     return path.join(baseDir, 'OllamaSetup.exe');
//   }

//   isOllamaInstalled() {
//     return fs.existsSync(this.ollamaInstallPath);
//   }

//   async isOllamaRunning() {
//     const net = require('net');
//     const host = '127.0.0.1';
//     const port = 11434;

//     return new Promise((resolve) => {
//       const socket = new net.Socket();
//       socket.setTimeout(2000);
      
//       socket.once('connect', () => {
//         socket.destroy();
//         resolve(true);
//       });
      
//       socket.once('timeout', () => {
//         socket.destroy();
//         resolve(false);
//       });
      
//       socket.once('error', () => {
//         socket.destroy();
//         resolve(false);
//       });
      
//       socket.connect(port, host);
//     });
//   }

//   async installOllama(progressCallback) {
//     if (this.isOllamaInstalled()) {
//       progressCallback && progressCallback(100, 'Ollama already installed');
//       return true;
//     }
//     progressCallback && progressCallback(10, 'Launching Ollama installer...');
    
//     try {
//       // Run pre-bundled installer silently (/S flag)
//       await new Promise((resolve, reject) => {
//         execFile(this.ollamaExePath, ['/S'], { detached: true }, (error) => {
//           if (error) {
//             reject(error);
//           } else resolve();
//         });
//       });

//       // Wait for installation to complete
//       for (let i = 0; i < 30; i++) {
//         if (this.isOllamaInstalled()) {
//           progressCallback && progressCallback(100, 'Ollama installation complete');
//           return true;
//         }
//         await new Promise((r) => setTimeout(r, 2000));
//       }

//       throw new Error('Ollama installation timed out.');
//     } catch (error) {
//       console.error('Ollama installation failed:', error);
//       throw error;
//     }
//   }

//   async startOllama(env = {}) {
//     const { spawn } = require('child_process');
//     if (!this.isOllamaInstalled()) {
//       throw new Error('Ollama not installed, please install first.');
//     }

//     const ollamaBin = this.ollamaInstallPath;
//     // Ensure child process inherits the current env plus any overrides
//     const childEnv = Object.assign({}, process.env, env);

//     const ollamaProcess = spawn(ollamaBin, ['serve'], { env: childEnv, detached: true });
//     // Keep reference so we can stop it later
//     this.currentProcess = ollamaProcess;

//     let lastStdout = '';
//     let lastStderr = '';
//     if (ollamaProcess.stdout) {
//       ollamaProcess.stdout.on('data', (d) => {
//         lastStdout += d.toString();
//         // keep only last few KB
//         if (lastStdout.length > 4096) lastStdout = lastStdout.slice(-4096);
//       });
//     }
//     if (ollamaProcess.stderr) {
//       ollamaProcess.stderr.on('data', (d) => {
//         lastStderr += d.toString();
//         if (lastStderr.length > 8192) lastStderr = lastStderr.slice(-8192);
//       });
//     }

//     // If process exits early, reject with captured output for diagnostics
//     ollamaProcess.on('exit', (code, signal) => {
//       if (code !== 0) {
//         const err = new Error(`Ollama process exited with code ${code} signal ${signal}`);
//         err.stdout = lastStdout;
//         err.stderr = lastStderr;
//         // Emit on next tick to avoid swallowing later listeners
//         setTimeout(() => {
//           // if promise still pending, reject via stored reject
//         }, 0);
//       }
//     });

//     // Wait for the Ollama HTTP API port to be ready by polling TCP port
//     const net = require('net');
//     const host = '127.0.0.1';
//     const port = 11434;

//     const maxAttempts = 30; // ~30 seconds
//     const attemptDelay = 1000;

//     return new Promise((resolve, reject) => {
//       let attempts = 0;

//       const tryConnect = () => {
//         attempts += 1;
//         const socket = new net.Socket();
//         let connected = false;
//         socket.setTimeout(2000);
//         socket.once('connect', () => {
//           connected = true;
//           socket.destroy();
//           resolve(ollamaProcess);
//         });
//         socket.once('timeout', () => {
//           socket.destroy();
//         });
//         socket.once('error', () => {
//           socket.destroy();
//         });
//         socket.once('close', () => {
//           if (connected) return;
//           if (attempts >= maxAttempts) {
//             const err = new Error('Timed out waiting for Ollama HTTP API to be available');
//             err.stdout = lastStdout;
//             err.stderr = lastStderr;
//             return reject(err);
//           }
//           setTimeout(tryConnect, attemptDelay);
//         });

//         socket.connect(port, host);
//       };

//       // Start first attempt after a short delay to give the process time to initialize
//       setTimeout(tryConnect, 800);
//     });
//   }

//   async stopOllama() {
//     if (this.currentProcess) {
//       try {
//         // On Windows, .kill() should work for child exe
//         this.currentProcess.kill();
//       } catch (e) {
//         console.warn('Failed to kill Ollama process:', e);
//       }
//       this.currentProcess = null;
//     }
//   }

//   async downloadModel(modelName, progressCallback, retryCount = 0) {
//     if (!this.isOllamaInstalled()) {
//       throw new Error('Ollama not installed, please install first.');
//     }

//     // Check if Ollama is running, start it if not
//     const isRunning = await this.isOllamaRunning();
//     if (!isRunning) {
//       progressCallback && progressCallback(0, 'Starting Ollama service...');
//       try {
//         await this.startOllama({});
//         progressCallback && progressCallback(5, 'Ollama service started, beginning download...');
//       } catch (error) {
//         throw new Error(`Failed to start Ollama service: ${error.message}`);
//       }
//     }

//     // Add retry information to progress
//     if (retryCount > 0) {
//       progressCallback && progressCallback(0, `Retrying download (attempt ${retryCount + 1}/3)...`);
//     }

//     const { spawn } = require('child_process');
//     const ollamaBin = this.ollamaInstallPath;

//     return new Promise((resolve, reject) => {
//       progressCallback && progressCallback(0, `Starting download of ${modelName}...`);
      
//       console.log(`Starting Ollama download: ${ollamaBin} pull ${modelName}`);
      
//       const ollamaProcess = spawn(ollamaBin, ['pull', modelName], { 
//         detached: false,
//         stdio: ['pipe', 'pipe', 'pipe'],
//         env: { ...process.env }
//       });

//       let lastOutput = '';
//       let downloadStarted = false;
//       let lastProgress = 0;
      
//       // Set timeout for download (30 minutes)
//       const downloadTimeout = setTimeout(() => {
//         ollamaProcess.kill();
//         reject(new Error(`Download timeout after 30 minutes for model: ${modelName}`));
//       }, 30 * 60 * 1000);
      
//       ollamaProcess.stdout.on('data', (data) => {
//         const output = data.toString();
//         lastOutput += output;
//         console.log('Ollama stdout:', output);
        
//         // Parse different types of progress indicators
//         if (output.includes('pulling manifest')) {
//           progressCallback && progressCallback(5, `Pulling manifest for ${modelName}...`);
//           downloadStarted = true;
//         } else if (output.includes('pulling layers')) {
//           progressCallback && progressCallback(10, `Pulling layers for ${modelName}...`);
//         } else if (output.includes('verifying sha256')) {
//           progressCallback && progressCallback(90, `Verifying ${modelName}...`);
//         } else if (output.includes('writing manifest')) {
//           progressCallback && progressCallback(95, `Writing manifest for ${modelName}...`);
//         } else if (output.includes('success')) {
//           clearTimeout(downloadTimeout);
//           progressCallback && progressCallback(100, `Successfully downloaded ${modelName}`);
//         } else {
//           // Try to extract percentage from output
//           const progressMatch = output.match(/(\d+)%/);
//           if (progressMatch) {
//             const progress = parseInt(progressMatch[1]);
//             if (progress > lastProgress) {
//               lastProgress = progress;
//               progressCallback && progressCallback(progress, `Downloading ${modelName}: ${progress}%`);
//             }
//           }
//         }
//       });

//       ollamaProcess.stderr.on('data', (data) => {
//         const error = data.toString();
//         console.error('Ollama stderr:', error);
        
//         // Check for specific error conditions
//         if (error.includes('model not found') || error.includes('no such file')) {
//           clearTimeout(downloadTimeout);
//           reject(new Error(`Model '${modelName}' not found. Please check the model name.`));
//         } else if (error.includes('TLS handshake timeout') || error.includes('timeout')) {
//           clearTimeout(downloadTimeout);
//           if (retryCount < 2) {
//             console.log(`Network timeout, retrying download (attempt ${retryCount + 2}/3)...`);
//             setTimeout(() => {
//               this.downloadModel(modelName, progressCallback, retryCount + 1)
//                 .then(resolve)
//                 .catch(reject);
//             }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
//             return;
//           }
//           reject(new Error(`Network timeout while downloading ${modelName} after 3 attempts. This might be due to slow internet connection or network issues. Please check your connection and try again later.`));
//         } else if (error.includes('network') || error.includes('connection') || error.includes('Get "https://registry.ollama.ai')) {
//           clearTimeout(downloadTimeout);
//           if (retryCount < 2) {
//             console.log(`Network error, retrying download (attempt ${retryCount + 2}/3)...`);
//             setTimeout(() => {
//               this.downloadModel(modelName, progressCallback, retryCount + 1)
//                 .then(resolve)
//                 .catch(reject);
//             }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
//             return;
//           }
//           reject(new Error(`Network error while downloading ${modelName} after 3 attempts. Please check your internet connection and try again.`));
//         } else if (error.includes('space') || error.includes('disk')) {
//           clearTimeout(downloadTimeout);
//           reject(new Error(`Insufficient disk space to download ${modelName}. Please free up some space.`));
//         } else if (error.includes('permission') || error.includes('access denied')) {
//           clearTimeout(downloadTimeout);
//           reject(new Error(`Permission denied while downloading ${modelName}. Please run as administrator.`));
//         } else if (error.includes('error') || error.includes('failed')) {
//           clearTimeout(downloadTimeout);
//           reject(new Error(`Download failed: ${error}`));
//         }
//       });

//       ollamaProcess.on('close', (code) => {
//         clearTimeout(downloadTimeout);
//         console.log(`Ollama process exited with code: ${code}`);
        
//         if (code === 0) {
//           progressCallback && progressCallback(100, `Successfully downloaded ${modelName}`);
//           resolve();
//         } else {
//           reject(new Error(`Download failed with exit code ${code}. Output: ${lastOutput}`));
//         }
//       });

//       ollamaProcess.on('error', (error) => {
//         clearTimeout(downloadTimeout);
//         console.error('Ollama process error:', error);
        
//         if (error.code === 'ENOENT') {
//           reject(new Error(`Ollama executable not found at ${ollamaBin}. Please reinstall Ollama.`));
//         } else if (error.code === 'EACCES') {
//           reject(new Error(`Permission denied to run Ollama. Please run as administrator.`));
//         } else {
//           reject(new Error(`Failed to start download process: ${error.message}`));
//         }
//       });
//     });
//   }

//   async listModels() {
//     if (!this.isOllamaInstalled()) {
//       throw new Error('Ollama not installed, please install first.');
//     }

//     const { spawn } = require('child_process');
//     const ollamaBin = this.ollamaInstallPath;

//     return new Promise((resolve, reject) => {
//       const ollamaProcess = spawn(ollamaBin, ['list'], { 
//         detached: false,
//         stdio: ['pipe', 'pipe', 'pipe']
//       });

//       let output = '';
      
//       ollamaProcess.stdout.on('data', (data) => {
//         output += data.toString();
//       });

//       ollamaProcess.stderr.on('data', (data) => {
//         console.error('Ollama stderr:', data.toString());
//       });

//       ollamaProcess.on('close', (code) => {
//         if (code === 0) {
//           // Parse the output to extract model names
//           const lines = output.split('\n').filter(line => line.trim());
//           const models = lines.slice(1).map(line => {
//             const parts = line.trim().split(/\s+/);
//             return {
//               name: parts[0],
//               size: parts[1] || 'Unknown',
//               modified: parts.slice(2).join(' ') || 'Unknown'
//             };
//           });
//           resolve(models);
//         } else {
//           reject(new Error(`Failed to list models with exit code ${code}`));
//         }
//       });

//       ollamaProcess.on('error', (error) => {
//         reject(new Error(`Failed to list models: ${error.message}`));
//       });
//     });
//   }
// }

// module.exports = OllamaManager;


// new--------------------------

// src/main/ollama-manager.js
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class OllamaManager {
  constructor() {
    this.platform = process.platform;
    this.ollamaExePath = this.getOllamaExePath();
    this.ollamaInstallPath = path.join(
      process.env.LOCALAPPDATA || 'C:\\Users\\Public',
      'Programs',
      'Ollama',
      'ollama.exe'
    );
  }

  getOllamaExePath() {
    // Detect correct location whether dev or packaged
    const isDev = !app.isPackaged;
    const baseDir = isDev
      ? path.join(__dirname, '../../resources/binaries')
      : path.join(process.resourcesPath, 'binaries');
    return path.join(baseDir, 'OllamaSetup.exe');
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

  async installOllama(progressCallback) {
    if (this.isOllamaInstalled()) {
      progressCallback && progressCallback(100, 'Ollama already installed');
      return true;
    }
    progressCallback && progressCallback(10, 'Launching Ollama installer...');
    
    try {
      // Run pre-bundled installer silently (/S flag)
      await new Promise((resolve, reject) => {
        execFile(this.ollamaExePath, ['/S'], { detached: true }, (error) => {
          if (error) {
            reject(error);
          } else resolve();
        });
      });

      // Wait for installation to complete
      for (let i = 0; i < 30; i++) {
        if (this.isOllamaInstalled()) {
          progressCallback && progressCallback(100, 'Ollama installation complete');
          return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      throw new Error('Ollama installation timed out.');
    } catch (error) {
      console.error('Ollama installation failed:', error);
      throw error;
    }
  }

  async startOllama(env = {}) {
    const { spawn } = require('child_process');
    if (!this.isOllamaInstalled()) {
      throw new Error('Ollama not installed, please install first.');
    }

    const ollamaBin = this.ollamaInstallPath;
    // Ensure child process inherits the current env plus any overrides
    const childEnv = Object.assign({}, process.env, env);

    const ollamaProcess = spawn(ollamaBin, ['serve'], { env: childEnv, detached: true });
    // Keep reference so we can stop it later
    this.currentProcess = ollamaProcess;

    let lastStdout = '';
    let lastStderr = '';
    if (ollamaProcess.stdout) {
      ollamaProcess.stdout.on('data', (d) => {
        lastStdout += d.toString();
        // keep only last few KB
        if (lastStdout.length > 4096) lastStdout = lastStdout.slice(-4096);
      });
    }
    if (ollamaProcess.stderr) {
      ollamaProcess.stderr.on('data', (d) => {
        lastStderr += d.toString();
        if (lastStderr.length > 8192) lastStderr = lastStderr.slice(-8192);
      });
    }

    // If process exits early, reject with captured output for diagnostics
    ollamaProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        const err = new Error(`Ollama process exited with code ${code} signal ${signal}`);
        err.stdout = lastStdout;
        err.stderr = lastStderr;
        // Emit on next tick to avoid swallowing later listeners
        setTimeout(() => {
          // if promise still pending, reject via stored reject
        }, 0);
      }
    });

    // Wait for the Ollama HTTP API port to be ready by polling TCP port
    const net = require('net');
    const host = '127.0.0.1';
    const port = 11434;

    const maxAttempts = 30; // ~30 seconds
    const attemptDelay = 1000;

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryConnect = () => {
        attempts += 1;
        const socket = new net.Socket();
        let connected = false;
        socket.setTimeout(2000);
        socket.once('connect', () => {
          connected = true;
          socket.destroy();
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
          setTimeout(tryConnect, attemptDelay);
        });

        socket.connect(port, host);
      };

      // Start first attempt after a short delay to give the process time to initialize
      setTimeout(tryConnect, 800);
    });
  }

  async stopOllama() {
    if (this.currentProcess) {
      try {
        // On Windows, .kill() should work for child exe
        this.currentProcess.kill();
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
        await this.startOllama({});
        progressCallback && progressCallback(5, 'Ollama service started, beginning download...');
      } catch (error) {
        throw new Error(`Failed to start Ollama service: ${error.message}`);
      }
    }

    // Add retry information to progress
    if (retryCount > 0) {
      progressCallback && progressCallback(0, `Retrying download (attempt ${retryCount + 1}/3)...`);
    }

    const { spawn } = require('child_process');
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
      
      // Set timeout for download (30 minutes)
      const downloadTimeout = setTimeout(() => {
        ollamaProcess.kill();
        reject(new Error(`Download timeout after 30 minutes for model: ${modelName}`));
      }, 30 * 60 * 1000);
      
      ollamaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        lastOutput += output;
        console.log('Ollama stdout:', output);
        
        // Parse different types of progress indicators
        if (output.includes('pulling manifest')) {
          progressCallback && progressCallback(5, `Pulling manifest for ${modelName}...`);
          downloadStarted = true;
        } else if (output.includes('pulling layers')) {
          progressCallback && progressCallback(10, `Pulling layers for ${modelName}...`);
        } else if (output.includes('verifying sha256')) {
          progressCallback && progressCallback(90, `Verifying ${modelName}...`);
        } else if (output.includes('writing manifest')) {
          progressCallback && progressCallback(95, `Writing manifest for ${modelName}...`);
        } else if (output.includes('success')) {
          clearTimeout(downloadTimeout);
          progressCallback && progressCallback(100, `Successfully downloaded ${modelName}`);
        } else {
          // Try to extract percentage from output
          const progressMatch = output.match(/(\d+)%/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            if (progress > lastProgress) {
              lastProgress = progress;
              progressCallback && progressCallback(progress, `Downloading ${modelName}: ${progress}%`);
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
            }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
            return;
          }
          reject(new Error(`Network timeout while downloading ${modelName} after 3 attempts. This might be due to slow internet connection or network issues. Please check your connection and try again later.`));
        } else if (error.includes('network') || error.includes('connection') || error.includes('Get "https://registry.ollama.ai')) {
          clearTimeout(downloadTimeout);
          if (retryCount < 2) {
            console.log(`Network error, retrying download (attempt ${retryCount + 2}/3)...`);
            setTimeout(() => {
              this.downloadModel(modelName, progressCallback, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
            return;
          }
          reject(new Error(`Network error while downloading ${modelName} after 3 attempts. Please check your internet connection and try again.`));
        } else if (error.includes('space') || error.includes('disk')) {
          clearTimeout(downloadTimeout);
          reject(new Error(`Insufficient disk space to download ${modelName}. Please free up some space.`));
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

    const { spawn } = require('child_process');
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
