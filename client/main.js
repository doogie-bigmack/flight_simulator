import { AudioManager } from './audio.js';
import { initSettingsUI } from './settings.js';
import { ProgressionManager } from './progression.js';

let socket;
let plane;
let stars = [];
let starMeshes = {};
let username = '';
const speed = 0.1;
let planePos = { x: 0, y: 0 };
let scene;
let renderer;
let camera;

// Global managers
let audioManager;
let settingsUI;
let progressionManager;

// Visual feedback flag
let visualFeedbackEnabled = true;

/**
 * Initialize game systems
 * @returns {Promise} - Resolves when systems are initialized
 */
async function initSystems() {
  try {
    // Initialize audio system
    audioManager = new AudioManager();
    await audioManager.preloadAssets();
    
    // Start menu music
    audioManager.playMusic('menu', { loop: true });
    
    // Initialize settings UI
    settingsUI = initSettingsUI(audioManager);
    visualFeedbackEnabled = localStorage.getItem('visualFeedbackEnabled') !== 'false';
    
    // Initialize progression system
    progressionManager = new ProgressionManager(audioManager);
    
    // Add event listeners for UI sounds
    document.querySelectorAll('button').forEach(button => {
      if (!['settingsButton', 'closeSettings', 'progress-button', 'challenges-button', 'close-progress', 'close-challenges'].includes(button.id)) {
        button.addEventListener('click', () => audioManager.playSound('ui_click'));
        button.addEventListener('mouseenter', () => audioManager.playSound('ui_hover'));
      }
    });
    
    // Set up socket event handlers for progression
    socket.on('progress', (progressData) => {
      progressionManager.updateProgress(progressData);
    });
    
    socket.on('challenges', (challengesData) => {
      progressionManager.updateChallenges(challengesData);
    });
    
    socket.on('achievement', (achievementData) => {
      progressionManager.showAchievement(achievementData);
    });
    
    return true;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: 'SystemInit',
      message: 'Failed to initialize game systems',
      error: error.message
    }));
    return false;
  }
}

/**
 * Start the game with the given username
 * @param {string} name - Player username
 */
function startGame(name) {
  username = name;
  socket = io('/ws');
  socket.on('state', (state) => {
    updateGame(state);
  });
  socket.emit('join', { username });
  initScene();
  document.getElementById('playerName').textContent = username;
  
  // Initialize game systems if not already done
  if (!audioManager) {
    // Important: We need to initialize systems after socket is created
    initSystems().then(() => {
      // Switch from menu music to gameplay music with crossfade
      if (audioManager) {
        audioManager.playMusic('gameplay', { 
          loop: true,
          fadeDuration: 2.0 
        });
      }
      
      // Request progression data updates
      if (progressionManager) {
        progressionManager.requestProgressUpdate(socket);
        progressionManager.requestChallengesUpdate(socket);
      }
    });
  } else {
    // Switch from menu music to gameplay music with crossfade
    audioManager.playMusic('gameplay', { 
      loop: true,
      fadeDuration: 2.0 
    });
    
    // Request progression data updates
    if (progressionManager) {
      progressionManager.requestProgressUpdate(socket);
      progressionManager.requestChallengesUpdate(socket);
    }
  }
}

function initScene() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas });
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 10);
  camera.position.z = 5;
  plane = createPlane();
  scene.add(plane);
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
  document.addEventListener('keydown', (e) => handleKey(e));
}

function createPlane() {
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  return new THREE.Mesh(geometry, material);
}

/**
 * Create a star mesh for rendering
 * @returns {THREE.Mesh} Star mesh
 */
function createStar() {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  return new THREE.Mesh(geometry, material);
}

/**
 * Play sound effect for collecting stars
 * @param {number} starValue - Value of the collected star
 */
function playCollectSound(starValue = 1) {
  if (audioManager) {
    audioManager.playStarCollectSound(starValue);
  } else {
    // Fallback if audio system isn't initialized yet
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440 + (starValue * 100);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
}

/**
 * Show visual feedback for star collection
 * @param {string} type - Type of visual feedback ('regular' or 'special')
 */
function showVisualFeedback(type) {
  const feedback = document.createElement('div');
  feedback.className = `visual-feedback ${type}`;
  document.getElementById('game').appendChild(feedback);
  
  // Animate and remove
  setTimeout(() => {
    feedback.classList.add('animate');
    setTimeout(() => feedback.remove(), 1000);
  }, 0);
}

function handleKey(e) {
  let cmd;
  switch (e.key) {
  case 'ArrowUp':
    cmd = 'up';
    break;
  case 'ArrowDown':
    cmd = 'down';
    break;
  case 'ArrowLeft':
    cmd = 'left';
    break;
  case 'ArrowRight':
    cmd = 'right';
    break;
  default:
    return;
  }
  socket.emit('move', { type: 'move', command: cmd });
  planePos = computeNewPosition(planePos, cmd);
  plane.position.set(planePos.x, planePos.y, 0);
}

function updateGame(state) {
  document.getElementById('score').textContent = `Score: ${state.score}`;
  stars = state.stars;
  stars.forEach((star) => {
    if (!starMeshes[star.id]) {
      const mesh = createStar();
      starMeshes[star.id] = mesh;
      scene.add(mesh);
    }
    starMeshes[star.id].position.set(star.x, star.y, 0);
  });
  Object.keys(starMeshes).forEach((id) => {
    if (!stars.find((s) => s.id === id)) {
      scene.remove(starMeshes[id]);
      delete starMeshes[id];
    }
  });
  stars.forEach((star) => {
    if (isColliding(planePos, star, 0.5)) {
      socket.emit('collect_star', { type: 'collect_star', starId: star.id });
      
      // Play sound effect based on star value
      playCollectSound(star.value || 1);
      
      // Show visual feedback if enabled
      if (visualFeedbackEnabled || (settingsUI && settingsUI.isVisualFeedbackEnabled())) {
        showVisualFeedback(star.value >= 5 ? 'special' : 'regular');
      }
    }
  });
}

export function computeNewPosition(pos, command) {
  const newPos = { ...pos };
  switch (command) {
  case 'up':
    newPos.y += speed;
    break;
  case 'down':
    newPos.y -= speed;
    break;
  case 'left':
    newPos.x -= speed;
    break;
  case 'right':
    newPos.x += speed;
    break;
  default:
    break;
  }
  return newPos;
}

export function isColliding(p1, p2, threshold = 0.5) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

