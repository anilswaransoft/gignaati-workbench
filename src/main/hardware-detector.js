const si = require('systeminformation');
const os = require('os');

class HardwareDetector {
  async detectSystem() {
    console.log('Detecting system hardware...');
    
    const [cpu, gpu, mem, system] = await Promise.all([
      this.detectCPU(),
      this.detectGPU(),
      this.detectRAM(),
      si.system()
    ]);

    const recommendation = this.getRecommendation(cpu, gpu, mem);

    return {
      cpu,
      gpu,
      ram: mem,
      system: {
        manufacturer: system.manufacturer,
        model: system.model
      },
      platform: process.platform,
      arch: process.arch,
      recommendation
    };
  }

  async detectCPU() {
    const cpuInfo = await si.cpu();
    return {
      brand: cpuInfo.brand,
      manufacturer: cpuInfo.manufacturer,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      speed: cpuInfo.speed,
      speedMax: cpuInfo.speedMax,
      speedMin: cpuInfo.speedMin
    };
  }

  async detectGPU() {
    let graphics;
    try {
      graphics = await si.graphics();
    } catch (err) {
      console.error('si.graphics failed:', err && err.message ? err.message : err);
      return [];
    }
    const gpuList = [];

    if (!graphics || !Array.isArray(graphics.controllers)) return [];

    for (const controller of graphics.controllers) {
      const gpuInfo = {
        vendor: controller.vendor,
        model: controller.model,
        vram: controller.vram,
        vramDynamic: controller.vramDynamic,
        bus: controller.bus,
        
        // Detect CUDA support (NVIDIA)
        cudaSupport: this.detectCUDASupport(controller),
        
        // Detect ROCm support (AMD)
        rocmSupport: this.detectROCmSupport(controller),
        
        // Detect Metal support (Apple)
        metalSupport: this.detectMetalSupport(controller)
      };
      
      gpuList.push(gpuInfo);
    }

    return gpuList;
  }

  detectCUDASupport(gpu) {
    const vendor = (gpu.vendor || '').toLowerCase();
    const model = (gpu.model || '').toLowerCase();
    
    if (!vendor.includes('nvidia')) {
      return { supported: false };
    }

    // Check for common NVIDIA GPUs with CUDA support
    const cudaCapable = 
      model.includes('rtx') || 
      model.includes('gtx') || 
      model.includes('tesla') || 
      model.includes('quadro') ||
      model.includes('titan') ||
      model.includes('a100') ||
      model.includes('v100');

    if (!cudaCapable) {
      return { supported: false };
    }

    return {
      supported: true,
      version: this.estimateCUDAVersion(model),
      compute: this.getNVIDIAComputeCapability(model),
      recommended: true
    };
  }

  detectROCmSupport(gpu) {
    const vendor = (gpu.vendor || '').toLowerCase();
    const model = (gpu.model || '').toLowerCase();
    
    if (!vendor.includes('amd') && !vendor.includes('advanced micro devices')) {
      return { supported: false };
    }

    // Check for ROCm-supported AMD GPUs
    const supportedArchs = ['vega', 'navi', 'rdna', 'mi', 'rx 6', 'rx 7'];
    const isSupported = supportedArchs.some(arch => model.includes(arch));

    if (!isSupported) {
      return { supported: false };
    }

    return {
      supported: true,
      version: '5.6+',
      architecture: this.getAMDArchitecture(model),
      recommended: true
    };
  }

  detectMetalSupport(gpu) {
    if (process.platform !== 'darwin') {
      return { supported: false };
    }

    const vendor = (gpu.vendor || '').toLowerCase();
    const model = (gpu.model || '').toLowerCase();
    
    // Apple Silicon or AMD on Mac
    const isAppleSilicon = vendor.includes('apple') || model.includes('m1') || model.includes('m2') || model.includes('m3');
    const isAMDMac = vendor.includes('amd');

    return {
      supported: isAppleSilicon || isAMDMac,
      architecture: isAppleSilicon ? 'Apple Silicon' : 'AMD',
      recommended: isAppleSilicon
    };
  }

