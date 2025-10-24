class SystemOptimizer {
  constructor(hardwareInfo) {
    this.hardwareInfo = hardwareInfo;
  }

  generateOllamaEnv() {
    const env = {};
    const gpu = this.hardwareInfo.gpu[0];
    const ram = this.hardwareInfo.ram.total;

    // GPU Configuration
    if (gpu && gpu.cudaSupport?.supported) {
      // NVIDIA CUDA optimization
      env.OLLAMA_NUM_GPU = '1';
      env.CUDA_VISIBLE_DEVICES = '0';
      env.CUDA_LAUNCH_BLOCKING = '0';
      env.CUDA_CACHE_MAXSIZE = '2147483648'; // 2GB
      
      // Memory based on VRAM
      const vramGB = gpu.vram / 1024;
      env.OLLAMA_MAX_LOADED_MODELS = Math.max(1, Math.floor(vramGB / 6)).toString();
      
    } else if (gpu && gpu.rocmSupport?.supported) {
      // AMD ROCm optimization
      env.OLLAMA_NUM_GPU = '1';
      env.HSA_OVERRIDE_GFX_VERSION = this.getROCmGFXVersion(gpu);
      env.GPU_MAX_HEAP_SIZE = '100';
      env.GPU_MAX_ALLOC_PERCENT = '100';
      
    } else if (gpu && gpu.metalSupport?.supported) {
      // Apple Metal optimization
      env.OLLAMA_NUM_GPU = '1';
      // Metal is auto-detected by Ollama on macOS
      
    } else {
      // CPU-only optimization
      env.OLLAMA_NUM_THREADS = Math.max(4, this.hardwareInfo.cpu.physicalCores - 2).toString();
      env.OLLAMA_NUM_GPU = '0';
    }

    // Memory management
    env.OLLAMA_MAX_MEMORY = `${Math.floor(ram * 0.75)}GB`;
    
    // Performance tuning
    env.OLLAMA_KEEP_ALIVE = '5m'; // Keep model loaded for 5 minutes
    env.OLLAMA_MAX_QUEUE = '512';
    
    return env;
  }

  getROCmGFXVersion(gpu) {
    const arch = gpu.rocmSupport?.architecture;
    const versionMap = {
      'RDNA3': '11.0.0',
      'RDNA2': '10.3.0',
      'Vega': '9.0.0',
      'CDNA': '9.0.0'
    };
    return versionMap[arch] || '10.3.0';
  }

  getOptimizationSummary() {
    const gpu = this.hardwareInfo.gpu[0];
    const summary = {
      accelerationType: 'CPU Only',
      expectedSpeed: 'Moderate',
      recommendations: []
    };

    if (gpu?.cudaSupport?.supported) {
      summary.accelerationType = 'NVIDIA CUDA';
      summary.expectedSpeed = 'Fast';
      summary.recommendations.push('GPU acceleration enabled');
      summary.recommendations.push(`Using ${gpu.model} with ${Math.round(gpu.vram/1024)}GB VRAM`);
      
    } else if (gpu?.rocmSupport?.supported) {
      summary.accelerationType = 'AMD ROCm';
      summary.expectedSpeed = 'Fast';
      summary.recommendations.push('GPU acceleration enabled');
      summary.recommendations.push(`Using ${gpu.model} with ${Math.round(gpu.vram/1024)}GB VRAM`);
      
    } else if (gpu?.metalSupport?.supported) {
      summary.accelerationType = 'Apple Metal';
      summary.expectedSpeed = 'Very Fast';
      summary.recommendations.push('Apple Silicon GPU acceleration enabled');
      
    } else {
      summary.recommendations.push(`Using ${this.hardwareInfo.cpu.physicalCores} CPU cores`);
      summary.recommendations.push('Consider a GPU for better performance');
    }

    return summary;
  }
}

module.exports = SystemOptimizer;
