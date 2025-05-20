const form = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');

registerBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  if (res.ok) {
    await loginUser(username, password);
  } else {
    alert('Registration failed');
  }
});

loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  await loginUser(username, password);
});

async function loginUser(username, password) {
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('token', data.token);
    document.getElementById('login').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    startGame(username);
  } else {
    alert('Login failed');
  }
}

