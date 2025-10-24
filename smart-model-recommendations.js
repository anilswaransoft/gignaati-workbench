// Smart Model Recommendations
// Enhances LLM model display with intelligent recommendations based on user's hardware

function enhanceLLMModelDisplay() {
  const systemInfo = window.detectedSystemInfo;
  if (!systemInfo) {
    console.log('System info not available yet, will enhance later');
    return;
  }

  const llmContainer = document.getElementById('llm-list-container');
  if (!llmContainer) {
    return;
  }

  // Get all model cards
  const modelCards = llmContainer.querySelectorAll('.col-lg-4, .col-md-6, .llm-box');

  modelCards.forEach(card => {
    enhanceModelCard(card, systemInfo);
  });
}

function enhanceModelCard(card, systemInfo) {
  // Find model name from the card
  const modelNameEl = card.querySelector('h3');
  if (!modelNameEl) return;

  const modelName = modelNameEl.textContent.trim().toLowerCase();
  
  // Get recommended models
  const recommendedModels = systemInfo.performance?.recommendedModels || [];
  const isRecommended = recommendedModels.some(rec => modelName.includes(rec.toLowerCase()));

  // Check if model can run
  const canRun = canRunModel(modelName);
  const performance = getModelPerformanceEstimate(modelName);

  // Add recommendation badge
  if (isRecommended) {
    addRecommendationBadge(card, 'RECOMMENDED FOR YOUR SYSTEM');
  }

  // Add performance indicator
  addPerformanceIndicator(card, performance, canRun);
}

function addRecommendationBadge(card, text) {
  // Check if badge already exists
  if (card.querySelector('.recommendation-badge')) {
    return;
  }

  const badge = document.createElement('div');
  badge.className = 'recommendation-badge';
  badge.innerHTML = `
    <style>
      .recommendation-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .recommendation-badge::before {
        content: '⭐';
        font-size: 0.9rem;
      }
    </style>
    ${text}
  `;

  // Make card position relative if not already
  if (getComputedStyle(card).position === 'static') {
    card.style.position = 'relative';
  }

  card.appendChild(badge);
}

function addPerformanceIndicator(card, performance, canRun) {
  // Check if indicator already exists
  if (card.querySelector('.performance-indicator')) {
    return;
  }

  const indicator = document.createElement('div');
  indicator.className = 'performance-indicator';

  let color = '#10b981'; // Green
  let icon = '⚡';
  let text = performance;

  if (performance === 'Excellent') {
    color = '#10b981';
    icon = '⚡⚡⚡';
  } else if (performance === 'Good') {
    color = '#3b82f6';
    icon = '⚡⚡';
  } else if (performance === 'Moderate') {
    color = '#f59e0b';
    icon = '⚡';
  } else if (performance === 'Slow') {
    color = '#ef4444';
    icon = '🐌';
  }

  if (!canRun) {
    color = '#ef4444';
    icon = '⚠️';
    text = 'May not run smoothly';
  }

  indicator.innerHTML = `
    <style>
      .performance-indicator {
        margin-top: 8px;
        padding: 8px 12px;
        background: ${color}15;
        border-left: 3px solid ${color};
        border-radius: 6px;
        font-size: 0.85rem;
        color: ${color};
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .performance-indicator-icon {
        font-size: 1rem;
      }
    </style>
    <span class="performance-indicator-icon">${icon}</span>
    <span>${text}</span>
  `;

  // Find a good place to insert the indicator
  const downloadBtn = card.querySelector('button');
  if (downloadBtn && downloadBtn.parentElement) {
    downloadBtn.parentElement.appendChild(indicator);
  } else {
    card.appendChild(indicator);
  }
}

