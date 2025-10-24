const { https, http } = require('follow-redirects');

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

class DownloadManager {
  constructor() {
    this.downloadUrls = {
      ollama: {
        win32: 'https://ollama.com/download/OllamaSetup.exe',
        darwin: 'https://ollama.com/download/Ollama-darwin.zip',
        linux: 'https://ollama.com/download/ollama-linux-amd64'
      },
      // N8N will be bundled, not downloaded
    };
  }

  async downloadFile(url, destination, progressCallback) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          return this.downloadFile(response.headers.location, destination, progressCallback)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        // Ensure directory exists
        const dir = path.dirname(destination);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const fileStream = fs.createWriteStream(destination);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (progressCallback && totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            progressCallback(progress, downloadedSize, totalSize);
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destination);
        });

        fileStream.on('error', (err) => {
          fs.unlink(destination, () => {}); // Clean up partial file
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  async downloadOllama(platform, progressCallback) {
    const url = this.downloadUrls.ollama[platform];
    if (!url) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const filename = path.basename(url);
    const tempDir = path.join(require('os').tmpdir(), 'ai-agent-builder');
    const destination = path.join(tempDir, filename);

    // Check if already downloaded
    if (fs.existsSync(destination)) {
      console.log('Ollama installer already downloaded');
      return destination;
    }

    console.log(`Downloading Ollama from ${url}`);
    return await this.downloadFile(url, destination, progressCallback);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = DownloadManager;
