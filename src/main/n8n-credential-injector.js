// src/main/n8n-credential-injector.js
// Auto-configure Ollama credentials in N8N database

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const { app } = require('electron');

class N8NCredentialInjector {
  constructor() {
    this.appDataPath = app.getPath('userData');
    this.dbPath = path.join(this.appDataPath, 'n8n-data', 'database.sqlite');
  }

  /**
   * Encrypt credential data using N8N's encryption key
   * N8N uses AES-256-CBC encryption for credentials
   */
  encryptCredentialData(data, encryptionKey) {
    try {
      // N8N encryption format: algorithm:iv:encrypted_data
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      
      // Create cipher with encryption key
      const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return in N8N format: algorithm:iv:data
      return `${algorithm}:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Get or generate N8N encryption key
   */
  async getEncryptionKey(db) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT value FROM settings WHERE key = 'encryptionKey'",
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row && row.value) {
            // Parse JSON value
            try {
              const parsed = JSON.parse(row.value);
              resolve(parsed);
            } catch (e) {
              resolve(row.value);
            }
          } else {
            // Generate new encryption key if not exists
            const newKey = crypto.randomBytes(32).toString('hex');
            
            db.run(
              "INSERT INTO settings (key, value, loadOnStartup) VALUES ('encryptionKey', ?, 1)",
              [JSON.stringify(newKey)],
              (insertErr) => {
                if (insertErr) {
                  reject(insertErr);
                } else {
                  resolve(newKey);
                }
              }
            );
          }
        }
      );
    });
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
            // No user exists yet, return null (will be created during N8N setup)
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
            // No project exists yet, return null
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
    return new Promise((resolve, reject) => {
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

          // Get encryption key
          const encryptionKey = await this.getEncryptionKey(db);
          console.log('Got encryption key');

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
            baseUrl: 'http://localhost:11434',
            // No API key needed for local Ollama
          };

          // Encrypt the credential data
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
                    // Don't reject - credential is still created
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
          console.log('Ollama credentials successfully injected into N8N');
          resolve({ success: true, credentialId });

        } catch (error) {
          console.error('Failed to inject credentials:', error);
          db.close();
          reject(error);
        }
      });
    });
  }

  /**
   * Wait for N8N database to be created and ready
   */
  async waitForDatabase(maxWaitSeconds = 60) {
    const fs = require('fs');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      if (fs.existsSync(this.dbPath)) {
        // Database file exists, wait a bit more for it to be initialized
        await new Promise(r => setTimeout(r, 2000));
        return true;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return false;
  }
}

module.exports = N8NCredentialInjector;

