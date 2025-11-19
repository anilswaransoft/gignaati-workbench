// Improved Download Manager for Gignaati Workbench
// Handles: Progress UI, Cancel functionality, Already Setup status, Button state management

// Global download state tracker
const downloadStates = new Map(); // modelName -> { status, progress, button, container, cancelCallback }

/**
 * Initialize download management on page load
 */
async function initializeDownloadManager() {
  try {
    // Check which models are already downloaded
    if (window.electronAPI && window.electronAPI.listModels) {
      const installedModels = await window.electronAPI.listModels();
      console.log('Installed models:', installedModels);
      
      // Update UI for already-downloaded models
      installedModels.forEach(model => {
        markModelAsInstalled(model.name);
      });
    }
  } catch (error) {
   // console.error('Failed to check installed models:', error);
  }
}

/**
 * Mark a model as already installed in the UI
 */
function markModelAsInstalled(modelName) {
  // Find all download buttons for this model
  const buttons = document.querySelectorAll(`[data-model="${modelName}"]`);
  
  buttons.forEach(button => {
    button.disabled = true;
    button.innerHTML = '✓ Already Setup';
    button.classList.remove('btn-primary');
    button.classList.add('btn-success');
    button.style.cursor = 'not-allowed';
    
    // Add badge
    const badge = document.createElement('span');
    badge.className = 'badge bg-success ms-2';
    badge.textContent = 'Installed';
    badge.style.fontSize = '0.7em';
    
    if (!button.querySelector('.badge')) {
      button.parentElement.appendChild(badge);
    }
  });
}

/**
 * Create progress container for a model download
 */
