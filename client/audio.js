/**
 * Audio Manager for Sky Squad
 * Handles all game audio including music, sound effects and settings
 */
export class AudioManager {
  constructor() {
    // Initialize Web Audio API context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    
    // Sound collections
    this.sounds = new Map();
    this.music = new Map();
    
    // State tracking
    this.currentMusic = null;
    this.isMuted = false;
    this.logger = this.setupLogger();
    
    // Volume settings (0.0 - 1.0)
    this.settings = {
      master: 0.8,
      music: 0.5,
      sfx: 0.7
    };
    
    // Create separate gain nodes for music and SFX
    this.musicGainNode = this.audioContext.createGain();
    this.sfxGainNode = this.audioContext.createGain();
    
    // Connect to master
    this.musicGainNode.connect(this.masterGainNode);
    this.sfxGainNode.connect(this.masterGainNode);
    
    // Apply initial volume settings
    this.updateVolumes();
  }
  
  /**
   * Set up JSON logging for audio system
   * @returns {Object} Logger object
   */
  setupLogger() {
    return {
      info: (message, data = {}) => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'AudioManager',
          message,
          ...data
        }));
      },
      error: (message, data = {}) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          component: 'AudioManager',
          message,
          ...data
        }));
      }
    };
  }
  
  /**
   * Update all volume levels based on settings
   */
  updateVolumes() {
    this.masterGainNode.gain.value = this.isMuted ? 0 : this.settings.master;
    this.musicGainNode.gain.value = this.settings.music;
    this.sfxGainNode.gain.value = this.settings.sfx;
  }
  
  /**
   * Set master volume
   * @param {number} value - Volume level (0.0 - 1.0)
   */
  setMasterVolume(value) {
    this.settings.master = Math.max(0, Math.min(1, value));
    this.updateVolumes();
    this.logger.info('Master volume changed', { volume: this.settings.master });
  }
  
  /**
   * Set music volume
   * @param {number} value - Volume level (0.0 - 1.0)
   */
  setMusicVolume(value) {
    this.settings.music = Math.max(0, Math.min(1, value));
    this.updateVolumes();
    this.logger.info('Music volume changed', { volume: this.settings.music });
  }
  
  /**
   * Set SFX volume
   * @param {number} value - Volume level (0.0 - 1.0)
   */
  setSfxVolume(value) {
    this.settings.sfx = Math.max(0, Math.min(1, value));
    this.updateVolumes();
    this.logger.info('SFX volume changed', { volume: this.settings.sfx });
  }
  
  /**
   * Toggle mute state
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateVolumes();
    this.logger.info('Audio mute toggled', { muted: this.isMuted });
    return this.isMuted;
  }
  
  /**
   * Load a sound effect
   * @param {string} id - Unique identifier for the sound
   * @param {string} url - Path to sound file
   * @returns {Promise} Promise resolving when sound is loaded
   */
  async loadSound(id, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(id, audioBuffer);
      this.logger.info('Sound loaded', { id, url });
      return true;
    } catch (error) {
      this.logger.error('Failed to load sound', { id, url, error: error.message });
      return false;
    }
  }
  
  /**
   * Load background music
   * @param {string} id - Unique identifier for the music
   * @param {string} url - Path to music file
   * @returns {Promise} Promise resolving when music is loaded
   */
  async loadMusic(id, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.music.set(id, audioBuffer);
      this.logger.info('Music loaded', { id, url });
      return true;
    } catch (error) {
      this.logger.error('Failed to load music', { id, url, error: error.message });
      return false;
    }
  }
  
  /**
   * Play a sound effect
   * @param {string} id - ID of previously loaded sound
   * @param {Object} options - Playback options
   * @param {number} options.volume - Volume override (0.0 - 1.0)
   * @param {number} options.pitch - Pitch adjustment (0.5 - 2.0)
   * @param {boolean} options.loop - Whether to loop the sound
   * @returns {Object|null} Sound controller object or null if sound not found
   */
  playSound(id, options = {}) {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.logger.error('Attempted to play unknown sound', { id });
      return null;
    }
    
    // Create source and gain nodes
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = sound;
    
    // Apply playback options
    sourceNode.loop = options.loop || false;
    if (options.pitch) {
      sourceNode.playbackRate.value = Math.max(0.5, Math.min(2, options.pitch));
    }
    
    // Create individual gain for this sound
    const gainNode = this.audioContext.createGain();
    if (options.volume !== undefined) {
      gainNode.gain.value = Math.max(0, Math.min(1, options.volume));
    }
    
    // Connect nodes: source -> sound gain -> sfx channel -> master
    sourceNode.connect(gainNode);
    gainNode.connect(this.sfxGainNode);
    
    // Start playback
    sourceNode.start();
    this.logger.info('Sound played', { id, options });
    
    // Return controller object
    return {
      stop: () => sourceNode.stop(),
      setVolume: (vol) => {
        gainNode.gain.value = Math.max(0, Math.min(1, vol));
      },
      setPitch: (rate) => {
        sourceNode.playbackRate.value = Math.max(0.5, Math.min(2, rate));
      }
    };
  }
  
  /**
   * Play background music
   * @param {string} id - ID of previously loaded music
   * @param {Object} options - Playback options
   * @param {boolean} options.loop - Whether to loop the music (default: true)
   * @param {number} options.fadeDuration - Fade in duration in seconds
   * @returns {Object|null} Music controller or null if music not found
   */
  playMusic(id, options = {}) {
    const music = this.music.get(id);
    if (!music) {
      this.logger.error('Attempted to play unknown music', { id });
      return null;
    }
    
    // Stop current music if playing
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
    
    // Create source node
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = music;
    sourceNode.loop = options.loop !== false; // Loop by default
    
    // Create gain node for this specific music instance
    const gainNode = this.audioContext.createGain();
    
    // Apply fade-in if specified
    if (options.fadeDuration) {
      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        1, 
        this.audioContext.currentTime + options.fadeDuration
      );
    }
    
    // Connect nodes: source -> music gain -> music channel -> master
    sourceNode.connect(gainNode);
    gainNode.connect(this.musicGainNode);
    
    // Start playback
    sourceNode.start();
    this.logger.info('Music started', { id, options });
    
    // Store reference to current music
    this.currentMusic = {
      id,
      sourceNode,
      gainNode,
      stop: (fadeOut = 0) => {
        if (fadeOut > 0) {
          gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOut);
          setTimeout(() => sourceNode.stop(), fadeOut * 1000);
        } else {
          sourceNode.stop();
        }
        if (this.currentMusic && this.currentMusic.id === id) {
          this.currentMusic = null;
        }
      }
    };
    
    return this.currentMusic;
  }
  
  /**
   * Preload all required game audio assets
   * @returns {Promise} Promise resolving when all assets are loaded
   */
  async preloadAssets() {
    this.logger.info('Beginning audio preload');
    
    const soundPromises = [
      this.loadSound('ui_click', 'assets/audio/sfx/ui/button_click.mp3'),
      this.loadSound('ui_hover', 'assets/audio/sfx/ui/hover.mp3'),
      this.loadSound('achievement', 'assets/audio/sfx/ui/achievement.mp3'),
      this.loadSound('star_regular', 'assets/audio/sfx/gameplay/star_collect_regular.mp3'),
      this.loadSound('star_special', 'assets/audio/sfx/gameplay/star_collect_special.mp3'),
      this.loadSound('level_up', 'assets/audio/sfx/gameplay/level_up.mp3'),
      this.loadSound('plane_engine', 'assets/audio/sfx/gameplay/plane_engine.mp3')
    ];
    
    const musicPromises = [
      this.loadMusic('main_theme', 'assets/audio/music/main_theme.mp3'),
      this.loadMusic('gameplay', 'assets/audio/music/gameplay_loop.mp3'),
      this.loadMusic('menu', 'assets/audio/music/menu_music.mp3')
    ];
    
    try {
      await Promise.all([...soundPromises, ...musicPromises]);
      this.logger.info('Audio preload complete');
      return true;
    } catch (error) {
      this.logger.error('Audio preload failed', { error: error.message });
      return false;
    }
  }
  
  /**
   * Create a simple oscillator sound effect (useful for procedural audio)
   * @param {Object} options - Oscillator options
   * @param {string} options.type - Oscillator type (sine, square, sawtooth, triangle)
   * @param {number} options.frequency - Base frequency in Hz
   * @param {number} options.duration - Duration in seconds
   * @param {Object} options.envelope - ADSR envelope parameters
   * @returns {Promise} Promise that resolves when sound completes
   */
  playSynthSound(options) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Set oscillator properties
    oscillator.type = options.type || 'sine';
    oscillator.frequency.value = options.frequency || 440;
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.sfxGainNode);
    
    // Apply envelope
    const now = this.audioContext.currentTime;
    const env = options.envelope || { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };
    const duration = options.duration || 0.5;
    
    // Start with zero gain
    gainNode.gain.setValueAtTime(0, now);
    
    // Attack phase
    gainNode.gain.linearRampToValueAtTime(1, now + env.attack);
    
    // Decay to sustain level
    gainNode.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
    
    // Release phase
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    // Start and stop oscillator
    oscillator.start(now);
    oscillator.stop(now + duration + 0.1); // Add small buffer for release
    
    // Return promise that resolves when sound is complete
    return new Promise(resolve => {
      setTimeout(resolve, (duration + 0.1) * 1000);
    });
  }
  
  /**
   * Generate a star collection sound effect with parameters based on star value
   * @param {number} value - Value/importance of the star (affects sound)
   */
  playStarCollectSound(value = 1) {
    // For important stars, play the pre-recorded special sound
    if (value >= 5) {
      return this.playSound('star_special');
    }
    
    // For regular stars, decide between pre-recorded or procedural sound
    // based on variety needs
    if (Math.random() < 0.7) {
      // Use pre-recorded sound with slight pitch variation
      return this.playSound('star_regular', {
        pitch: 0.9 + (Math.random() * 0.2) // 0.9-1.1 range for subtle variety
      });
    } else {
      // Generate procedural sound for more variety
      const baseFreq = 700 + (value * 100);
      return this.playSynthSound({
        type: 'sine',
        frequency: baseFreq,
        duration: 0.3,
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2
        }
      });
    }
  }
}
