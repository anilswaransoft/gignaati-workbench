let hardwareInfo = null;
let selectedModels = [];

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Wizard loaded');
  
  // Setup progress listener
  window.electronAPI.onProgress((data) => {
    handleProgress(data);
  });
});

function startWizard() {
  showStep('step-hardware');
  detectHardware();
}

async function detectHardware() {
  try {
    hardwareInfo = await window.electronAPI.detectHardware();
    displayHardwareResults(hardwareInfo);
  } catch (error) {
    console.error('Hardware detection failed:', error);
    alert('Failed to detect hardware. Please try again.');
  }
}

function displayHardwareResults(hardware) {
  const resultsDiv = document.getElementById('hardware-results');
  const scanProgress = document.getElementById('scan-progress');
  const buttonsDiv = document.getElementById('hardware-buttons');
  
  scanProgress.style.display = 'none';
  resultsDiv.style.display = 'grid';
  buttonsDiv.style.display = 'flex';
  
  const gpuInfo = hardware.gpu.length > 0 ? hardware.gpu[0] : null;
  const accelerationType = hardware.recommendation.accelerationType;
  
  resultsDiv.innerHTML = `
    <div class="hardware-card">
      <h3>💻 CPU</h3>
      <p><strong>${hardware.cpu.brand}</strong></p>
      <p>${hardware.cpu.physicalCores} cores @ ${hardware.cpu.speed} GHz</p>
    </div>
    
    <div class="hardware-card">
      <h3>🎮 GPU</h3>
      ${gpuInfo ? `
        <p><strong>${gpuInfo.vendor} ${gpuInfo.model}</strong></p>
        <p>VRAM: ${Math.round(gpuInfo.vram / 1024)} GB</p>
        <span class="badge ${hardware.recommendation.gpuAcceleration ? 'success' : 'info'}">
          ${accelerationType}
        </span>
      ` : `
        <p>No dedicated GPU detected</p>
        <span class="badge info">CPU Mode</span>
      `}
    </div>
    
    <div class="hardware-card">
      <h3>💾 Memory</h3>
      <p><strong>${hardware.ram.total} GB</strong> Total</p>
      <p>${hardware.ram.available} GB Available</p>
    </div>
    
    <div class="hardware-card" style="grid-column: 1 / -1;">
      <h3>📊 Recommended Configuration</h3>
      <p><strong>Tier:</strong> ${hardware.recommendation.tier}</p>
      <p><strong>Performance:</strong> ${hardware.recommendation.estimatedPerformance}</p>
      <p><strong>Best Models:</strong> ${hardware.recommendation.models.slice(0, 2).join(', ')}</p>
    </div>
  `;
  
  // Pre-select recommended models
  selectedModels = hardware.recommendation.models.slice(0, 1);
}

function proceedToModels() {
  showStep('step-models');
  displayModelSelection();
}

function displayModelSelection() {
  const modelList = document.getElementById('model-list');
  
  const allModels = [
    { name: 'qwen2:1.5b', size: '0.9GB', minRAM: 4, desc: 'Ultra-light model for basic tasks' },
    { name: 'llama3.2:3b', size: '2GB', minRAM: 8, desc: 'Fast and efficient, great for most tasks' },
    { name: 'phi3:3.8b', size: '2.3GB', minRAM: 8, desc: 'Microsoft model, excellent reasoning' },
    { name: 'mistral:7b', size: '4.1GB', minRAM: 12, desc: 'Best quality/performance balance' },
    { name: 'llama3:8b', size: '4.7GB', minRAM: 16, desc: 'High quality responses' },
    { name: 'codellama:13b', size: '7.4GB', minRAM: 20, desc: 'Excellent for coding tasks' }
  ];
  
  modelList.innerHTML = allModels.map(model => {
    const isRecommended = selectedModels.includes(model.name);
    const canRun = hardwareInfo.ram.total >= model.minRAM;
    
    return `
      <div class="model-card ${!canRun ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}">
        <label>
          <input 
            type="checkbox" 
            value="${model.name}"
            ${isRecommended ? 'checked' : ''}
            ${!canRun ? 'disabled' : ''}
            onchange="toggleModel('${model.name}')"
          >
          <div class="model-info">
            <h4>${model.name} ${isRecommended ? '⭐ Recommended' : ''}</h4>
            <p>${model.desc}</p>
            <p class="model-specs">
              Size: ${model.size} | Min RAM: ${model.minRAM}GB
            </p>
          </div>
        </label>
      </div>
    `;
  }).join('');
}

function toggleModel(modelName) {
  const index = selectedModels.indexOf(modelName);
  if (index > -1) {
    selectedModels.splice(index, 1);
  } else {
    selectedModels.push(modelName);
  }
}

async function startInstallation() {
  if (selectedModels.length === 0) {
    alert('Please select at least one model');
    return;
  }
  
  showStep('step-install');
  
  const statusEl = document.getElementById('install-status');
  const progressBar = document.getElementById('install-progress-bar');
  const percentage = document.getElementById('install-percentage');
  const log = document.getElementById('install-log');
  
  function updateProgress(percent, message) {
    progressBar.style.width = `${percent}%`;
    percentage.textContent = `${percent}%`;
    statusEl.textContent = message;
    log.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    log.scrollTop = log.scrollHeight;
  }
  
  try {
    // Step 1: Install Ollama (0-30%)
    updateProgress(5, 'Installing Ollama...');
    await window.electronAPI.installOllama();
    updateProgress(30, 'Ollama installed successfully');
    
    // Step 2: Start Ollama with GPU optimization (30-40%)
    updateProgress(35, 'Configuring GPU acceleration...');
    const ollamaResult = await window.electronAPI.startOllama();
    updateProgress(40, `Ollama started with ${ollamaResult.optimization.accelerationType}`);
    
    // Step 3: Setup N8N (40-50%)
    updateProgress(45, 'Setting up N8N workspace...');
    await window.electronAPI.setupN8N();
    updateProgress(50, 'N8N configured');
    
    // Step 4: Download models (50-80%)
    const modelProgress = 30 / selectedModels.length;
    for (let i = 0; i < selectedModels.length; i++) {
      const model = selectedModels[i];
      const baseProgress = 50 + (i * modelProgress);
      // updateProgress(baseProgress, `Downloading ${model}...`);
      // await window.electronAPI.downloadModel(model);
      // updateProgress(baseProgress + modelProgress, `${model} downloaded`);
    }
    
    // Step 5: Start N8N (80-100%)
    updateProgress(85, 'Starting N8N server...');
    
    //await window.electronAPI.openN8NWindow();
    await window.electronAPI.startN8N();
    updateProgress(100, 'Installation complete!');
    
    setTimeout(() => {
      showStep('step-complete');
    }, 1500);
    
  } catch (error) {
    console.error('Installation failed:', error);
    updateProgress(0, `Error: ${error.message}`);
    alert('Installation failed. Please check the logs and try again.');
  }
}

async function launchApp() {
  try {
    await window.electronAPI.launchApp();
  } catch (error) {
    console.error('Failed to launch app:', error);
    alert('Failed to open N8N. Please open http://localhost:5678 manually.');
  }
}

function showStep(stepId) {
  document.querySelectorAll('.wizard-step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(stepId).classList.add('active');
}

function goBack(stepId) {
  showStep(stepId);
}

function handleProgress(data) {
  console.log('Progress update:', data);
  // Additional progress handling if needed
}
