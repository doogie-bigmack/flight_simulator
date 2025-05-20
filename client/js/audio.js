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
   * Update all volume levels based on current settings
   */
  updateVolumes() {
    // Apply master volume
    this.masterGainNode.gain.value = this.settings.master;
    
    // Apply category volumes (already affected by master through connection)
    this.musicGainNode.gain.value = this.settings.music;
    this.sfxGainNode.gain.value = this.settings.sfx;
    
    this.logger.info('Volumes updated', {
      master: this.settings.master,
      music: this.settings.music,
      sfx: this.settings.sfx,
      effectiveMusic: this.settings.master * this.settings.music,
      effectiveSfx: this.settings.master * this.settings.sfx
    });
  }
  
  /**
   * Set master volume
   * @param {number} volume - Volume level (0.0 - 1.0)
   */
  setMasterVolume(volume) {
    this.settings.master = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }
  
  /**
   * Set music volume
   * @param {number} volume - Volume level (0.0 - 1.0)
   */
  setMusicVolume(volume) {
    this.settings.music = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }
  
  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0.0 - 1.0)
   */
  setSfxVolume(volume) {
    this.settings.sfx = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }
  
  /**
   * Mute or unmute all audio
   * @param {boolean} muted - Whether audio should be muted
   */
  setMuted(muted) {
    this.isMuted = muted;
    this.masterGainNode.gain.value = muted ? 0 : this.settings.master;
    this.logger.info(muted ? 'Audio muted' : 'Audio unmuted');
  }
  
  /**
   * Toggle mute state
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
  
  /**
   * Preload all audio assets
   * @returns {Promise} Promise that resolves when all assets are loaded
   */
  async preloadAssets() {
    try {
      // Music tracks
      await this.loadMusic('menu', 'assets/audio/menu_music.mp3');
      await this.loadMusic('gameplay', 'assets/audio/gameplay_music.mp3');
      
      // Sound effects
      await this.loadSound('ui_click', 'assets/audio/click.mp3');
      await this.loadSound('ui_hover', 'assets/audio/hover.mp3');
      await this.loadSound('star_collect', 'assets/audio/collect.mp3');
      await this.loadSound('star_collect_special', 'assets/audio/collect_special.mp3');
      await this.loadSound('level_up', 'assets/audio/level_up.mp3');
      await this.loadSound('achievement', 'assets/audio/achievement.mp3');
      
      this.logger.info('All audio assets loaded');
      return true;
    } catch (error) {
      this.logger.error('Failed to load audio assets', { error: error.message });
      return false;
    }
  }
  
  /**
   * Load a music track
   * @param {string} id - Identifier for the music
   * @param {string} url - URL to the audio file
   * @returns {Promise} Promise that resolves when the track is loaded
   */
  async loadMusic(id, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.music.set(id, audioBuffer);
      this.logger.info(`Music loaded: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to load music: ${id}`, { error: error.message });
      // Create a silent buffer as fallback
      const buffer = this.createSilentBuffer(1.0);
      this.music.set(id, buffer);
      return false;
    }
  }
  
  /**
   * Load a sound effect
   * @param {string} id - Identifier for the sound
   * @param {string} url - URL to the audio file
   * @returns {Promise} Promise that resolves when the sound is loaded
   */
  async loadSound(id, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(id, audioBuffer);
      this.logger.info(`Sound loaded: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to load sound: ${id}`, { error: error.message });
      // Create a short silent buffer as fallback
      const buffer = this.createSilentBuffer(0.1);
      this.sounds.set(id, buffer);
      return false;
    }
  }
  
  /**
   * Create a silent audio buffer (for fallback use)
   * @param {number} duration - Duration in seconds
   * @returns {AudioBuffer} Silent audio buffer
   */
  createSilentBuffer(duration) {
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    return buffer;
  }
  
  /**
   * Play a sound effect
   * @param {string} id - ID of the sound to play
   * @param {Object} options - Playback options
   * @returns {AudioBufferSourceNode|null} Sound source or null if sound not found
   */
  playSound(id, options = {}) {
    if (!this.sounds.has(id)) {
      this.logger.error(`Sound not found: ${id}`);
      return null;
    }
    
    const buffer = this.sounds.get(id);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Create a gain node for this sound
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;
    
    // Connect source to gain, gain to sfx channel
    source.connect(gainNode);
    gainNode.connect(this.sfxGainNode);
    
    // Start playback
    source.start(0);
    
    this.logger.info(`Sound played: ${id}`);
    return source;
  }
  
  /**
   * Play a music track
   * @param {string} id - ID of the music to play
   * @param {Object} options - Playback options (loop, volume, fadeDuration)
   * @returns {AudioBufferSourceNode|null} Music source or null if not found
   */
  playMusic(id, options = {}) {
    if (!this.music.has(id)) {
      this.logger.error(`Music not found: ${id}`);
      return null;
    }
    
    // Default options
    const opts = {
      loop: options.loop !== undefined ? options.loop : false,
      volume: options.volume !== undefined ? options.volume : 1.0,
      fadeDuration: options.fadeDuration !== undefined ? options.fadeDuration : 0
    };
    
    // If we're already playing music and a crossfade is requested
    if (this.currentMusic && this.currentMusic.source && opts.fadeDuration > 0) {
      // Fade out current music
      const currentGain = this.currentMusic.gainNode;
      currentGain.gain.setValueAtTime(currentGain.gain.value, this.audioContext.currentTime);
      currentGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + opts.fadeDuration);
      
      // Schedule stopping after fade
      setTimeout(() => {
        try {
          this.currentMusic.source.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }, opts.fadeDuration * 1000);
    } else if (this.currentMusic && this.currentMusic.source) {
      // No crossfade, stop immediately
      try {
        this.currentMusic.source.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    
    // Create and set up new music
    const buffer = this.music.get(id);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop;
    
    // Create a gain node for this music
    const gainNode = this.audioContext.createGain();
    
    // If we're fading in, start at 0
    if (opts.fadeDuration > 0) {
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        opts.volume, 
        this.audioContext.currentTime + opts.fadeDuration
      );
    } else {
      gainNode.gain.value = opts.volume;
    }
    
    // Connect source to gain, gain to music channel
    source.connect(gainNode);
    gainNode.connect(this.musicGainNode);
    
    // Save reference to current music
    this.currentMusic = { id, source, gainNode };
    
    // Start playback
    source.start(0);
    
    this.logger.info(`Music started: ${id}`, {
      loop: opts.loop,
      volume: opts.volume,
      fadeDuration: opts.fadeDuration
    });
    
    return source;
  }
  
  /**
   * Stop currently playing music
   * @param {number} fadeOutTime - Fade out duration in seconds
   */
  stopMusic(fadeOutTime = 0) {
    if (!this.currentMusic || !this.currentMusic.source) {
      return;
    }
    
    if (fadeOutTime > 0) {
      // Fade out gradually
      const gain = this.currentMusic.gainNode;
      gain.gain.setValueAtTime(gain.gain.value, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutTime);
      
      // Stop playback after fade out
      setTimeout(() => {
        try {
          this.currentMusic.source.stop();
          this.currentMusic = null;
        } catch (e) {
          // Ignore if already stopped
        }
      }, fadeOutTime * 1000);
    } else {
      // Stop immediately
      try {
        this.currentMusic.source.stop();
        this.currentMusic = null;
      } catch (e) {
        // Ignore if already stopped
      }
    }
    
    this.logger.info('Music stopped', { fadeOutTime });
  }
  
  /**
   * Play a star collection sound with varying pitch based on value
   * @param {number} value - Star value 
   * @returns {AudioBufferSourceNode|null} Sound source
   */
  playStarCollectSound(value = 1) {
    const soundId = value >= 5 ? 'star_collect_special' : 'star_collect';
    
    // Play the appropriate sound with pitch variation based on value
    const source = this.playSound(soundId);
    if (source) {
      // Add slight pitch variation based on star value (1.0 = normal pitch)
      const pitchFactor = 0.9 + (value * 0.05);
      source.playbackRate.value = Math.min(2.0, Math.max(0.5, pitchFactor));
    }
    
    return source;
  }
}
