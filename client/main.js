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

// Debug function for consistent logging
function logEvent(event, data) {
  console.log(`[${new Date().toISOString()}] ${event}:`, data);
}

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
  // Make sure startGame is accessible from other scripts
  window.startGame = startGame;
  logEvent('startGame called', { name });
  username = name;
  const token = localStorage.getItem('token') || '';
  
  try {
    socket = io('/ws', { query: { token } });
    logEvent('WebSocket connection established', {});
    
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
      // Systems already initialized, just switch music and update progression
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
  } catch (error) {
    logEvent('Error in startGame', { message: error.message, stack: error.stack });
    alert(`Error starting game: ${error.message}`);
  }
}

// Expose startGame globally so login.js can invoke it
window.startGame = startGame;

function initScene() {
  try {
    logEvent('Initializing scene', { canvasExists: !!document.getElementById('gameCanvas') });
    
    // Make sure THREE is defined
    if (typeof THREE === 'undefined') {
      // If THREE is not directly accessible, check if it's in window
      if (typeof window.THREE !== 'undefined') {
        // Use window.THREE instead
        logEvent('Using window.THREE instead of direct THREE reference', {});
        window.THREE = window.THREE;
      } else {
        // THREE is not available at all - this is a fatal error
        throw new Error('THREE is not defined. Make sure Three.js is properly loaded');
      }
    }
    
    // Get the canvas element
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    
    // Set canvas to fill its container
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Create the renderer with antialias for smoother edges
    renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: false // Use solid background
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x87CEEB); // Sky blue background
    
    // Initialize the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Set up the camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.OrthographicCamera(
      -5 * aspect, 5 * aspect, 
      5, -5, 
      0.1, 100
    );
    camera.position.z = 5;
    
    // Add a simple ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Create and add the plane
    plane = createPlane();
    scene.add(plane);
    
    // Add a simple grid for reference
    const gridHelper = new THREE.GridHelper(10, 10);
    gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
    scene.add(gridHelper);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (canvas && renderer && camera) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        
        const newAspect = canvas.clientWidth / canvas.clientHeight;
        camera.left = -5 * newAspect;
        camera.right = 5 * newAspect;
        camera.updateProjectionMatrix();
      }
    });
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      // Animate the plane
      if (plane) {
        // Gently bob the plane up and down for a more dynamic feel
        plane.position.y = Math.sin(Date.now() * 0.001) * 0.1;
        
        // If the plane has a propeller, animate it
        if (plane.userData && plane.userData.propeller) {
          plane.userData.propeller.rotation.x += 0.3; // Fast spin for propeller
        }
      }
      
      // Animate stars if they exist
      Object.values(starMeshes).forEach(starMesh => {
        if (starMesh) {
          starMesh.rotation.z += 0.02;
          starMesh.scale.x = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
          starMesh.scale.y = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
        }
      });
      
      renderer.render(scene, camera);
    }
    
    // Start the animation loop
    animate();
    
    // Add keyboard controls
    document.addEventListener('keydown', (e) => handleKey(e));
    
    logEvent('Scene initialized successfully', {});
  } catch (error) {
    logEvent('Error initializing scene', { message: error.message, stack: error.stack });
    alert(`Error initializing game scene: ${error.message}. Check console for details.`);
  }
}

function createPlane() {
  try {
    // Create a group to hold all airplane parts
    const planeGroup = new THREE.Group();
    
    // Create the fuselage (main body)
    const fuselageGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
    const fuselageMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4286f4, // Blue color
      metalness: 0.3,
      roughness: 0.5
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    planeGroup.add(fuselage);
    
    // Create wings
    const wingGeometry = new THREE.BoxGeometry(0.4, 1.0, 0.05);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3373cc // Slightly darker blue
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = 0; // Center the wings
    planeGroup.add(wings);
    
    // Create a tail wing
    const tailGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.05);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x3373cc });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -0.4; // Position at the back of the fuselage
    planeGroup.add(tail);
    
    // Create a vertical stabilizer
    const stabilizer = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.05, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x3373cc })
    );
    stabilizer.position.x = -0.4;
    stabilizer.position.z = 0.1;
    planeGroup.add(stabilizer);
    
    // Create a cockpit
    const cockpitGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.15);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87cefa, // Light blue for cockpit glass
      metalness: 0.8,
      roughness: 0.2
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.x = 0.3; // Position at the front
    cockpit.position.z = 0.05; // Slightly above fuselage
    planeGroup.add(cockpit);
    
    // Create propeller
    const propellerGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.05);
    const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    propeller.position.x = 0.45; // At the front of the plane
    planeGroup.add(propeller);
    
    // Store propeller reference for animation
    planeGroup.userData.propeller = propeller;
    
    // Final positioning adjustments
    planeGroup.rotation.z = Math.PI / 2; // Rotate to face upward initially
    
    logEvent('Plane model created successfully', {});
    return planeGroup;
  } catch (error) {
    logEvent('Error creating plane model', { message: error.message });
    // Fallback to simple box if there's an error
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    return new THREE.Mesh(geometry, material);
  }
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
  newPos.x = Math.min(5, Math.max(-5, newPos.x));
  newPos.y = Math.min(5, Math.max(-5, newPos.y));
  return newPos;
}

export function isColliding(p1, p2, threshold = 0.5) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

