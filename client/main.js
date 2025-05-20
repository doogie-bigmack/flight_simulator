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

function startGame(name) {
  username = name;
  const token = localStorage.getItem('token') || '';
  socket = io('/ws', { query: { token } });
  socket.on('state', (state) => {
    updateGame(state);
  });
  socket.emit('join', { username });
  initScene();
  document.getElementById('playerName').textContent = username;
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

function createStar() {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  return new THREE.Mesh(geometry, material);
}

function playCollectSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 880;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
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
      playCollectSound();
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

