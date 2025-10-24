// System Detection UI Integration
// This file handles displaying detected system information in the UI

async function detectAndDisplaySystemInfo() {
  try {
    if (!window.electronAPI || !window.electronAPI.detectSystemFull) {
      console.warn('System detection API not available');
      return;
    }

    const systemInfo = await window.electronAPI.detectSystemFull();
    console.log('Detected system:', systemInfo);

    // Update system requirements modal
    updateSystemRequirementsModal(systemInfo);

    // Store for later use
    window.detectedSystemInfo = systemInfo;

    return systemInfo;
  } catch (error) {
    console.error('Failed to detect system:', error);
    return null;
  }
}

function updateSystemRequirementsModal(systemInfo) {
  const { cpu, gpu, memory, performance } = systemInfo;

  // Update CPU
  const cpuEl = document.getElementById('sys-req-cpu');
  if (cpuEl) {
    cpuEl.textContent = `${cpu.model} (${cpu.cores} cores @ ${cpu.speed} GHz)`;
  }

  // Update Memory
  const memoryEl = document.getElementById('sys-req-memory');
  if (memoryEl) {
    memoryEl.textContent = `${memory.total} GB (${memory.free} GB available)`;
  }

  // Update GPU
  const gpuEl = document.getElementById('sys-req-gpu');
  if (gpuEl) {
    let gpuText = gpu.model;
    if (gpu.vram > 0) {
      gpuText += ` (${gpu.vram} GB VRAM)`;
    }
    if (gpu.type !== 'cpu') {
      gpuText += ` ✓`;
    }
    gpuEl.textContent = gpuText;
  }

  // Update performance tier badge
  if (performance) {
    const badge = document.getElementById('performance-tier-badge');
    const tierName = document.getElementById('tier-name');
    const tierDesc = document.getElementById('tier-description');

    if (badge && tierName && tierDesc) {
      badge.style.display = 'block';

      // Set tier name and color
      tierName.textContent = performance.tier;

      if (performance.tier === 'PREMIUM') {
        badge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        badge.style.color = 'white';
        tierName.style.color = 'white';
        tierDesc.style.color = 'rgba(255,255,255,0.9)';
      } else if (performance.tier === 'STANDARD') {
        badge.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        badge.style.color = 'white';
        tierName.style.color = 'white';
        tierDesc.style.color = 'rgba(255,255,255,0.9)';
      } else {
        badge.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        badge.style.color = 'white';
        tierName.style.color = 'white';
        tierDesc.style.color = 'rgba(255,255,255,0.9)';
      }

      tierDesc.textContent = performance.performance.description;
    }
  }
}

function getRecommendedModelsForSystem() {
  if (!window.detectedSystemInfo || !window.detectedSystemInfo.performance) {
    return [];
  }

  return window.detectedSystemInfo.performance.recommendedModels || [];
}

function getSystemPerformanceTier() {
  if (!window.detectedSystemInfo || !window.detectedSystemInfo.performance) {
    return 'BASIC';
  }

  return window.detectedSystemInfo.performance.tier;
}

function canRunModel(modelName, modelSize) {
  if (!window.detectedSystemInfo || !window.detectedSystemInfo.performance) {
    return true; // Allow by default if detection failed
  }

  const maxSize = window.detectedSystemInfo.performance.maxModelSize;

  // Extract size from model name (e.g., "llama3:7b" -> "7B")
  const sizeMatch = modelName.match(/(\d+\.?\d*)b/i) || modelSize?.match(/(\d+\.?\d*)b/i);
  if (!sizeMatch) {
    return true; // Can't determine size, allow it
  }

  const requestedSize = parseFloat(sizeMatch[1]);
  const maxSizeNum = parseFloat(maxSize);

  return requestedSize <= maxSizeNum;
}

function getModelPerformanceEstimate(modelName) {
  if (!window.detectedSystemInfo || !window.detectedSystemInfo.performance) {
    return 'Unknown';
  }

  const { gpu, performance } = window.detectedSystemInfo;
  const hasGPU = gpu.type !== 'cpu' && gpu.vram >= 2;

  // Extract model size
  const sizeMatch = modelName.match(/(\d+\.?\d*)b/i);
  if (!sizeMatch) {
    return performance.performance.category;
  }

  const modelSize = parseFloat(sizeMatch[1]);

  if (hasGPU) {
    if (gpu.vram >= modelSize * 2) {
      return 'Excellent';
    } else if (gpu.vram >= modelSize) {
      return 'Good';
    } else {
      return 'Moderate';
    }
  } else {
    if (modelSize <= 3) {
      return 'Moderate';
    } else {
      return 'Slow';
    }
  }
}

// Auto-detect on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(detectAndDisplaySystemInfo, 500);
  });
} else {
  setTimeout(detectAndDisplaySystemInfo, 500);
}

// Also detect when system requirements modal is opened
const systemReqModal = document.getElementById('systemRequirementsModal');
if (systemReqModal) {
  systemReqModal.addEventListener('show.bs.modal', () => {
    if (!window.detectedSystemInfo) {
      detectAndDisplaySystemInfo();
    }
  });
}

