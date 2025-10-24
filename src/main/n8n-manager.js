// src/main/n8n-manager.js - FIXED VERSION
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class N8NManager {
  constructor() {
    this.n8nProcess = null;
    this.appDataPath = app.getPath('userData');
    this.n8nDataPath = path.join(this.appDataPath, 'n8n-data');
    this.dbPath = path.join(this.n8nDataPath, 'database.sqlite');
    this.workflowsPath = path.join(this.n8nDataPath, 'workflows');
  }

  async initialize() {
    console.log('Initializing N8N...');
    
    // Create necessary directories
    this.ensureDirectories();
    
    // Copy starter templates if first run
    if (!fs.existsSync(this.dbPath)) {
      await this.copyStarterTemplates();
    }
  }

  ensureDirectories() {
    const dirs = [
      this.n8nDataPath,
      this.workflowsPath,
      path.join(this.n8nDataPath, 'credentials'),
      path.join(this.appDataPath, 'logs')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  }

  async copyStarterTemplates() {
    try {
      const templatesSource = path.join(process.resourcesPath, 'templates', 'starter-workflows');
      const templatesDest = path.join(this.workflowsPath, 'templates');

      if (fs.existsSync(templatesSource)) {
        if (!fs.existsSync(templatesDest)) {
          fs.mkdirSync(templatesDest, { recursive: true });
        }
        
        const files = fs.readdirSync(templatesSource);
        files.forEach(file => {
          const src = path.join(templatesSource, file);
          const dest = path.join(templatesDest, file);
          fs.copyFileSync(src, dest);
          console.log(`Copied template: ${file}`);
        });
      }
    } catch (error) {
      console.error('Failed to copy templates:', error);
    }
  }

  async start(progressCallback) {
    if (this.n8nProcess) {
      console.log('N8N is already running');
      progressCallback && progressCallback(100, 'N8N is already running');
      return this.n8nProcess;
    }

    const net = require('net');
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (error) {
      console.error('Failed to load node-fetch:', error);
      throw new Error('node-fetch dependency is required but not available. Please ensure it is installed correctly.');
    }

    // Helper to check whether a TCP port is open
    const isPortOpen = (port, host = '127.0.0.1', timeout = 1000) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        socket.setTimeout(timeout);
        socket.once('connect', () => {
          settled = true;
          socket.destroy();
          resolve(true);
        });
        socket.once('timeout', () => {
          if (!settled) { settled = true; socket.destroy(); resolve(false); }
        });
        socket.once('error', () => {
          if (!settled) { settled = true; socket.destroy(); resolve(false); }
        });
        socket.connect(port, host);
      });
    };

    // If something is already listening on the N8N port, prefer to reuse it
    try {
      const portInUse = await isPortOpen(5678, '127.0.0.1', 800);
      if (portInUse) {
        console.log('Detected existing service on port 5678, checking health...');
        progressCallback && progressCallback(50, 'Checking existing N8N instance...');
        try {
          const res = await fetch('http://127.0.0.1:5678/healthz', { timeout: 1500 });
          if (res.ok) {
            console.log('An existing healthy N8N instance is running on port 5678; reusing it.');
            progressCallback && progressCallback(100, 'N8N is already running');
            this.n8nProcess = null;
            return { reused: true };
          }
        } catch (e) {
          console.warn('Port 5678 is in use but N8N healthcheck failed:', e && e.message);
          throw new Error('Port 5678 is in use by another process and is not responding as N8N');
        }
      }
    } catch (e) {
      console.warn('Port check for N8N failed, continuing to attempt start:', e && e.message);
    }

    progressCallback && progressCallback(10, 'Setting up N8N workspace...');

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        
        // Database configuration - SQLite (no Docker needed)
        DB_TYPE: 'sqlite',
        DB_SQLITE_DATABASE: this.dbPath,
        DB_SQLITE_ENABLE_WAL: 'true',
        
        // N8N server configuration
        N8N_PORT: '5678',
        N8N_HOST: 'localhost',
        N8N_PROTOCOL: 'http',
        
        // User management configuration
        N8N_BASIC_AUTH_ACTIVE: 'false',
        N8N_USER_MANAGEMENT_DISABLED: 'false', // Enable user management for owner setup
        N8N_SKIP_OWNER_SETUP: 'false', // Allow owner setup
        N8N_USER_MANAGEMENT_JWT_SECRET: 'gignaati-workbench-secret-key-2025', // JWT secret for sessions
        
        // Disable telemetry and external connections
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_TELEMETRY_ENABLED: 'false',
        N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
        N8N_TEMPLATES_ENABLED: 'false',
        N8N_HIRING_BANNER_ENABLED: 'false',
        N8N_PERSONALIZATION_ENABLED: 'false',
        
        // Paths
        N8N_USER_FOLDER: this.n8nDataPath,
        N8N_CUSTOM_EXTENSIONS: this.workflowsPath,
        
        // Performance optimization
        EXECUTIONS_DATA_PRUNE: 'true',
        EXECUTIONS_DATA_MAX_AGE: '336', // 2 weeks
        EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
        EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
        EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: 'true',
        
        // Logging
        N8N_LOG_LEVEL: 'info',
        N8N_LOG_OUTPUT: 'console,file',
        N8N_LOG_FILE_LOCATION: path.join(this.appDataPath, 'logs', 'n8n.log'),
        N8N_LOG_FILE_COUNT_MAX: '5',
        N8N_LOG_FILE_SIZE_MAX: '16', // MB
        
        // Webhook URL
        WEBHOOK_URL: 'http://localhost:5678/',
        
        // === OLLAMA INTEGRATION ===
        // Configure Ollama as default LLM provider
        OLLAMA_HOST: 'http://localhost:11434',
        N8N_AI_ENABLED: 'true'
      };

      console.log('Starting N8N server...');
      console.log('Database path:', this.dbPath);
      console.log('Ollama integration enabled at: http://localhost:11434');
      
      progressCallback && progressCallback(20, 'Starting N8N server...');

      // Find n8n executable or launcher
      const launcher = this.findN8NExecutable();

      if (!launcher) {
        reject(new Error('N8N executable not found. Ensure n8n is installed (npm install -g n8n) or bundled with the app.'));
        return;
      }

      console.log('Using N8N launcher:', launcher.cmd, launcher.args || []);

      // record which launcher was used so callers can adjust timeouts
      this.lastLauncher = launcher;

      // Prepare boot log file
      try {
        const logDir = path.join(this.appDataPath, 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        this.bootLogPath = path.join(logDir, 'n8n-boot.log');
        // rotate/clear previous boot log
        try { fs.writeFileSync(this.bootLogPath, `=== n8n boot log started: ${new Date().toISOString()} ===\n`); } catch(e){}
      } catch (e) {
        console.error('Failed to prepare n8n boot log:', e);
      }

      progressCallback && progressCallback(30, 'Launching N8N process...');

      this.n8nProcess = spawn(launcher.cmd, launcher.args || [], {
        env,
        cwd: launcher.cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false, // Changed from default to ensure proper cleanup
        windowsHide: true // Hide console window on Windows
      });

      let ready = false;
      let accumulatedStdout = '';
      let accumulatedStderr = '';

      this.n8nProcess.stdout.on('data', (data) => {
        const output = data.toString();
        accumulatedStdout += output;
        if (accumulatedStdout.length > 8192) accumulatedStdout = accumulatedStdout.slice(-8192);
        console.log(`N8N: ${output}`);
        try { fs.appendFileSync(this.bootLogPath, `[STDOUT ${new Date().toISOString()}] ${output}`); } catch (e) {}

        // Detect when N8N is ready
        if (!ready && (output.includes('Editor is now accessible') || output.includes('Server started') || output.includes('Webhook waiting'))) {
          ready = true;
          progressCallback && progressCallback(90, 'N8N is starting up...');
          // Give it a bit more time to fully initialize
          setTimeout(() => {
            progressCallback && progressCallback(100, 'N8N ready!');
            resolve(this.n8nProcess);
          }, 3000); // Increased from 2000ms
        } else if (output.includes('Initializing')) {
          progressCallback && progressCallback(40, 'Initializing N8N...');
        } else if (output.includes('Loading')) {
          progressCallback && progressCallback(50, 'Loading N8N components...');
        } else if (output.includes('Starting')) {
          progressCallback && progressCallback(60, 'Starting N8N services...');
        }
      });

      this.n8nProcess.stderr.on('data', (data) => {
        const output = data.toString();
        accumulatedStderr += output;
        if (accumulatedStderr.length > 16384) accumulatedStderr = accumulatedStderr.slice(-16384);
        
        // Only log as error if it's actually an error, not just warnings
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('fatal')) {
          console.error(`N8N Error: ${output}`);
        } else {
          console.log(`N8N: ${output}`);
        }
        
        try { fs.appendFileSync(this.bootLogPath, `[STDERR ${new Date().toISOString()}] ${output}`); } catch (e) {}
      });

      this.n8nProcess.on('error', (error) => {
        console.error('Failed to start N8N:', error);
        progressCallback && progressCallback(0, `Error: ${error.message}`);
        reject(error);
      });

      this.n8nProcess.on('close', (code) => {
        console.log(`N8N process exited with code ${code}`);
        const wasReady = ready;
        this.n8nProcess = null;
        
        if (!wasReady) {
          const err = new Error(`N8N process exited before becoming ready (code ${code})`);
          err.code = code;
          err.stdout = accumulatedStdout;
          err.stderr = accumulatedStderr;
          
          // Log detailed error information
          console.error('\n========== N8N STARTUP FAILURE ==========');
          console.error('Exit code:', code);
          console.error('Launcher used:', launcher.cmd, launcher.args);
          console.error('\n--- STDOUT ---');
          console.error(accumulatedStdout || '(empty)');
          console.error('\n--- STDERR ---');
          console.error(accumulatedStderr || '(empty)');
          console.error('\nBoot log path:', this.bootLogPath);
          console.error('\nPossible causes:');
          console.error('1. N8N not installed: Run "npm install -g n8n" or "npm install n8n"');
          console.error('2. Port 5678 already in use');
          console.error('3. Missing dependencies');
          console.error('4. Database file corruption');
          console.error('========================================\n');
          
          progressCallback && progressCallback(0, `N8N failed to start (code ${code})`);
          return reject(err);
        }
      });

      // Timeout fallback - INCREASED TIMEOUT
      const isNpx = launcher && launcher.cmd && launcher.cmd.toLowerCase().includes('npx');
      const fallbackMs = isNpx ? 300000 : 60000; // 5 minutes for npx, 1 minute for others

      // If not ready within fallbackMs, resolve with the process (caller will poll health endpoint)
      setTimeout(() => {
        if (this.n8nProcess && !ready) {
          console.log(`N8N start fallback after ${fallbackMs}ms; returning process for external readiness checks`);
          progressCallback && progressCallback(70, 'N8N is taking longer than expected...');
          resolve(this.n8nProcess);
        }
      }, fallbackMs);
    });
  }

  findN8NExecutable() {
    // Common places to look for a bundled n8n binary/script
    const possiblePaths = [
      path.join(__dirname, '../../node_modules/n8n/bin/n8n'), // development
      path.join(process.resourcesPath || '', 'app.asar.unpacked/node_modules/n8n/bin/n8n'),
      path.join(process.resourcesPath || '', 'app/node_modules/n8n/bin/n8n'),
      path.join(path.dirname(app.getPath('exe')), 'resources/app.asar.unpacked/node_modules/n8n/bin/n8n') // packaged
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`Found N8N script at: ${p}`);
        // Use `node path/to/n8n` as the launcher
        return { cmd: 'node', args: [p], cwd: path.dirname(p) };
      }
    }

    // Try to find n8n on PATH (where on Windows, which on *nix)
    try {
      const whichCmd = process.platform === 'win32' ? 'where n8n' : 'which n8n';
      const out = execSync(whichCmd, { encoding: 'utf8' }).split(/\r?\n/).find(Boolean);
      if (out && fs.existsSync(out.trim())) {
        const p = out.trim();
        console.log(`Found n8n on PATH at: ${p}`);
        // n8n on PATH is usually an executable script; run it with node if it's a JS file
        if (p.endsWith('.js')) {
          return { cmd: 'node', args: [p], cwd: path.dirname(p) };
        }
        return { cmd: p, args: [], cwd: path.dirname(p) };
      }
    } catch (e) {
      // ignore
    }

    // Check npm global bin (npm root -g or npm bin -g)
    try {
      const npmBin = execSync('npm bin -g', { encoding: 'utf8' }).trim();
      const candidate = path.join(npmBin, process.platform === 'win32' ? 'n8n.cmd' : 'n8n');
      if (fs.existsSync(candidate)) {
        console.log(`Found n8n in npm global bin at: ${candidate}`);
        return { cmd: candidate, args: [], cwd: path.dirname(candidate) };
      }
    } catch (e) {
      // ignore
    }

    // Fallback: use npx to run n8n (this will download/execute temporarily if not installed)
    console.log('Falling back to npx n8n launcher');
    return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['n8n'], cwd: process.cwd() };
  }

  async waitForN8N(maxAttempts = 60, progressCallback) { // Increased from 30 to 60
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (error) {
      console.error('Failed to load node-fetch:', error);
      throw new Error('node-fetch dependency is required but not available. Please ensure it is installed correctly.');
    }
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://localhost:5678/healthz', {
          timeout: 3000 // Increased from 2000
        });
        
        if (response.ok) {
          console.log('N8N is ready!');
          progressCallback && progressCallback(100, 'N8N is ready!');
          return true;
        }
      } catch (error) {
        // N8N not ready yet
        const progress = Math.floor((i / maxAttempts) * 100);
        progressCallback && progressCallback(progress, `Waiting for N8N... ${i}/${maxAttempts}s`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('N8N failed to start within timeout period');
  }

  async stop() {
    if (this.n8nProcess) {
      console.log('Stopping N8N...');
      
      try {
        // Try graceful shutdown first
        this.n8nProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (this.n8nProcess && !this.n8nProcess.killed) {
            console.log('Force killing N8N process...');
            this.n8nProcess.kill('SIGKILL');
          }
        }, 5000);
      } catch (e) {
        console.error('Error stopping N8N:', e);
      }
      
      this.n8nProcess = null;
    }
  }

  isRunning() {
    return this.n8nProcess !== null && !this.n8nProcess.killed;
  }
}

module.exports = N8NManager;

