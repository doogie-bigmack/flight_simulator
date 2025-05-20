/**
 * Jest setup file for frontend tests
 * This runs before each test file
 */

// Set up a mock DOM environment for testing
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};

// Mock the console to avoid cluttering test output
global.console = {
  ...console,
  // Comment out these lines if you want to see these logs during testing
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock browser objects not available in jsdom
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock canvas methods
class MockCanvasRenderingContext2D {
  constructor() {
    this.drawImage = jest.fn();
    this.clearRect = jest.fn();
    this.beginPath = jest.fn();
    this.arc = jest.fn();
    this.fill = jest.fn();
    this.stroke = jest.fn();
    this.moveTo = jest.fn();
    this.lineTo = jest.fn();
    this.fillText = jest.fn();
    this.save = jest.fn();
    this.restore = jest.fn();
    this.translate = jest.fn();
    this.rotate = jest.fn();
    this.scale = jest.fn();
    this.fillRect = jest.fn();
    this.strokeRect = jest.fn();
  }
}

HTMLCanvasElement.prototype.getContext = function() {
  return new MockCanvasRenderingContext2D();
};

// Mock Web Audio API
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {
      connect: jest.fn()
    };
  }
  
  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() }
    };
  }
  
  createBufferSource() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
      loop: false,
      playbackRate: { value: 1 }
    };
  }
  
  createBuffer(numChannels, length, sampleRate) {
    return new AudioBuffer({ length: length || 1, sampleRate: sampleRate || 44100, numberOfChannels: numChannels || 2 });
  }
  
  decodeAudioData(buffer) {
    return Promise.resolve(this.createBuffer());
  }
}

// Mock AudioBuffer class
class AudioBuffer {
  constructor(options = {}) {
    this.length = options.length || 1;
    this.duration = options.length / (options.sampleRate || 44100);
    this.sampleRate = options.sampleRate || 44100;
    this.numberOfChannels = options.numberOfChannels || 2;
  }
  
  getChannelData() {
    return new Float32Array(this.length);
  }
}

// Add to global scope
global.AudioContext = MockAudioContext;
global.AudioBuffer = AudioBuffer;
global.webkitAudioContext = MockAudioContext; // For Safari compatibility