// Auto-sort models: Recommended first
function sortModelsByRecommendation() {
  const systemInfo = window.detectedSystemInfo;
  if (!systemInfo) return;

  const llmContainer = document.getElementById('llm-list-container');
  if (!llmContainer) return;

  const recommendedModels = systemInfo.performance?.recommendedModels || [];
  
  // Get all model cards
  const cards = Array.from(llmContainer.children);

  // Sort: recommended first, then alphabetically
  cards.sort((a, b) => {
    const aName = a.querySelector('h3')?.textContent.trim().toLowerCase() || '';
    const bName = b.querySelector('h3')?.textContent.trim().toLowerCase() || '';

    const aRecommended = recommendedModels.some(rec => aName.includes(rec.toLowerCase()));
    const bRecommended = recommendedModels.some(rec => bName.includes(rec.toLowerCase()));

    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;

    return aName.localeCompare(bName);
  });

  // Re-append in sorted order
  cards.forEach(card => llmContainer.appendChild(card));
}

// Add system info banner at top of Models page
function addSystemInfoBanner() {
  const systemInfo = window.detectedSystemInfo;
  if (!systemInfo) return;

  const llmContainer = document.getElementById('llm-container');
  if (!llmContainer) return;

  // Check if banner already exists
  if (document.getElementById('system-info-banner')) return;

  const { cpu, gpu, memory, performance } = systemInfo;

  const banner = document.createElement('div');
  banner.id = 'system-info-banner';
  banner.innerHTML = `
    <style>
      #system-info-banner {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
      }
      
      .banner-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .banner-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .banner-stat {
        background: rgba(255, 255, 255, 0.15);
        padding: 12px;
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }
      
      .banner-stat-label {
        font-size: 0.75rem;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      
      .banner-stat-value {
        font-size: 1rem;
        font-weight: 600;
      }
      
      .banner-recommendation {
        margin-top: 15px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    </style>
    
    <div class="banner-title">
      <span>💻</span>
      <span>Your System Configuration</span>
    </div>
    
    <div class="banner-stats">
      <div class="banner-stat">
        <div class="banner-stat-label">Processor</div>
        <div class="banner-stat-value">${cpu.cores} cores @ ${cpu.speed} GHz</div>
      </div>
      
      <div class="banner-stat">
        <div class="banner-stat-label">Memory</div>
        <div class="banner-stat-value">${memory.total} GB RAM</div>
      </div>
      
      <div class="banner-stat">
        <div class="banner-stat-label">Graphics</div>
        <div class="banner-stat-value">${gpu.vram > 0 ? gpu.vram + ' GB VRAM' : 'Integrated'}</div>
      </div>
      
      <div class="banner-stat">
        <div class="banner-stat-label">Performance Tier</div>
        <div class="banner-stat-value">${performance.tier}</div>
      </div>
    </div>
    
    <div class="banner-recommendation">
      <span>💡</span>
      <span>Best models for your system: <strong>${performance.recommendedModels.join(', ')}</strong></span>
    </div>
  `;

  // Insert banner at the top of llm-container
  const topHeading = llmContainer.querySelector('.top-heading-sec');
  if (topHeading) {
    topHeading.after(banner);
  } else {
    llmContainer.prepend(banner);
  }
}

// Observe DOM changes to enhance new model cards
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.matches && node.matches('.col-lg-4, .col-md-6, .llm-box')) {
          if (window.detectedSystemInfo) {
            enhanceModelCard(node, window.detectedSystemInfo);
          }
        }
      });
    }
  });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSmartRecommendations);
} else {
  initSmartRecommendations();
}

function initSmartRecommendations() {
  // Wait for system detection
  const checkInterval = setInterval(() => {
    if (window.detectedSystemInfo) {
      clearInterval(checkInterval);
      
      // Add system info banner
      addSystemInfoBanner();
      
      // Enhance existing models
      enhanceLLMModelDisplay();
      
      // Sort models
      sortModelsByRecommendation();
      
      // Start observing for new models
      const llmContainer = document.getElementById('llm-list-container');
      if (llmContainer) {
        observer.observe(llmContainer, {
          childList: true,
          subtree: true
        });
      }
    }
  }, 500);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkInterval), 10000);
}

// Re-enhance when Models tab is clicked
document.addEventListener('click', (e) => {
  if (e.target && e.target.textContent === 'Models') {
    setTimeout(() => {
      addSystemInfoBanner();
      enhanceLLMModelDisplay();
      sortModelsByRecommendation();
    }, 300);
  }
});

