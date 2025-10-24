// src/main/n8n-credential-injector-v2.js
// IMPROVED: Works with N8N's existing encryption system

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class N8NCredentialInjectorV2 {
  constructor() {
    this.appDataPath = app.getPath('userData');
    this.n8nDataPath = path.join(this.appDataPath, 'n8n-data');
    this.dbPath = path.join(this.n8nDataPath, 'database.sqlite');
    this.configPath = path.join(this.n8nDataPath, 'config');
  }

  /**
   * Get the fixed encryption key that we set in n8n-manager.js
   * This is the same key N8N will use because we set N8N_ENCRYPTION_KEY env var
   */
  getFixedEncryptionKey() {
    // This MUST match the N8N_ENCRYPTION_KEY in n8n-manager.js
    return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  }

  /**
   * Encrypt credential data using N8N's encryption format
   * N8N uses: "aes-256-cbc" with format "algorithm:iv:encryptedData"
   */
  encryptCredentialData(data, encryptionKey) {
    try {
      const algorithm = 'aes-256-cbc';
      
      // N8N uses the encryption key directly as a hex string
      // The key must be exactly 32 bytes (64 hex characters) for AES-256
      let keyBuffer;
      if (encryptionKey.length === 64) {
        // Already a hex string
        keyBuffer = Buffer.from(encryptionKey, 'hex');
      } else if (encryptionKey.length === 32) {
        // Already a buffer or needs to be hashed
        keyBuffer = Buffer.from(encryptionKey);
      } else {
        // Hash it to get 32 bytes
        keyBuffer = crypto.createHash('sha256').update(encryptionKey).digest();
      }
      
      // Generate random IV (16 bytes for AES)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return in N8N format: "aes-256-cbc:iv:encryptedData"
      return `${algorithm}:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama credentials already exist
   */
  async checkOllamaCredentialsExist(db) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM credentials_entity WHERE type = 'ollamaApi' LIMIT 1",
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  /**
   * Get the default user ID (owner)
   */
  async getDefaultUserId(db) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM user ORDER BY createdAt ASC LIMIT 1",
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(row.id);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Get the default project ID
   */
  async getDefaultProjectId(db) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM project WHERE type = 'personal' LIMIT 1",
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(row.id);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Inject Ollama credentials into N8N database
   */
  async injectOllamaCredentials() {
    return new Promise(async (resolve, reject) => {
      try {
        // Wait for N8N to create its database
        console.log('Waiting for N8N to initialize...');
        await this.waitForN8NInitialization();

        // Use the fixed encryption key that we set in n8n-manager.js
        const encryptionKey = this.getFixedEncryptionKey();
        console.log('Using fixed encryption key for credential encryption');

        console.log('Opening N8N database:', this.dbPath);
        
        const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE, async (err) => {
          if (err) {
            console.error('Failed to open N8N database:', err);
            reject(new Error(`Cannot open N8N database: ${err.message}`));
            return;
          }

          try {
            // Check if credentials already exist
            const exists = await this.checkOllamaCredentialsExist(db);
            if (exists) {
              console.log('Ollama credentials already exist in N8N');
              db.close();
              resolve({ alreadyExists: true });
              return;
            }

            // Get default user and project
            const userId = await this.getDefaultUserId(db);
            const projectId = await this.getDefaultProjectId(db);
            
            if (!userId) {
              console.log('No user found yet - will retry after N8N setup completes');
              db.close();
              resolve({ needsRetry: true });
              return;
            }

            // Prepare Ollama credential data
            const credentialData = {
              baseUrl: 'http://localhost:11434'
              // No API key needed for local Ollama
            };

            // Encrypt the credential data using N8N's encryption key
            const encryptedData = this.encryptCredentialData(credentialData, encryptionKey);

            // Generate credential ID
            const credentialId = crypto.randomUUID();
            const now = new Date().toISOString();

            // Insert credential
            await new Promise((resolveInsert, rejectInsert) => {
              db.run(
                `INSERT INTO credentials_entity 
                 (id, name, type, data, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  credentialId,
                  'Local Ollama (Auto-configured)',
                  'ollamaApi',
                  encryptedData,
                  now,
                  now
                ],
                function(insertErr) {
                  if (insertErr) {
                    rejectInsert(insertErr);
                  } else {
                    console.log('Ollama credential inserted with ID:', credentialId);
                    resolveInsert();
                  }
                }
              );
            });

            // Share credential with user (if project exists)
            if (projectId) {
              await new Promise((resolveShare, rejectShare) => {
                db.run(
                  `INSERT INTO shared_credentials 
                   (credentialsId, projectId, role) 
                   VALUES (?, ?, ?)`,
                  [credentialId, projectId, 'credential:owner'],
                  function(shareErr) {
                    if (shareErr) {
                      console.warn('Failed to share credential (may not be critical):', shareErr);
                      resolveShare();
                    } else {
                      console.log('Credential shared with project');
                      resolveShare();
                    }
                  }
                );
              });
            }

            db.close();
            console.log('✅ Ollama credentials successfully injected into N8N');
            resolve({ success: true, credentialId });

          } catch (error) {
            console.error('Failed to inject credentials:', error);
            db.close();
            reject(error);
          }
        });
      } catch (error) {
        console.error('Credential injection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Wait for N8N to initialize (database created)
   */
  async waitForN8NInitialization(maxWaitSeconds = 30) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      // Check if database exists
      if (fs.existsSync(this.dbPath)) {
        // Wait a bit more for N8N to finish writing
        await new Promise(r => setTimeout(r, 2000));
        return true;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return false;
  }
}

module.exports = N8NCredentialInjectorV2;