function createProgressContainer(modelName) {
  // Remove existing container if any
  const existing = document.getElementById(`progress-${modelName}`);
  if (existing) {
    existing.remove();
  }
  
  const progressContainer = document.createElement('div');
  progressContainer.id = `progress-${modelName}`;
  progressContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 350px;
    max-width: 450px;
    animation: slideIn 0.3s ease-out;
  `;
  
  progressContainer.innerHTML = `
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="display: flex; align-items: center;">
        <span class="spinner-border spinner-border-sm me-2" id="spinner-${modelName}"></span>
        <strong id="title-${modelName}">Downloading ${modelName}</strong>
      </div>
      <button class="btn btn-sm btn-outline-danger" id="cancel-${modelName}" style="padding: 2px 8px; font-size: 0.75rem;">
        Cancel
      </button>
    </div>
    <div class="progress" style="height: 10px; margin-bottom: 10px;">
      <div class="progress-bar progress-bar-striped progress-bar-animated" 
           id="progress-bar-${modelName}" 
           role="progressbar" 
           style="width: 0%"
           aria-valuenow="0" 
           aria-valuemin="0" 
           aria-valuemax="100">
      </div>
    </div>
    <div id="progress-text-${modelName}" style="font-size: 12px; color: #666;">
      Starting download...
    </div>
    <div id="progress-details-${modelName}" style="font-size: 11px; color: #999; margin-top: 5px;">
      Preparing...
    </div>
  `;
  
  document.body.appendChild(progressContainer);
  
  // Add cancel button handler
  const cancelBtn = document.getElementById(`cancel-${modelName}`);
  cancelBtn.addEventListener('click', () => cancelDownload(modelName));
  
  return progressContainer;
}

/**
 * Update progress container with download progress
 */
function updateProgressContainer(modelName, progress, message, details = {}) {
  const progressBar = document.getElementById(`progress-bar-${modelName}`);
  const progressText = document.getElementById(`progress-text-${modelName}`);
  const progressDetails = document.getElementById(`progress-details-${modelName}`);
  
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    
    // Change color based on progress
    if (progress >= 100) {
      progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
      progressBar.classList.add('bg-success');
    }
  }
  
  if (progressText) {
    progressText.textContent = `${message} (${Math.round(progress)}%)`;
  }
  
  if (progressDetails && details) {
    const detailParts = [];
    if (details.downloaded) detailParts.push(`Downloaded: ${details.downloaded}`);
    if (details.speed) detailParts.push(`Speed: ${details.speed}`);
    if (details.eta) detailParts.push(`ETA: ${details.eta}`);
    
    if (detailParts.length > 0) {
      progressDetails.textContent = detailParts.join(' • ');
    }
  }
}

/**
 * Mark download as complete
 */
function markDownloadComplete(modelName) {
  const progressContainer = document.getElementById(`progress-${modelName}`);
  const spinner = document.getElementById(`spinner-${modelName}`);
  const title = document.getElementById(`title-${modelName}`);
  const cancelBtn = document.getElementById(`cancel-${modelName}`);
  const progressBar = document.getElementById(`progress-bar-${modelName}`);
  const progressText = document.getElementById(`progress-text-${modelName}`);
  
  if (spinner) {
    spinner.className = 'me-2';
    spinner.innerHTML = '✓';
    spinner.style.color = '#28a745';
    spinner.style.fontSize = '1.2em';
  }
  
  if (title) {
    title.textContent = `${modelName} Downloaded!`;
    title.style.color = '#28a745';
  }
  
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
  
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
    progressBar.classList.add('bg-success');
  }
  
  if (progressText) {
    progressText.textContent = 'Download complete!';
    progressText.style.color = '#28a745';
  }
  
  // Update download state
  const state = downloadStates.get(modelName);
  if (state) {
    state.status = 'complete';
    state.progress = 100;
  }
  
  // Mark model as installed in UI
  markModelAsInstalled(modelName);
  
  // Remove progress container after 3 seconds
  setTimeout(() => {
    if (progressContainer && progressContainer.parentNode) {
      progressContainer.remove();
    }
  }, 3000);
}

/**
 * Mark download as failed
 */
function markDownloadFailed(modelName, errorMessage) {
  const progressContainer = document.getElementById(`progress-${modelName}`);
  const spinner = document.getElementById(`spinner-${modelName}`);
  const title = document.getElementById(`title-${modelName}`);
  const cancelBtn = document.getElementById(`cancel-${modelName}`);
  const progressBar = document.getElementById(`progress-bar-${modelName}`);
  const progressText = document.getElementById(`progress-text-${modelName}`);
  
  if (spinner) {
    spinner.className = 'me-2';
    spinner.innerHTML = '✗';
    spinner.style.color = '#dc3545';
    spinner.style.fontSize = '1.2em';
  }
  
  if (title) {
    title.textContent = `${modelName} Download Failed`;
    title.style.color = '#dc3545';
  }
  
  if (cancelBtn) {
    cancelBtn.textContent = 'Close';
    cancelBtn.classList.remove('btn-outline-danger');
    cancelBtn.classList.add('btn-outline-secondary');
    cancelBtn.onclick = () => progressContainer.remove();
  }
  
  if (progressBar) {
    progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
    progressBar.classList.add('bg-danger');
  }
  
  if (progressText) {
    progressText.textContent = errorMessage || 'Download failed';
    progressText.style.color = '#dc3545';
  }
  
  // Update download state
  const state = downloadStates.get(modelName);
  if (state) {
    state.status = 'failed';
    if (state.button) {
      state.button.disabled = false;
      state.button.innerHTML = 'Download';
      state.button.classList.remove('btn-secondary');
      state.button.classList.add('btn-primary');
      state.button.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Cancel an ongoing download
 */
async function cancelDownload(modelName) {
  const state = downloadStates.get(modelName);
  
  if (!state || state.status !== 'downloading') {
    console.log('No active download to cancel for', modelName);
    return;
  }
  
  try {
    // Call cancel API if available
    if (window.electronAPI && window.electronAPI.cancelDownload) {
      await window.electronAPI.cancelDownload(modelName);
    }
    
    // Update UI
    const progressContainer = document.getElementById(`progress-${modelName}`);
    const progressText = document.getElementById(`progress-text-${modelName}`);
    const spinner = document.getElementById(`spinner-${modelName}`);
    
    if (spinner) {
      spinner.className = 'me-2';
      spinner.innerHTML = '⊘';
      spinner.style.color = '#ffc107';
    }
    
    if (progressText) {
      progressText.textContent = 'Download cancelled';
      progressText.style.color = '#ffc107';
    }
    
    // Re-enable button
    if (state.button) {
      state.button.disabled = false;
      state.button.innerHTML = 'Download';
      state.button.classList.remove('btn-secondary');
      state.button.classList.add('btn-primary');
      state.button.style.pointerEvents = 'auto';
    }
    
    // Remove progress container after 2 seconds
    setTimeout(() => {
      if (progressContainer && progressContainer.parentNode) {
        progressContainer.remove();
      }
    }, 2000);
    
    // Clean up state
    downloadStates.delete(modelName);
    
    showToast(`Download of ${modelName} cancelled`, false);
  } catch (error) {
    console.error('Failed to cancel download:', error);
    showToast('Failed to cancel download', false);
  }
}

/**
 * Main download function with improved management
 */
async function downloadLlmModel(modelName, buttonElement) {
  // Validation
  if (!modelName) {
    showToast && showToast("Model name is missing or invalid.", false);
    return;
  }
  
  // Check if already downloading
  const existingState = downloadStates.get(modelName);
  if (existingState && existingState.status === 'downloading') {
    showToast(`${modelName} is already being downloaded`, false);
    return;
  }
  
  // Check if Electron API is available
  if (!window.electronAPI || !window.electronAPI.downloadModel) {
    showToast('Download functionality not available', false);
    return;
  }
  
  // Get button element
  const button = buttonElement || event?.target;
  
  // Disable button
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Starting...';
    button.classList.remove('btn-primary');
    button.classList.add('btn-secondary');
    button.style.pointerEvents = 'none';
  }
  
  // Create progress container
  const progressContainer = createProgressContainer(modelName);
  
  // Initialize download state
  downloadStates.set(modelName, {
    status: 'downloading',
    progress: 0,
    button: button,
    container: progressContainer
  });
  
  try {
    console.log(`Starting download of model: ${modelName}`);
    showToast(`Starting download of ${modelName}...`, true);
    
    // Set up progress listener
    let lastProgress = 0;
    const progressListener = (data) => {
      if (data.modelName === modelName) {
        const progress = data.progress || 0;
        const message = data.message || 'Downloading...';
        const details = data.details || {};
        
        // Update progress container
        updateProgressContainer(modelName, progress, message, details);
        
        // Update button
        if (button) {
          button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${Math.round(progress)}%`;
        }
        
        // Update state
        const state = downloadStates.get(modelName);
        if (state) {
          state.progress = progress;
        }
        
        // Show toast every 20%
        if (progress - lastProgress >= 20) {
          showToast(`Downloading ${modelName}: ${Math.round(progress)}%`, true);
          lastProgress = progress;
        }
      }
    };
    
    // Register progress listener
    if (window.electronAPI.onModelDownloadProgress) {
      window.electronAPI.onModelDownloadProgress(progressListener);
    }
    
    // Start the download
    await window.electronAPI.downloadModel(modelName);
    
    // Success!
    markDownloadComplete(modelName);
    showToast(`Successfully downloaded ${modelName}!`, true);
    
  } catch (error) {
    console.error(`Failed to download ${modelName}:`, error);
    markDownloadFailed(modelName, error.message || 'Download failed');
    showToast(`Failed to download ${modelName}: ${error.message}`, false);
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDownloadManager);
} else {
  initializeDownloadManager();
}

