const form = document.getElementById('loginForm');
form.addEventListener('submit', async (e) => {
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
    document.getElementById('login').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    startGame(username);
  } else {
    alert('Registration failed');
  }
});
