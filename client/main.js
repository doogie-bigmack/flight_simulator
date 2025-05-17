let socket;
let plane;
let stars = [];
let username = '';
const speed = 0.1;

function startGame(name) {
  username = name;
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.addEventListener('message', (event) => {
    const state = JSON.parse(event.data);
    updateGame(state);
  });
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'join', username }));
  });
  initScene();
}

function initScene() {
  const canvas = document.getElementById('gameCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 10);
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

function handleKey(e) {
  switch (e.key) {
    case 'ArrowUp':
      socket.send(JSON.stringify({ type: 'move', direction: 'up' }));
      break;
    case 'ArrowDown':
      socket.send(JSON.stringify({ type: 'move', direction: 'down' }));
      break;
    case 'ArrowLeft':
      socket.send(JSON.stringify({ type: 'move', direction: 'left' }));
      break;
    case 'ArrowRight':
      socket.send(JSON.stringify({ type: 'move', direction: 'right' }));
      break;
    default:
      break;
  }
}

function updateGame(state) {
  document.getElementById('score').textContent = `Score: ${state.score}`;
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
