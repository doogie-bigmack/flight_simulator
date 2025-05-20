/**
 * Performance tests for Sky Squad flight simulator
 * 
 * This script measures key performance metrics:
 * - Frame rate (FPS)
 * - Render time
 * - Memory usage
 * - Asset loading times
 * - Network latency
 */

// Constants for performance thresholds
const TARGET_FPS = 60;
const MIN_ACCEPTABLE_FPS = 30;
const MAX_FRAME_TIME_MS = 16; // ~60fps
const MAX_LOAD_TIME_MS = 3000;
const MAX_PING_TIME_MS = 100;

// Test results storage
let results = {
  fps: [],
  frameTime: [],
  memoryUsage: [],
  loadTime: null,
  pingTimes: []
};

// Performance metrics logging
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      component: 'PerformanceTest',
      message,
      ...data
    }));
  },
  error: (message, data = {}) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: 'PerformanceTest',
      message,
      ...data
    }));
  }
};

/**
 * Frame rate monitor
 */
class FPSMonitor {
  constructor(sampleSize = 60) {
    this.sampleSize = sampleSize;
    this.frames = 0;
    this.lastTime = performance.now();
    this.times = [];
    this.running = false;
  }
  
  start() {
    this.running = true;
    this.frames = 0;
    this.lastTime = performance.now();
    this.times = [];
    this._update();
  }
  
  stop() {
    this.running = false;
    return this.getResults();
  }
  
  _update() {
    if (!this.running) return;
    
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    this.frames++;
    
    if (elapsed >= 1000) {
      const fps = Math.round((this.frames * 1000) / elapsed);
      const frameTime = elapsed / this.frames;
      
      this.times.push({ fps, frameTime });
      
      this.frames = 0;
      this.lastTime = now;
      
      // Keep only the last N samples
      if (this.times.length > this.sampleSize) {
        this.times.shift();
      }
    }
    
    requestAnimationFrame(() => this._update());
  }
  
  getResults() {
    if (this.times.length === 0) return { fps: 0, frameTime: 0 };
    
    const fpsSum = this.times.reduce((sum, time) => sum + time.fps, 0);
    const frameTimeSum = this.times.reduce((sum, time) => sum + time.frameTime, 0);
    
    return {
      fps: fpsSum / this.times.length,
      frameTime: frameTimeSum / this.times.length
    };
  }
}

/**
 * Memory usage monitor
 */
class MemoryMonitor {
  constructor(interval = 1000) {
    this.interval = interval;
    this.samples = [];
    this.intervalId = null;
  }
  
  start() {
    this.samples = [];
    this.intervalId = setInterval(() => {
      if (performance.memory) {
        this.samples.push({
          timestamp: performance.now(),
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        });
      }
    }, this.interval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.getResults();
  }
  
  getResults() {
    if (this.samples.length === 0) {
      return { avg: 0, max: 0, min: 0 };
    }
    
    const usedHeapSizes = this.samples.map(sample => sample.usedJSHeapSize);
    const sum = usedHeapSizes.reduce((acc, val) => acc + val, 0);
    const avg = sum / usedHeapSizes.length;
    const max = Math.max(...usedHeapSizes);
    const min = Math.min(...usedHeapSizes);
    
    return {
      avg: avg / (1024 * 1024), // Convert to MB
      max: max / (1024 * 1024),
      min: min / (1024 * 1024)
    };
  }
}

/**
 * Network latency test
 */
class NetworkTest {
  constructor(socket, sampleSize = 10) {
    this.socket = socket;
    this.sampleSize = sampleSize;
    this.pingTimes = [];
  }
  
  async measure() {
    if (!this.socket) {
      logger.error('Socket not available for network test');
      return { avg: -1, max: -1, min: -1 };
    }
    
    this.pingTimes = [];
    
    for (let i = 0; i < this.sampleSize; i++) {
      const start = performance.now();
      
      await new Promise((resolve) => {
        this.socket.emit('ping', () => {
          const end = performance.now();
          this.pingTimes.push(end - start);
          resolve();
        });
        
        // Timeout after 2 seconds
        setTimeout(() => {
          logger.error('Ping timeout');
          this.pingTimes.push(2000); // Use 2000ms as timeout value
          resolve();
        }, 2000);
      });
      
      // Wait between pings
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return this.getResults();
  }
  
  getResults() {
    if (this.pingTimes.length === 0) {
      return { avg: -1, max: -1, min: -1 };
    }
    
    const sum = this.pingTimes.reduce((acc, val) => acc + val, 0);
    const avg = sum / this.pingTimes.length;
    const max = Math.max(...this.pingTimes);
    const min = Math.min(...this.pingTimes);
    
    return { avg, max, min };
  }
}

/**
 * Asset loading time test
 */
class AssetLoadTest {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
  }
  
