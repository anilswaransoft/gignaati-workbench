// Add this to ollama-manager.js to support download cancellation

// Add to class constructor:
this.activeDownloads = new Map(); // modelName -> pullProcess

// Modified downloadModel method with cancellation support:
async downloadModel(modelName, progressCallback) {
  if (!await this.isOllamaRunning()) {
    throw new Error('AI Brain is not running. Please start it first.');
  }

  // Check if already downloading
  if (this.activeDownloads.has(modelName)) {
    throw new Error(`${modelName} is already being downloaded`);
  }

  return new Promise((resolve, reject) => {
    const pullProcess = spawn(this.ollamaInstallPath, ['pull', modelName], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Store process reference for cancellation
    this.activeDownloads.set(modelName, pullProcess);

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
      // Clean up active downloads map
      this.activeDownloads.delete(modelName);

      if (code === 0) {
        progressCallback && progressCallback(100, `${modelName} downloaded successfully`, { stage: 'complete' });
        resolve();
      } else if (code === null) {
        // Process was killed (cancelled)
        reject(new Error('Download cancelled'));
      } else {
        reject(new Error(`Model download failed with code ${code}`));
      }
    });

    pullProcess.on('error', (error) => {
      this.activeDownloads.delete(modelName);
      reject(error);
    });
  });
}

// New method to cancel download:
cancelDownload(modelName) {
  const pullProcess = this.activeDownloads.get(modelName);
  
  if (!pullProcess) {
    throw new Error(`No active download found for ${modelName}`);
  }

  console.log(`Cancelling download of ${modelName}`);
  
  // Kill the process
  pullProcess.kill('SIGTERM');
  
  // Remove from active downloads
  this.activeDownloads.delete(modelName);
  
  return { success: true, message: `Download of ${modelName} cancelled` };
}

