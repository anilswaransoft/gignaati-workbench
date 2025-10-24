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
}

module.exports = OllamaManager;