  start() {
    this.startTime = performance.now();
  }
  
  end() {
    this.endTime = performance.now();
    return this.getResults();
  }
  
  getResults() {
    return this.endTime - this.startTime;
  }
}

/**
 * Run a complete performance test suite
 * @param {Object} options - Test options
 * @returns {Promise<Object>} - Test results
 */
async function runPerformanceTest(options = {}) {
  const {
    duration = 10, // seconds
    fpsOnly = false,
    socket = null
  } = options;
  
  logger.info('Starting performance test', { duration, fpsOnly });
  
  // Initialize test monitors
  const fpsMonitor = new FPSMonitor();
  const memoryMonitor = performance.memory ? new MemoryMonitor() : null;
  const networkTest = socket ? new NetworkTest(socket) : null;
  const loadTest = new AssetLoadTest();
  
  // Start load time measurement
  loadTest.start();
  
  // Initialize the game (this function should be provided by the game)
  // This will measure how long it takes to load all game assets
  await game.initialize();
  
  // End load time measurement
  results.loadTime = loadTest.end();
  
  // Start performance monitoring
  fpsMonitor.start();
  if (memoryMonitor) memoryMonitor.start();
  
  // Run the simulation for the specified duration
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  
  // Stop monitoring
  const fpsResults = fpsMonitor.stop();
  results.fps = fpsResults.fps;
  results.frameTime = fpsResults.frameTime;
  
  if (memoryMonitor) {
    results.memoryUsage = memoryMonitor.stop();
  }
  
  // Run network tests if not FPS-only mode
  if (!fpsOnly && networkTest) {
    results.pingTimes = await networkTest.measure();
  }
  
  // Analyze results
  const analysis = analyzeResults(results);
  
  // Log overall results
  logger.info('Performance test completed', { 
    results, 
    analysis,
    passed: analysis.passed
  });
  
  return { results, analysis };
}

/**
 * Analyze test results against performance thresholds
 * @param {Object} results - Test results
 * @returns {Object} - Analysis of results
 */
function analyzeResults(results) {
  const analysis = {
    fps: {
      value: results.fps,
      target: TARGET_FPS,
      minimum: MIN_ACCEPTABLE_FPS,
      passed: results.fps >= MIN_ACCEPTABLE_FPS,
      optimal: results.fps >= TARGET_FPS,
      status: results.fps >= TARGET_FPS ? 'optimal' : 
              results.fps >= MIN_ACCEPTABLE_FPS ? 'acceptable' : 'poor'
    },
    frameTime: {
      value: results.frameTime,
      target: MAX_FRAME_TIME_MS,
      passed: results.frameTime <= MAX_FRAME_TIME_MS,
      status: results.frameTime <= MAX_FRAME_TIME_MS ? 'good' : 'poor'
    },
    loadTime: {
      value: results.loadTime,
      target: MAX_LOAD_TIME_MS,
      passed: results.loadTime <= MAX_LOAD_TIME_MS,
      status: results.loadTime <= MAX_LOAD_TIME_MS ? 'good' : 'slow'
    },
    passed: false
  };
  
  // Add memory analysis if available
  if (results.memoryUsage && typeof results.memoryUsage.avg === 'number') {
    analysis.memory = {
      value: results.memoryUsage.avg,
      peak: results.memoryUsage.max,
      status: 'info' // Just informational, no pass/fail
    };
  }
  
  // Add network analysis if available
  if (results.pingTimes && typeof results.pingTimes.avg === 'number') {
    analysis.network = {
      value: results.pingTimes.avg,
      target: MAX_PING_TIME_MS,
      passed: results.pingTimes.avg <= MAX_PING_TIME_MS,
      status: results.pingTimes.avg <= MAX_PING_TIME_MS ? 'good' : 'poor'
    };
  }
  
  // Overall pass: FPS, frame time, and load time all pass their thresholds
  analysis.passed = analysis.fps.passed && 
                    analysis.frameTime.passed && 
                    analysis.loadTime.passed &&
                    (!analysis.network || analysis.network.passed);
  
  return analysis;
}

// Export as module if in Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runPerformanceTest,
    FPSMonitor,
    MemoryMonitor,
    NetworkTest,
    AssetLoadTest,
    analyzeResults
  };
}
