// src/main/n8n-manager.js - FINAL FIXED VERSION (using npx + spawn fix + robust wait)
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
// Use require for node-fetch consistently
const fetch = require('node-fetch'); // Ensure node-fetch v2 is installed


class N8NManager {
  constructor() {
    this.n8nProcess = null;
    this.appDataPath = app.getPath('userData');
    this.n8nDataPath = path.join(this.appDataPath, 'n8n-data');
    this.dbPath = path.join(this.n8nDataPath, 'database.sqlite');
    this.workflowsPath = path.join(this.n8nDataPath, 'workflows');
    this.bootLogPath = path.join(this.appDataPath, 'logs', 'n8n-boot.log'); // Define earlier
  }

  async initialize() {
    console.log('Initializing N8N workspace structure...');
    this.ensureDirectories();
    if (!fs.existsSync(this.dbPath)) {
      await this.copyStarterTemplates();
    }
  }

  ensureDirectories() {
    const dirs = [
      this.n8nDataPath,
      this.workflowsPath,
      path.join(this.n8nDataPath, 'credentials'),
      path.join(this.appDataPath, 'logs') // Log directory
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        } catch (mkdirError) {
          console.error(`Failed to create directory ${dir}:`, mkdirError);
        }
      }
    });
    // Ensure log file exists for appending later
    try {
        if (!fs.existsSync(this.bootLogPath)) {
            fs.writeFileSync(this.bootLogPath, `=== n8n boot log created: ${new Date().toISOString()} ===\n`);
        }
    } catch(e) {
        console.error('Failed to create initial boot log file:', e);
    }
  }

  async copyStarterTemplates() {
    try {
      const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
      // Adjust path assuming 'resources' is at the root of your project / package
      const templatesSource = path.join(basePath, 'resources', 'templates', 'starter-workflows');
      const templatesDest = path.join(this.workflowsPath, 'templates');

      if (fs.existsSync(templatesSource)) {
        if (!fs.existsSync(templatesDest)) {
            fs.mkdirSync(templatesDest, { recursive: true });
        }
        const files = fs.readdirSync(templatesSource);
        files.forEach(file => {
            const src = path.join(templatesSource, file);
            const dest = path.join(templatesDest, file);
            if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
                console.log(`Copied template: ${file}`);
            }
        });
      } else {
        console.warn(`Starter templates directory not found at: ${templatesSource}`);
      }
    } catch (error) {
      console.error('Failed to copy starter templates:', error);
    }
  }


  async start(progressCallback) {
    // Check if process exists and hasn't exited
    if (this.n8nProcess && this.n8nProcess.exitCode === null) {
      console.log('N8N process appears to be already running.');
      progressCallback?.(100, 'N8N is already running');
      return this.n8nProcess;
    }

    const net = require('net');

    // Port checking logic
     const isPortOpen = (port, host = '127.0.0.1', timeout = 1000) => {
      //const isPortOpen = (port, host = 'localhost', timeout = 1000) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let settled = false;
            const onError = () => {
                if (!settled) { settled = true; socket.destroy(); resolve(false); }
            };
            socket.setTimeout(timeout);
            socket.once('connect', () => { settled = true; socket.destroy(); resolve(true); });
            socket.once('timeout', onError);
            socket.once('error', onError);
            socket.connect(port, host);
        });
    };

     try {
       const portInUse = await isPortOpen(5678);
       if (portInUse) {
         console.log('Port 5678 is potentially in use, checking n8n health...');
         progressCallback?.(50, 'Checking existing n8n instance...');
         try {
           // Use localhost consistently for health check
           const res = await fetch('http://localhost:5678/healthz', { timeout: 2000 }); // Increased timeout slightly
           if (res.ok) {
             console.log('Healthy n8n instance found running on port 5678. Reusing it.');
             progressCallback?.(100, 'Reusing existing n8n instance');
             this.n8nProcess = null;
             return { reused: true };
           } else {
              throw new Error(`Health check failed with status ${res.status}`);
           }
         } catch (e) {
           console.error('Port 5678 check failed:', e?.message);
           // It's occupied, but not by a healthy n8n instance. Error out.
           throw new Error('Port 5678 is occupied by a non-n8n process or n8n is unhealthy.');
         }
       } else {
          console.log('Port 5678 is free.');
       }
     } catch (e) {
       console.error('Failed during port check or health check:', e.message);
       // If the error was about the port being occupied, re-throw it.
       if (e.message.includes('Port 5678 is occupied')) {
           throw e;
       }
       // Otherwise, log and allow attempt to start n8n
       console.warn('Proceeding to start n8n despite port check issues.');
     }


    progressCallback?.(10, 'Configuring n8n environment...');

    return new Promise((resolve, reject) => {
      // --- Environment Variables ---
      const env = {
        ...process.env, // Inherit existing env vars
        // --- Core n8n Settings ---
        N8N_PORT: '5678',
        N8N_HOST: 'localhost', // Listen only on localhost for security
        N8N_PROTOCOL: 'http',
        N8N_USER_FOLDER: this.n8nDataPath, // Use user data folder
        WEBHOOK_URL: 'http://localhost:5678/', // Base URL for webhooks

        // --- Database (SQLite) ---
        DB_TYPE: 'sqlite',
        DB_SQLITE_DATABASE: this.dbPath,
        DB_SQLITE_ENABLE_WAL: 'true', // Recommended for performance

        // --- User Management & Security ---
        N8N_BASIC_AUTH_ACTIVE: 'false', // Disable basic auth
        N8N_USER_MANAGEMENT_DISABLED: 'false', // Enable user management
        N8N_SKIP_OWNER_SETUP: 'false', // Ensure owner account must be created on first run
        // Generate or load a persistent encryption key
        N8N_ENCRYPTION_KEY: this.getEncryptionKey(),
        N8N_USER_MANAGEMENT_JWT_SECRET: this.getJwtSecret(), // Use persistent JWT secret
        N8N_BLOCK_ENV_ACCESS_IN_NODE: 'true', // Security best practice (added)

        // --- Disable External Calls & Telemetry ---
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_TELEMETRY_ENABLED: 'false',
        N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
        N8N_TEMPLATES_ENABLED: 'false',
        N8N_HIRING_BANNER_ENABLED: 'false',
        N8N_PERSONALIZATION_ENABLED: 'false',

        // --- Performance & Data Management ---
        EXECUTIONS_DATA_PRUNE: 'true', // Auto-prune execution data
        EXECUTIONS_DATA_MAX_AGE: '336', // Keep data for 14 days (336 hours)
        EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
        EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none', // Don't save successful run data unless needed
        EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: 'true',

        // --- Logging ---
        N8N_LOG_LEVEL: 'info', // Or 'warn', 'error' for less verbosity
        N8N_LOG_OUTPUT: 'console,file',
        N8N_LOG_FILE_LOCATION: path.join(this.appDataPath, 'logs', 'n8n.log'),
        N8N_LOG_FILE_COUNT_MAX: '5',
        N8N_LOG_FILE_SIZE_MAX: '10', // Reduced max log size to 10MB

        // --- Ollama Integration ---
        OLLAMA_HOST: 'http://localhost:11434', // Ensure Ollama runs here
        N8N_AI_ENABLED: 'true', // Enable AI features

        // --- Deprecation Warnings ---
        DB_SQLITE_POOL_SIZE: '1', // Address deprecation (value > 0)
        N8N_RUNNERS_ENABLED: 'true', // Address deprecation
        N8N_GIT_NODE_DISABLE_BARE_REPOS: 'true' // Address deprecation (if not using bare repos)
      };
      // --- End Environment Variables ---


      console.log('Attempting to start n8n server via npx...');
      progressCallback?.(20, 'Locating npx...');

      const launcher = this.findN8NExecutable();

      if (!launcher) {
        return reject(new Error('npx command not found. Ensure Node.js/npm is installed correctly.'));
      }

      console.log(`Using launcher: ${launcher.cmd} ${launcher.args.join(' ')}`);
      this.lastLauncher = launcher;

      // Ensure boot log file exists before spawning
       try {
           if (!fs.existsSync(path.dirname(this.bootLogPath))) {
              fs.mkdirSync(path.dirname(this.bootLogPath), { recursive: true });
           }
           fs.writeFileSync(this.bootLogPath, `=== n8n boot log started: ${new Date().toISOString()} ===\nAttempting launch with: ${launcher.cmd} ${launcher.args.join(' ')}\n`);
       } catch (e) {
           console.error('Failed to prepare n8n boot log:', e);
           // Continue even if logging fails initially
       }


      progressCallback?.(30, 'Launching n8n via npx (this might take a moment)...');

      let command = launcher.cmd;
      let args = launcher.args || [];
      const options = {
        env,
        cwd: launcher.cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true,
        shell: false // Explicitly disable shell unless needed
      };

      // Adjust for Windows .cmd execution
      if (process.platform === 'win32' && command.endsWith('.cmd')) {
        args = ['/c', command].concat(args);
        command = 'cmd.exe';
        // options.shell = true; // Using cmd.exe often requires shell: true
        console.log(`Adjusted for Windows: Running ${command} with args: ${args.join(' ')}`);
      }

      try {
        this.n8nProcess = spawn(command, args, options);
      } catch (spawnError) {
         console.error(`CRITICAL: Failed to spawn process '${command}' with args '${args.join(' ')}'. Error: ${spawnError.message}`, spawnError);
         progressCallback?.(0, `Failed to launch n8n process: ${spawnError.message}`);
         return reject(spawnError);
      }


      let ready = false;
      let stdoutBuffer = '';
      let stderrBuffer = '';
      const startupTimeoutMs = 300000; // 5 minutes

      // Helper to append to boot log safely
      const appendLog = (prefix, data) => {
          try {
              fs.appendFileSync(this.bootLogPath, `[${prefix} ${new Date().toISOString()}] ${data.toString()}`);
          } catch (logErr) {
              console.warn('Failed to append to boot log:', logErr.message);
          }
      };


      this.n8nProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdoutBuffer += output;
           // Keep buffer reasonable, e.g., last ~50 lines or 16KB
           const lines = stdoutBuffer.split('\n');
           if (lines.length > 50) stdoutBuffer = lines.slice(-50).join('\n');
           if (stdoutBuffer.length > 16384) stdoutBuffer = stdoutBuffer.slice(-16384);

          console.log(`N8N_stdout: ${output.trim()}`);
          appendLog('STDOUT', output);


        if (!ready && (output.includes('Editor is now accessible') || output.includes('Server started') || output.includes('Webhook waiting'))) {
          ready = true;
          clearTimeout(timeoutHandle); // Clear startup timeout
          progressCallback?.(90, 'n8n server running, finalizing...');
          // Give a very short delay for routes to fully initialize
          setTimeout(() => {
            progressCallback?.(100, 'n8n ready!');
            console.log("n8n signaled readiness via stdout.");
            resolve(this.n8nProcess);
          }, 1000); // Reduced delay
        } else if (output.includes('Initializing')) {
          progressCallback?.(40, 'Initializing n8n...');
        } else if (output.includes('Loading')) {
          progressCallback?.(50, 'Loading n8n components...');
        } else if (output.includes('Starting')) {
          progressCallback?.(60, 'Starting n8n services...');
        }
      });

      this.n8nProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderrBuffer += output;
        const lines = stderrBuffer.split('\n');
        if (lines.length > 100) stderrBuffer = lines.slice(-100).join('\n');
        if (stderrBuffer.length > 32768) stderrBuffer = stderrBuffer.slice(-32768);

        // Log warnings/errors differently
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('fatal')) {
          console.error(`N8N_stderr: ${output.trim()}`);
        } else {
          console.warn(`N8N_stderr: ${output.trim()}`);
        }
        appendLog('STDERR', output);
      });

      this.n8nProcess.on('error', (error) => {
        clearTimeout(timeoutHandle); // Clear startup timeout
        console.error('Failed to start n8n process:', error);
        progressCallback?.(0, `Error starting n8n: ${error.message}`);
        appendLog('ERROR', `Spawn error: ${error.message}\n${error.stack}`);
        reject(error);
      });

      this.n8nProcess.on('close', (code) => {
        clearTimeout(timeoutHandle); // Clear startup timeout
        console.log(`n8n process exited with code ${code}`);
        appendLog('CLOSE', `Process exited with code: ${code}`);
        const wasReady = ready; // Capture readiness state before clearing process
        this.n8nProcess = null; // Clear process reference

        if (!wasReady && code !== 0) { // Reject only if abnormal exit before ready
          const err = new Error(`n8n process exited unexpectedly (code ${code}) before signaling readiness.`);
          err.code = code;
          err.stdout = stdoutBuffer;
          err.stderr = stderrBuffer;
          console.error('\n========== n8n STARTUP FAILURE (details below) ==========');
          console.error(`Exit Code: ${code}`);
          console.error(`Launcher: ${launcher.cmd} ${launcher.args.join(' ')}`);
          console.error('\n--- STDOUT (Last Buffer) ---');
          console.error(stdoutBuffer || '(empty)');
          console.error('\n--- STDERR (Last Buffer) ---');
          console.error(stderrBuffer || '(empty)');
          console.error(`\nFull logs might be available in: ${this.bootLogPath} and ${path.join(this.appDataPath, 'logs', 'n8n.log')}`);
          console.error('========================================================\n');
          progressCallback?.(0, `n8n failed to start (code ${code})`);
          reject(err);
        } else if (!wasReady && code === 0) {
            console.warn('n8n process exited cleanly (code 0) but did not signal readiness via stdout. Check logs.');
            // Potentially resolve, but indicate uncertainty? Or reject?
            // Let's reject for now as it didn't confirm readiness.
             const err = new Error(`n8n process exited cleanly (code 0) but didn't signal readiness.`);
             err.code = code;
             reject(err);
        }
        // If it was already ready, or exited cleanly, we don't reject here.
      });

      // Startup Timeout
      const timeoutHandle = setTimeout(() => {
        if (this.n8nProcess && !ready) { // Check if process still exists and isn't ready
          console.warn(`n8n did not signal readiness via stdout within ${startupTimeoutMs / 1000}s. Attempting health check as fallback...`);
          progressCallback?.(75, 'n8n taking longer than expected, checking health...');
          // Attempt a direct health check before giving up or resolving
          this.waitForN8N(10, progressCallback) // Try for 10 more seconds
              .then(() => {
                   console.log("n8n confirmed ready via fallback health check.");
                   resolve(this.n8nProcess);
              })
              .catch((waitError) => {
                   console.error("Fallback health check also failed.", waitError);
                   // Kill the potentially hung process
                   this.stop().catch(stopErr => console.error("Error stopping hung process:", stopErr)); // Attempt to cleanup
                   reject(new Error(`n8n failed to start or become ready within ${startupTimeoutMs / 1000}s timeout.`));
              });
        }
      }, startupTimeoutMs);

    }); // End Promise constructor
  } // End start() method

  // --- Persistent Key/Secret Generation ---
  getPersistentSecret(fileName, length = 64) {
      const filePath = path.join(this.appDataPath, fileName);
      try {
          if (fs.existsSync(filePath)) {
              const secret = fs.readFileSync(filePath, 'utf-8');
              if (secret.length === length) {
                  return secret;
              } else {
                  console.warn(`Stored secret in ${fileName} has incorrect length. Regenerating.`);
              }
          }
          // Generate a new secret
          const crypto = require('crypto');
          const newSecret = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
          fs.writeFileSync(filePath, newSecret, 'utf-8');
          console.log(`Generated and saved new secret to ${fileName}`);
          return newSecret;
      } catch (error) {
          console.error(`Error handling persistent secret file ${fileName}:`, error);
          // Fallback to a less secure default if file operations fail
          return 'fallback_insecure_secret_please_fix_permissions_' + fileName.replace('.secret','');
      }
  }

  getEncryptionKey() {
      // n8n requires exactly 64 hex characters (32 bytes)
      return this.getPersistentSecret('encryption.key', 64);
  }

  getJwtSecret() {
      // Recommend at least 32 characters for JWT secret
      return this.getPersistentSecret('jwt.secret', 64); // Use 64 for strong secret
  }
  // --- End Persistent Key/Secret Generation ---

  // ----- findN8NExecutable (Unchanged - Uses npx) -----
  findN8NExecutable() {
    console.log('[N8NManager] Using npx to find and launch n8n.');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    try {
      // Verify npx exists using a command that works on both platforms
      execSync(process.platform === 'win32' ? 'where npx.cmd' : 'which npx', { stdio: 'ignore' });
      return { cmd: npxCmd, args: ['n8n'], cwd: process.cwd() };
    } catch (error) {
      console.error("CRITICAL: 'npx' command not found. Ensure Node.js/npm is installed and in the system PATH.");
      return null;
    }
  }
  // ----- END findN8NExecutable -----

  // ----- waitForN8N (Updated with better logging and using localhost) -----
  async waitForN8N(maxAttempts = 60, progressCallback) {
    const healthUrl = 'http://localhost:5678/healthz'; // Use localhost
    console.log(`Waiting for n8n to be ready at ${healthUrl} (up to ${maxAttempts}s)...`);

    for (let i = 0; i < maxAttempts; i++) {
      const attempt = i + 1;
      progressCallback?.(Math.floor((attempt / maxAttempts) * 20) + 75, `Checking n8n readiness... (${attempt}/${maxAttempts})`); // Progress from 75-95%

      try {
        const response = await fetch(healthUrl, {
          method: 'GET', // Explicitly GET
          timeout: 1500 // Shorter timeout for quick checks
        });

        if (response.ok) {
          console.log(`n8n health check successful! (Attempt ${attempt}/${maxAttempts})`);
          progressCallback?.(100, 'n8n is ready!');
          return true; // n8n is ready
        } else {
          // Log non-OK status only once every few attempts
          if (attempt % 5 === 0) {
            console.warn(`n8n health check returned status ${response.status} (Attempt ${attempt}/${maxAttempts})`);
          }
        }
      } catch (error) {
        // Log connection errors only periodically to avoid spam
        if (attempt % 5 === 0 || attempt === 1) {
          console.warn(`n8n health check failed (Attempt ${attempt}/${maxAttempts}): ${error.message}`);
        }
        // Common errors: ECONNREFUSED (not started yet), ETIMEDOUT
      }

      // Wait 1 second before the next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`n8n failed to become ready at ${healthUrl} within ${maxAttempts} seconds.`);
    throw new Error('n8n failed to start or become healthy within the timeout period.');
  }
  // ----- END waitForN8N -----


  // stop method (Improved for robustness)
  async stop() {
    if (!this.n8nProcess || this.n8nProcess.killed) {
      console.log('n8n process is not running or already stopped.');
      this.n8nProcess = null; // Ensure reference is cleared
      return;
    }

    console.log(`Attempting to stop n8n process (PID: ${this.n8nProcess.pid})...`);
    const pid = this.n8nProcess.pid; // Capture PID before potentially clearing reference

    try {
      if (process.platform === 'win32') {
        console.log(`Using taskkill /PID ${pid} /F /T`);
        try {
          execSync(`taskkill /PID ${pid} /F /T`);
          console.log('n8n process terminated via taskkill.');
        } catch (tkError) {
          // Ignore "not found" errors, process might have exited already
          if (!tkError.message.includes('not found')) {
              console.error(`Taskkill failed: ${tkError.message}`);
          } else {
               console.log('Taskkill reported process not found (likely already exited).');
          }
        }
      } else {
        // Use standard kill signals for macOS/Linux
        console.log(`Sending SIGTERM to PID ${pid}...`);
        process.kill(pid, 'SIGTERM');

        // Setup a fallback SIGKILL
        const killTimeout = setTimeout(() => {
          try {
              console.warn(`Process ${pid} did not exit via SIGTERM, sending SIGKILL...`);
              process.kill(pid, 'SIGKILL');
          } catch (killError) {
              // Ignore errors if process already exited
              if (killError.code !== 'ESRCH') { // ESRCH = No such process
                  console.error(`Error sending SIGKILL to PID ${pid}:`, killError.message);
              }
          }
        }, 3000); // 3 seconds grace period

        // Wait briefly for SIGTERM to work before clearing timeout
        await new Promise(resolve => setTimeout(resolve, 500));
        clearTimeout(killTimeout); // Clear fallback if process likely exited
      }
    } catch (e) {
      console.error('Error occurred during process termination:', e.message);
    } finally {
      // Always clear the reference after attempting to stop
      if (this.n8nProcess && this.n8nProcess.pid === pid) {
          this.n8nProcess = null;
          console.log('n8n process reference cleared.');
      }
    }
  }


  isRunning() {
    // Check if the process object exists and its exitCode is null (meaning it hasn't exited)
    return !!this.n8nProcess && this.n8nProcess.exitCode === null;
  }
}

module.exports = N8NManager;