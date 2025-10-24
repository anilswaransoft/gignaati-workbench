const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemDetector {
  constructor() {
    this.cachedInfo = null;
  }

  async detectAll() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const [cpu, gpu, memory] = await Promise.all([
      this.detectCPU(),
      this.detectGPU(),
      this.detectMemory()
    ]);

    this.cachedInfo = {
      cpu,
      gpu,
      memory,
      platform: process.platform,
      arch: process.arch,
      timestamp: Date.now()
    };

    return this.cachedInfo;
  }

  async detectCPU() {
    const cpus = os.cpus();
    const model = cpus[0]?.model || 'Unknown CPU';
    const cores = cpus.length;
    const speed = cpus[0]?.speed || 0;

    // Clean up CPU name
    let cleanModel = model
      .replace(/\(R\)/g, '')
      .replace(/\(TM\)/g, '')
      .replace(/CPU/g, '')
      .replace(/Processor/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      model: cleanModel,
      cores,
      threads: cores, // Most modern CPUs have 1 thread per core or 2 with HT
      speed: (speed / 1000).toFixed(1), // Convert to GHz
      speedMHz: speed
    };
  }

  async detectGPU() {
    try {
      if (process.platform === 'win32') {
        return await this.detectGPUWindows();
      } else if (process.platform === 'darwin') {
        return await this.detectGPUMac();
      } else {
        return await this.detectGPULinux();
      }
    } catch (error) {
      console.error('GPU detection failed:', error);
      return {
        model: 'Unknown GPU',
        vram: 0,
        type: 'unknown',
        vendor: 'unknown'
      };
    }
  }

  async detectGPUWindows() {
    try {
      // Use WMIC to get GPU info
      const { stdout } = await execAsync(
        'wmic path win32_VideoController get name,AdapterRAM /format:csv',
        { timeout: 5000, windowsHide: true }
      );

      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node'));
      
      if (lines.length > 0) {
        // Parse CSV output
        const parts = lines[0].split(',');
        const vramBytes = parseInt(parts[1]) || 0;
        const model = (parts[2] || 'Unknown GPU').trim();

        // Detect GPU type
        let type = 'cpu';
        let vendor = 'unknown';
        
        if (model.toLowerCase().includes('nvidia')) {
          type = 'cuda';
          vendor = 'nvidia';
        } else if (model.toLowerCase().includes('amd') || model.toLowerCase().includes('radeon')) {
          type = 'rocm';
          vendor = 'amd';
        } else if (model.toLowerCase().includes('intel')) {
          type = 'oneapi';
          vendor = 'intel';
        }

        return {
          model: model.replace(/\(R\)/g, '').replace(/\(TM\)/g, '').trim(),
          vram: Math.round(vramBytes / (1024 * 1024 * 1024)), // Convert to GB
          type,
          vendor
        };
      }
    } catch (error) {
      console.error('Windows GPU detection failed:', error);
    }

    return {
      model: 'Integrated Graphics',
      vram: 0,
      type: 'cpu',
      vendor: 'unknown'
    };
  }

  async detectGPUMac() {
    try {
      const { stdout } = await execAsync(
        'system_profiler SPDisplaysDataType',
        { timeout: 5000 }
      );

      // Parse macOS system profiler output
      const lines = stdout.split('\n');
      let model = 'Unknown GPU';
      let vram = 0;

      for (const line of lines) {
        if (line.includes('Chipset Model:')) {
          model = line.split(':')[1].trim();
        }
        if (line.includes('VRAM')) {
          const vramMatch = line.match(/(\d+)\s*(MB|GB)/);
          if (vramMatch) {
            vram = parseInt(vramMatch[1]);
            if (vramMatch[2] === 'MB') {
              vram = Math.round(vram / 1024);
            }
          }
        }
      }

      // Detect Apple Silicon
      let type = 'metal';
      let vendor = 'apple';
      
      if (model.includes('M1') || model.includes('M2') || model.includes('M3')) {
        type = 'metal';
        vendor = 'apple';
      }

      return {
        model,
        vram,
        type,
        vendor
      };
    } catch (error) {
      console.error('macOS GPU detection failed:', error);
      return {
        model: 'Apple GPU',
        vram: 0,
        type: 'metal',
        vendor: 'apple'
      };
    }
  }

  async detectGPULinux() {
    try {
      // Try lspci first
      const { stdout } = await execAsync(
        'lspci | grep -i vga',
        { timeout: 5000 }
      );

      let model = 'Unknown GPU';
      let type = 'cpu';
      let vendor = 'unknown';

      if (stdout.includes('NVIDIA')) {
        type = 'cuda';
        vendor = 'nvidia';
        model = stdout.split(':')[2]?.trim() || 'NVIDIA GPU';
      } else if (stdout.includes('AMD') || stdout.includes('Radeon')) {
        type = 'rocm';
        vendor = 'amd';
        model = stdout.split(':')[2]?.trim() || 'AMD GPU';
      } else if (stdout.includes('Intel')) {
        type = 'oneapi';
        vendor = 'intel';
        model = stdout.split(':')[2]?.trim() || 'Intel GPU';
      }

      // Try to get VRAM (this is harder on Linux)
      let vram = 0;
      try {
        if (vendor === 'nvidia') {
          const { stdout: nvidiaInfo } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits', { timeout: 3000 });
          vram = Math.round(parseInt(nvidiaInfo) / 1024); // Convert MB to GB
        }
      } catch (e) {
        // nvidia-smi not available
      }

      return {
        model,
        vram,
        type,
        vendor
      };
    } catch (error) {
      console.error('Linux GPU detection failed:', error);
      return {
        model: 'Integrated Graphics',
        vram: 0,
        type: 'cpu',
        vendor: 'unknown'
      };
    }
  }

  async detectMemory() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;

    return {
      total: Math.round(totalBytes / (1024 * 1024 * 1024)), // GB
      free: Math.round(freeBytes / (1024 * 1024 * 1024)), // GB
      used: Math.round(usedBytes / (1024 * 1024 * 1024)), // GB
      usagePercent: Math.round((usedBytes / totalBytes) * 100)
    };
  }

  determinePerformanceTier(systemInfo) {
    const { cpu, gpu, memory } = systemInfo;

    let tier = 'BASIC';
    let score = 0;

    // CPU scoring
    if (cpu.cores >= 8) score += 30;
    else if (cpu.cores >= 4) score += 20;
    else score += 10;

    // GPU scoring
    if (gpu.type !== 'cpu' && gpu.vram >= 8) score += 40;
    else if (gpu.type !== 'cpu' && gpu.vram >= 4) score += 30;
    else if (gpu.type !== 'cpu' && gpu.vram >= 2) score += 20;
    else score += 5;

    // Memory scoring
    if (memory.total >= 32) score += 30;
    else if (memory.total >= 16) score += 20;
    else if (memory.total >= 8) score += 10;
    else score += 5;

    // Determine tier
    if (score >= 80) {
      tier = 'PREMIUM';
    } else if (score >= 50) {
      tier = 'STANDARD';
    } else {
      tier = 'BASIC';
    }

    return {
      tier,
      score,
      maxModelSize: this.getMaxModelSize(systemInfo),
      recommendedModels: this.getRecommendedModels(systemInfo),
      performance: this.getPerformanceEstimate(systemInfo)
    };
  }

  getMaxModelSize(systemInfo) {
    const { gpu, memory } = systemInfo;

    // If GPU available, use VRAM
    if (gpu.type !== 'cpu' && gpu.vram > 0) {
      if (gpu.vram >= 24) return '70B';
      if (gpu.vram >= 16) return '34B';
      if (gpu.vram >= 8) return '13B';
      if (gpu.vram >= 4) return '7B';
      return '3B';
    }

    // Otherwise use RAM
    if (memory.total >= 64) return '34B';
    if (memory.total >= 32) return '13B';
    if (memory.total >= 16) return '7B';
    if (memory.total >= 8) return '3B';
    return '1.5B';
  }

  getRecommendedModels(systemInfo) {
    const { gpu, memory } = systemInfo;
    const models = [];

    const hasGPU = gpu.type !== 'cpu' && gpu.vram >= 2;
    const vram = gpu.vram;
    const ram = memory.total;

    if (hasGPU) {
      // GPU-based recommendations
      if (vram >= 8 || ram >= 16) {
        models.push('llama3.2:3b', 'phi3:3.8b', 'mistral:7b');
      }
      if (vram >= 4 || ram >= 12) {
        models.push('llama3.2:3b', 'phi3:3.8b', 'gemma2:2b');
      }
      if (vram >= 2 || ram >= 8) {
        models.push('phi3:3.8b', 'gemma2:2b', 'qwen2:1.5b');
      }
    } else {
      // CPU-only recommendations
      if (ram >= 16) {
        models.push('llama3.2:3b', 'phi3:3.8b');
      }
      if (ram >= 8) {
        models.push('gemma2:2b', 'qwen2:1.5b');
      }
      if (ram >= 4) {
        models.push('qwen2:1.5b');
      }
    }

    return [...new Set(models)]; // Remove duplicates
  }

  getPerformanceEstimate(systemInfo) {
    const { cpu, gpu, memory } = systemInfo;

    if (gpu.type !== 'cpu' && gpu.vram >= 8) {
      return {
        category: 'Excellent',
        tokensPerSec: '40-80',
        description: 'Fast inference with GPU acceleration'
      };
    }

    if (gpu.type !== 'cpu' && gpu.vram >= 4) {
      return {
        category: 'Good',
        tokensPerSec: '20-40',
        description: 'Moderate speed with GPU support'
      };
    }

    if (cpu.cores >= 8 && memory.total >= 16) {
      return {
        category: 'Moderate',
        tokensPerSec: '10-20',
        description: 'CPU-based inference, slower but functional'
      };
    }

    return {
      category: 'Basic',
      tokensPerSec: '5-15',
      description: 'Limited performance, use smaller models'
    };
  }
}

module.exports = SystemDetector;

