/**
 * Test suite for the AudioManager and related components
 */

import { AudioManager } from '../../client/audio.js';

describe('AudioManager', () => {
  let audioManager;
  let originalAudioContext;
  let originalMediaElement;
  
  // Mock AudioContext and Audio elements
  beforeEach(() => {
    // Save original AudioContext
    originalAudioContext = window.AudioContext || window.webkitAudioContext;
    originalMediaElement = window.Audio;
    
    // Mock AudioContext
    window.AudioContext = window.webkitAudioContext = function() {
      return {
        createGain: () => ({
          gain: { value: 1, setValueAtTime: jest.fn() },
          connect: jest.fn(),
          disconnect: jest.fn()
        }),
        createMediaElementSource: () => ({
          connect: jest.fn()
        }),
        destination: {},
        suspend: jest.fn(),
        resume: jest.fn(),
        currentTime: 0
      };
    };
    
    // Mock Audio element
    window.Audio = function() {
      return {
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') {
            callback();
          }
        }),
        removeEventListener: jest.fn(),
        volume: 1,
        currentTime: 0,
        loop: false,
        src: ''
      };
    };
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      const store = {
        'masterVolume': '0.8',
        'musicVolume': '0.6',
        'sfxVolume': '1.0',
        'muted': 'false'
      };
      return store[key] || null;
    });
    
    Storage.prototype.setItem = jest.fn();
    
    // Create AudioManager instance
    audioManager = new AudioManager();
  });
  
  // Restore original objects after tests
  afterEach(() => {
    window.AudioContext = window.webkitAudioContext = originalAudioContext;
    window.Audio = originalMediaElement;
    jest.restoreAllMocks();
  });
  
  test('should initialize with correct default values', () => {
    expect(audioManager.masterVolume).toBe(0.8);
    expect(audioManager.musicVolume).toBe(0.6);
    expect(audioManager.sfxVolume).toBe(1.0);
    expect(audioManager.muted).toBe(false);
  });
  
  test('should load audio assets', async () => {
    // Spy on Audio constructor
    const audioSpy = jest.spyOn(window, 'Audio');
    
    await audioManager.preloadAssets();
    
    // Check that Audio objects were created for each sound and music file
    expect(audioSpy).toHaveBeenCalledTimes(
      Object.keys(audioManager.soundFiles).length + 
      Object.keys(audioManager.musicFiles).length
    );
  });
  
  test('should play sound effects', () => {
    // Mock sound object
    const mockSound = {
      play: jest.fn().mockResolvedValue(undefined),
      currentTime: 0,
      volume: 1
    };
    
    audioManager.sounds = {
      'test_sound': mockSound
    };
    
    // Play sound and verify it was called correctly
    audioManager.playSound('test_sound');
    
    expect(mockSound.currentTime).toBe(0);
    expect(mockSound.play).toHaveBeenCalled();
  });
  
  test('should play music tracks', () => {
    // Mock music object
    const mockMusic = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      loop: false,
      currentTime: 0,
      volume: 1
    };
    
    audioManager.music = {
      'test_music': mockMusic
    };
    
    // Play music and verify it was called correctly
    audioManager.playMusic('test_music', { loop: true });
    
    expect(mockMusic.loop).toBe(true);
    expect(mockMusic.play).toHaveBeenCalled();
  });
  
  test('should adjust volume correctly', () => {
    // Set up spy on localStorage
    const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
    
    // Set master volume
    audioManager.setMasterVolume(0.5);
    
    // Check volume is set correctly
    expect(audioManager.masterVolume).toBe(0.5);
    
    // Check localStorage was updated
    expect(localStorageSpy).toHaveBeenCalledWith('masterVolume', '0.5');
  });
  
  test('should handle muting/unmuting', () => {
    // Set up spy on localStorage
    const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
    
    // Set initial values
    audioManager.muted = false;
    
    // Test muting
    audioManager.setMuted(true);
    expect(audioManager.muted).toBe(true);
    expect(localStorageSpy).toHaveBeenCalledWith('muted', 'true');
    
    // Test unmuting
    audioManager.setMuted(false);
    expect(audioManager.muted).toBe(false);
    expect(localStorageSpy).toHaveBeenCalledWith('muted', 'false');
  });
  
  test('should stop all sounds', () => {
    // Mock sound objects
    const mockSound1 = { pause: jest.fn(), currentTime: 0 };
    const mockSound2 = { pause: jest.fn(), currentTime: 0 };
    
    audioManager.sounds = {
      'sound1': mockSound1,
      'sound2': mockSound2
    };
    
    // Stop all sounds
    audioManager.stopAllSounds();
    
    // Verify all sounds were paused
    expect(mockSound1.pause).toHaveBeenCalled();
    expect(mockSound2.pause).toHaveBeenCalled();
    expect(mockSound1.currentTime).toBe(0);
    expect(mockSound2.currentTime).toBe(0);
  });
  
  test('should handle errors gracefully', async () => {
    // Mock console.error with JSON structure
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create error scenario
    const mockSound = {
      play: jest.fn().mockRejectedValue(new Error('Audio playback error'))
    };
    
    audioManager.sounds = {
      'error_sound': mockSound
    };
    
    // Play sound that will error
    await audioManager.playSound('error_sound');
    
    // Verify error was logged with JSON structure
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorArg = consoleErrorSpy.mock.calls[0][0];
    const errorObj = JSON.parse(errorArg);
    
    expect(errorObj).toHaveProperty('timestamp');
    expect(errorObj).toHaveProperty('level', 'ERROR');
    expect(errorObj).toHaveProperty('component', 'AudioManager');
    expect(errorObj).toHaveProperty('message');
    expect(errorObj).toHaveProperty('error');
  });
});