  estimateCUDAVersion(model) {
    model = model.toLowerCase();
    if (model.includes('rtx 40')) return '12.0+';
    if (model.includes('rtx 30')) return '11.0+';
    if (model.includes('rtx 20') || model.includes('gtx 16')) return '10.0+';
    if (model.includes('a100')) return '11.0+';
    if (model.includes('v100')) return '9.0+';
    return '10.0+';
  }

  getNVIDIAComputeCapability(model) {
    model = model.toLowerCase();
    if (model.includes('rtx 40')) return '8.9';
    if (model.includes('rtx 30')) return '8.6';
    if (model.includes('a100')) return '8.0';
    if (model.includes('v100')) return '7.0';
    if (model.includes('rtx 20') || model.includes('gtx 16')) return '7.5';
    return '7.0+';
  }

  getAMDArchitecture(model) {
    model = model.toLowerCase();
    if (model.includes('rx 7') || model.includes('7900') || model.includes('7800')) return 'RDNA3';
    if (model.includes('rx 6') || model.includes('6900') || model.includes('6800')) return 'RDNA2';
    if (model.includes('vega')) return 'Vega';
    if (model.includes('mi')) return 'CDNA';
    return 'Unknown';
  }

  async detectRAM() {
    const mem = await si.mem();
    return {
      total: Math.round(mem.total / 1024 / 1024 / 1024), // GB
      free: Math.round(mem.free / 1024 / 1024 / 1024), // GB
      used: Math.round(mem.used / 1024 / 1024 / 1024), // GB
      available: Math.round(mem.available / 1024 / 1024 / 1024) // GB
    };
  }

  getRecommendation(cpu, gpu, ram) {
    const totalRAM = ram.total;
    const hasGPU = gpu.length > 0 && gpu[0].vram > 0;
    const hasCUDA = gpu.some(g => g.cudaSupport?.supported);
    const hasROCm = gpu.some(g => g.rocmSupport?.supported);
    const hasMetal = gpu.some(g => g.metalSupport?.supported);
    const hasAcceleration = hasCUDA || hasROCm || hasMetal;

    // Determine tier based on RAM
    let tier, models, maxModelSize, estimatedPerformance;

    if (totalRAM < 8) {
      tier = 'MINIMAL';
      models = ['qwen2:1.5b', 'tinyllama:1.1b'];
      maxModelSize = '1.5B';
      estimatedPerformance = 'Basic (10-15 tokens/sec)';
    } else if (totalRAM >= 8 && totalRAM < 16) {
      tier = 'STANDARD';
      models = ['llama3.2:3b', 'phi3:3.8b', 'mistral:7b'];
      maxModelSize = '7B';
      estimatedPerformance = hasAcceleration ? 
        'Good (30-50 tokens/sec)' : 
        'Moderate (15-25 tokens/sec)';
    } else if (totalRAM >= 16 && totalRAM < 32) {
      tier = 'ADVANCED';
      models = ['llama3:8b', 'mistral:7b-instruct', 'codellama:13b'];
      maxModelSize = '13B';
      estimatedPerformance = hasAcceleration ? 
        'Excellent (60-100 tokens/sec)' : 
        'Good (25-40 tokens/sec)';
    } else {
      tier = 'PROFESSIONAL';
      models = ['llama3:70b', 'mixtral:8x7b', 'deepseek-coder:33b'];
      maxModelSize = '70B';
      estimatedPerformance = hasAcceleration ? 
        'Outstanding (100+ tokens/sec)' : 
        'Very Good (40-60 tokens/sec)';
    }

    return {
      tier,
      models,
      maxModelSize,
      gpuAcceleration: hasAcceleration,
      accelerationType: hasCUDA ? 'NVIDIA CUDA' : hasROCm ? 'AMD ROCm' : hasMetal ? 'Apple Metal' : 'CPU Only',
      estimatedPerformance,
      recommendedModel: models[0]
    };
  }
}

module.exports = HardwareDetector;
