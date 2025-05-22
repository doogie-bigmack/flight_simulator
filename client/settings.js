/**
 * Settings UI manager for Sky Squad
 * Handles audio settings UI and interactions
 */
export function initSettingsUI(audioManager) {
  const settingsButton = document.getElementById('settingsButton');
  const settingsPanel = document.getElementById('settings');
  const closeButton = document.getElementById('closeSettings');
  
  // Sliders
  const masterSlider = document.getElementById('masterVolume');
  const musicSlider = document.getElementById('musicVolume');
  const sfxSlider = document.getElementById('sfxVolume');
  const muteCheckbox = document.getElementById('muteAudio');
  const visualFeedbackCheckbox = document.getElementById('visualFeedback');
  
  // Open settings panel
  settingsButton.addEventListener('click', () => {
    audioManager.playSound('ui_click');
    settingsPanel.style.display = 'block';
  });
  
  // Close settings panel
  closeButton.addEventListener('click', () => {
    audioManager.playSound('ui_click');
    settingsPanel.style.display = 'none';
  });
  
  // Master volume control
  masterSlider.addEventListener('input', () => {
    const value = parseInt(masterSlider.value) / 100;
    audioManager.setMasterVolume(value);
    updateSliderLabel(masterSlider);
  });
  
  // Music volume control
  musicSlider.addEventListener('input', () => {
    const value = parseInt(musicSlider.value) / 100;
    audioManager.setMusicVolume(value);
    updateSliderLabel(musicSlider);
    
    // Play a short music sample when adjusting
    if (Math.random() < 0.1) {
      audioManager.playSound('star_special');
    }
  });
  
  // SFX volume control
  sfxSlider.addEventListener('input', () => {
    const value = parseInt(sfxSlider.value) / 100;
    audioManager.setSfxVolume(value);
    updateSliderLabel(sfxSlider);
    
    // Play a sound when adjusting
    audioManager.playSound('ui_hover');
  });
  
  // Mute toggle
  muteCheckbox.addEventListener('change', () => {
    const isMuted = audioManager.toggleMute();
    muteCheckbox.checked = isMuted;
  });
  
  // Visual feedback toggle
  visualFeedbackCheckbox.addEventListener('change', () => {
    // Store preference
    localStorage.setItem('visualFeedbackEnabled', visualFeedbackCheckbox.checked);
  });
  
  // Helper to update slider value displays
  function updateSliderLabel(slider) {
    const valueDisplay = slider.nextElementSibling;
    valueDisplay.textContent = `${slider.value}%`;
  }
  
  // Initialize labels
  updateSliderLabel(masterSlider);
  updateSliderLabel(musicSlider);
  updateSliderLabel(sfxSlider);
  
  // Load saved preferences
  const savedVisualFeedback = localStorage.getItem('visualFeedbackEnabled');
  if (savedVisualFeedback !== null) {
    visualFeedbackCheckbox.checked = savedVisualFeedback === 'true';
  }
  
  // Save settings on close
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('masterVolume', masterSlider.value);
    localStorage.setItem('musicVolume', musicSlider.value);
    localStorage.setItem('sfxVolume', sfxSlider.value);
    localStorage.setItem('muteAudio', muteCheckbox.checked);
  });
  
  // Load saved settings
  const loadSavedSettings = () => {
    const savedMasterVolume = localStorage.getItem('masterVolume');
    const savedMusicVolume = localStorage.getItem('musicVolume');
    const savedSfxVolume = localStorage.getItem('sfxVolume');
    const savedMuteState = localStorage.getItem('muteAudio');
    
    if (savedMasterVolume !== null) {
      masterSlider.value = savedMasterVolume;
      audioManager.setMasterVolume(parseInt(savedMasterVolume) / 100);
      updateSliderLabel(masterSlider);
    }
    
    if (savedMusicVolume !== null) {
      musicSlider.value = savedMusicVolume;
      audioManager.setMusicVolume(parseInt(savedMusicVolume) / 100);
      updateSliderLabel(musicSlider);
    }
    
    if (savedSfxVolume !== null) {
      sfxSlider.value = savedSfxVolume;
      audioManager.setSfxVolume(parseInt(savedSfxVolume) / 100);
      updateSliderLabel(sfxSlider);
    }
    
    if (savedMuteState !== null) {
      const isMuted = savedMuteState === 'true';
      muteCheckbox.checked = isMuted;
      if (isMuted) {
        audioManager.toggleMute();
      }
    }
  };
  
  // Load settings
  loadSavedSettings();
  
  // Return public methods
  return {
    closeSettings: () => {
      settingsPanel.style.display = 'none';
    },
    openSettings: () => {
      settingsPanel.style.display = 'block';
    },
    isVisualFeedbackEnabled: () => visualFeedbackCheckbox.checked
  };
}
