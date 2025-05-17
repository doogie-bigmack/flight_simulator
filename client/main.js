let socket;
let plane;
let starMeshes = [];
let username = '';
const speed = 0.1;

function startGame(name) {
  username = name;
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.onmessage = (ev) => {
    updateGame(JSON.parse(ev.data));
  };
  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', username }));
  };
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
  let direction;
  switch (e.key) {
  case 'ArrowUp':
    direction = 'up';
    break;
  case 'ArrowDown':
    direction = 'down';
    break;
  case 'ArrowLeft':
    direction = 'left';
    break;
  case 'ArrowRight':
    direction = 'right';
    break;
  default:
    return;
  }
  socket.send(JSON.stringify({ type: 'move', direction }));
}

function updateGame(state) {
  document.getElementById('score').textContent = `Score: ${state.score}`;
  plane.position.x = state.players[0]?.x || 0;
  plane.position.y = state.players[0]?.y || 0;
  updateStars(state.stars);
}

function updateStars(stars) {
  const scene = plane.parent;
  starMeshes.forEach((m) => scene.remove(m));
  starMeshes = stars.map((s) => {
    const geom = new THREE.CircleGeometry(0.2, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(s.x, s.y, 0);
    scene.add(mesh);
    return mesh;
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
