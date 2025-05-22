/**
 * Tests for the Audio Manager
 */
import { AudioManager } from '../../client/js/audio.js';

describe('AudioManager', () => {
  let audioManager;
  
  beforeEach(() => {
    // Create a new AudioManager instance before each test
    audioManager = new AudioManager();
    
    // Mock the logger to avoid console noise during tests
    audioManager.logger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    // Create some spy functions to track method calls
    jest.spyOn(audioManager, 'updateVolumes');
    jest.spyOn(audioManager, 'setMuted');
  });
  
  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default volume settings', () => {
      expect(audioManager.settings.master).toBe(0.8);
      expect(audioManager.settings.music).toBe(0.5);
      expect(audioManager.settings.sfx).toBe(0.7);
    });
    
    test('should create necessary audio nodes', () => {
      expect(audioManager.audioContext).toBeDefined();
      expect(audioManager.masterGainNode).toBeDefined();
      expect(audioManager.musicGainNode).toBeDefined();
      expect(audioManager.sfxGainNode).toBeDefined();
    });
    
    test('should start with audio not muted', () => {
      expect(audioManager.isMuted).toBe(false);
    });
    
    test('should initialize empty sound and music collections', () => {
      expect(audioManager.sounds.size).toBe(0);
      expect(audioManager.music.size).toBe(0);
    });
  });
  
  describe('Volume Controls', () => {
    test('should set master volume and update volumes', () => {
      audioManager.setMasterVolume(0.5);
      
      expect(audioManager.settings.master).toBe(0.5);
      expect(audioManager.updateVolumes).toHaveBeenCalled();
    });
    
    test('should clamp master volume to valid range', () => {
      audioManager.setMasterVolume(-0.5);
      expect(audioManager.settings.master).toBe(0);
      
      audioManager.setMasterVolume(1.5);
      expect(audioManager.settings.master).toBe(1);
    });
    
    test('should set music volume and update volumes', () => {
      audioManager.setMusicVolume(0.3);
      
      expect(audioManager.settings.music).toBe(0.3);
      expect(audioManager.updateVolumes).toHaveBeenCalled();
    });
    
    test('should set SFX volume and update volumes', () => {
      audioManager.setSfxVolume(0.6);
      
      expect(audioManager.settings.sfx).toBe(0.6);
      expect(audioManager.updateVolumes).toHaveBeenCalled();
    });
  });
  
  describe('Mute Controls', () => {
    test('should mute audio when setMuted is called with true', () => {
      audioManager.setMuted(true);
      
      expect(audioManager.isMuted).toBe(true);
      expect(audioManager.masterGainNode.gain.value).toBe(0);
    });
    
    test('should unmute audio when setMuted is called with false', () => {
      // First mute
      audioManager.setMuted(true);
      
      // Then unmute
      audioManager.setMuted(false);
      
      expect(audioManager.isMuted).toBe(false);
      expect(audioManager.masterGainNode.gain.value).toBe(audioManager.settings.master);
    });
    
    test('should toggle mute state when toggleMute is called', () => {
      const initialState = audioManager.isMuted;
      audioManager.toggleMute();
      expect(audioManager.isMuted).toBe(!initialState);
      
      audioManager.toggleMute();
      expect(audioManager.isMuted).toBe(initialState);
    });
  });
  
  describe('Sound Loading', () => {
    test('should load a sound effect', async () => {
      // Mock fetch and audio context methods
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      });
      
      audioManager.audioContext.decodeAudioData = jest.fn().mockImplementation(
        (buffer, onSuccess) => Promise.resolve(new AudioBuffer({ length: 10, sampleRate: 44100 }))
      );
      
      const result = await audioManager.loadSound('test_sound', 'test.mp3');
      
      expect(result).toBe(true);
      expect(audioManager.sounds.has('test_sound')).toBe(true);
      expect(audioManager.logger.info).toHaveBeenCalledWith(expect.stringContaining('Sound loaded'));
    });
    
    test('should handle errors when loading sounds', async () => {
      // Mock fetch to reject
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await audioManager.loadSound('error_sound', 'error.mp3');
      
      expect(result).toBe(false);
      expect(audioManager.sounds.has('error_sound')).toBe(true); // Should still have the fallback buffer
      expect(audioManager.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load sound'),
        expect.any(Object)
      );
    });
  });
  
  describe('Music Loading', () => {
    test('should load a music track', async () => {
      // Mock fetch and audio context methods
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      });
      
      audioManager.audioContext.decodeAudioData = jest.fn().mockImplementation(
        (buffer, onSuccess) => Promise.resolve(new AudioBuffer({ length: 10, sampleRate: 44100 }))
      );
      
      const result = await audioManager.loadMusic('test_music', 'test.mp3');
      
      expect(result).toBe(true);
      expect(audioManager.music.has('test_music')).toBe(true);
      expect(audioManager.logger.info).toHaveBeenCalledWith(expect.stringContaining('Music loaded'));
    });
    
    test('should create a fallback buffer when music loading fails', async () => {
      // Mock fetch to reject
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await audioManager.loadMusic('error_music', 'error.mp3');
      
      expect(result).toBe(false);
      expect(audioManager.music.has('error_music')).toBe(true); // Should still have the fallback buffer
      expect(audioManager.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load music'),
        expect.any(Object)
      );
    });
  });
  
  describe('Sound Playback', () => {
    beforeEach(() => {
      // Mock sound buffer
      const mockBuffer = new AudioBuffer({ length: 10, sampleRate: 44100 });
      audioManager.sounds.set('test_sound', mockBuffer);
      
      // Create spies for audio node methods
      audioManager.audioContext.createBufferSource = jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        buffer: null
      });
      
      audioManager.audioContext.createGain = jest.fn().mockReturnValue({
        connect: jest.fn(),
        gain: { value: 1 }
      });
    });
    
    test('should play a sound effect', () => {
      const source = audioManager.playSound('test_sound');
      
      expect(source).not.toBeNull();
      expect(audioManager.audioContext.createBufferSource).toHaveBeenCalled();
      expect(source.start).toHaveBeenCalled();
      expect(audioManager.logger.info).toHaveBeenCalledWith(expect.stringContaining('Sound played'));
    });
    
    test('should return null if sound ID is not found', () => {
      const source = audioManager.playSound('nonexistent_sound');
      
      expect(source).toBeNull();
      expect(audioManager.logger.error).toHaveBeenCalledWith(expect.stringContaining('Sound not found'));
    });
    
    test('should apply custom volume if provided', () => {
      const source = audioManager.playSound('test_sound', { volume: 0.5 });
      
      expect(source).not.toBeNull();
      // The gain node created for this sound should have volume 0.5
      expect(audioManager.audioContext.createGain().gain.value).toBe(0.5);
    });
  });
  
  describe('Music Playback', () => {
    beforeEach(() => {
      // Mock music buffer
      const mockBuffer = new AudioBuffer({ length: 10, sampleRate: 44100 });
      audioManager.music.set('test_music', mockBuffer);
      
      // Create spies for audio node methods
      audioManager.audioContext.createBufferSource = jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null,
        loop: false
      });
      
      audioManager.audioContext.createGain = jest.fn().mockReturnValue({
        connect: jest.fn(),
        gain: { 
          value: 1,
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn()
        }
      });
      
      // Mock current time
      audioManager.audioContext.currentTime = 0;
    });
    
    test('should play music track', () => {
      const source = audioManager.playMusic('test_music');
      
      expect(source).not.toBeNull();
      expect(audioManager.audioContext.createBufferSource).toHaveBeenCalled();
      expect(source.start).toHaveBeenCalled();
      expect(audioManager.currentMusic).not.toBeNull();
      expect(audioManager.currentMusic.id).toBe('test_music');
    });
    
    test('should return null if music ID is not found', () => {
      const source = audioManager.playMusic('nonexistent_music');
      
      expect(source).toBeNull();
      expect(audioManager.logger.error).toHaveBeenCalledWith(expect.stringContaining('Music not found'));
    });
    
    test('should apply loop setting if provided', () => {
      const source = audioManager.playMusic('test_music', { loop: true });
      
      expect(source).not.toBeNull();
      expect(source.loop).toBe(true);
    });
    
    test('should stop previous music when playing new music', () => {
      // Play first track
      const source1 = audioManager.playMusic('test_music');
      
      // Then play another track
      const source2 = audioManager.playMusic('test_music');
      
      expect(source1.stop).toHaveBeenCalled();
    });
    
    test('should fade in music if fadeDuration is provided', () => {
      const source = audioManager.playMusic('test_music', { fadeDuration: 2.0 });
      
      expect(source).not.toBeNull();
      
      // Check that gain node methods were called for fading
      const gainNode = audioManager.audioContext.createGain();
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
  });
  
  describe('Specialized Methods', () => {
    beforeEach(() => {
      // Mock required sounds
      const mockBuffer = new AudioBuffer({ length: 10, sampleRate: 44100 });
      audioManager.sounds.set('star_collect', mockBuffer);
      audioManager.sounds.set('star_collect_special', mockBuffer);
      
      // Mock playSound to return a source with playbackRate
      audioManager.playSound = jest.fn().mockReturnValue({
        playbackRate: { value: 1.0 }
      });
    });
    
    test('should play regular star collect sound for normal value', () => {
      const source = audioManager.playStarCollectSound(1);
      
      expect(audioManager.playSound).toHaveBeenCalledWith('star_collect');
      expect(source.playbackRate.value).toBeGreaterThan(0.9); // Should have some pitch variation
    });
    
    test('should play special star collect sound for high value', () => {
      const source = audioManager.playStarCollectSound(5);
      
      expect(audioManager.playSound).toHaveBeenCalledWith('star_collect_special');
      expect(source.playbackRate.value).toBeGreaterThan(1.0); // Should have higher pitch for valuable stars
    });
  });
});
