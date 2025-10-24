// SOLUTION: Set a fixed encryption key BEFORE N8N starts
// This way we can encrypt credentials using a known key

// In n8n-manager.js, modify the env object in the start() method:

const env = {
  ...process.env,
  
  // Database configuration
  DB_TYPE: 'sqlite',
  DB_SQLITE_DATABASE: this.dbPath,
  DB_SQLITE_ENABLE_WAL: 'true',
  
  // N8N server configuration
  N8N_PORT: '5678',
  N8N_HOST: 'localhost',
  N8N_PROTOCOL: 'http',
  
  // === FIXED ENCRYPTION KEY ===
  // Set this BEFORE N8N first starts so we can use it to encrypt credentials
  N8N_ENCRYPTION_KEY: 'a'.repeat(64), // 64-character hex string (32 bytes for AES-256)
  
  // User management
  N8N_BASIC_AUTH_ACTIVE: 'false',
  N8N_USER_MANAGEMENT_DISABLED: 'false',
  N8N_SKIP_OWNER_SETUP: 'false',
  N8N_USER_MANAGEMENT_JWT_SECRET: 'gignaati-workbench-secret-key-2025',
  
  // Disable telemetry
  N8N_DIAGNOSTICS_ENABLED: 'false',
  N8N_TELEMETRY_ENABLED: 'false',
  N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
  N8N_TEMPLATES_ENABLED: 'false',
  N8N_HIRING_BANNER_ENABLED: 'false',
  N8N_PERSONALIZATION_ENABLED: 'false',
  
  // Paths
  N8N_USER_FOLDER: this.n8nDataPath,
  N8N_CUSTOM_EXTENSIONS: this.workflowsPath,
  
  // Performance
  EXECUTIONS_DATA_PRUNE: 'true',
  EXECUTIONS_DATA_MAX_AGE: '336',
  EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
  EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
  EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: 'true',
  
  // Logging
  N8N_LOG_LEVEL: 'info',
  N8N_LOG_OUTPUT: 'console,file',
  N8N_LOG_FILE_LOCATION: path.join(this.appDataPath, 'logs', 'n8n.log'),
  N8N_LOG_FILE_COUNT_MAX: '5',
  N8N_LOG_FILE_SIZE_MAX: '16',
  
  // Webhook
  WEBHOOK_URL: 'http://localhost:5678/',
  
  // === OLLAMA INTEGRATION ===
  OLLAMA_HOST: 'http://localhost:11434',
  N8N_AI_ENABLED: 'true'
};

// Now in the credential injector, use this fixed key:
const FIXED_ENCRYPTION_KEY = 'a'.repeat(64);

// This ensures:
// 1. N8N uses our fixed key instead of generating a random one
// 2. We can encrypt credentials using the same key
// 3. No encryption mismatch errors!

