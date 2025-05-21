// Enhanced debug function to log events
function logEvent(event, data) {
  // Create timestamp
  const timestamp = new Date().toISOString();
  // Format the log message
  const logMessage = `[${timestamp}] ${event}`;
  
  // Log to console with visual formatting
  console.log('%c' + logMessage, 'color: blue; font-weight: bold;', data);
  
  // Add to page for visibility (create log container if needed)
  const logContainer = document.getElementById('log-container') || createLogContainer();
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `<span class="timestamp">${timestamp}</span> <span class="event">${event}</span>: <span class="data">${JSON.stringify(data)}</span>`;
  logContainer.appendChild(logEntry);
  
  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Create a log container on the page
function createLogContainer() {
  const container = document.createElement('div');
  container.id = 'log-container';
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.width = '400px';
  container.style.height = '200px';
  container.style.backgroundColor = 'rgba(0,0,0,0.8)';
  container.style.color = '#fff';
  container.style.padding = '10px';
  container.style.overflow = 'auto';
  container.style.fontSize = '12px';
  container.style.fontFamily = 'monospace';
  container.style.zIndex = '9999';
  container.style.borderRadius = '5px';
  
  const header = document.createElement('div');
  header.innerHTML = '<strong>Debug Logs</strong>';
  header.style.marginBottom = '5px';
  header.style.borderBottom = '1px solid #444';
  header.style.paddingBottom = '5px';
  
  container.appendChild(header);
  document.body.appendChild(container);
  return container;
}

const form = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');

logEvent('DOM Elements', { 
  form: !!form, 
  registerBtn: !!registerBtn, 
  loginBtn: !!loginBtn 
});

registerBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  logEvent('Register button clicked', {});
  
  try {
    // Validate form fields
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!username || !email || !password) {
      const missingFields = [];
      if (!username) missingFields.push('username');
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      logEvent('Validation error', { error: errorMsg });
      alert(errorMsg);
      return;
    }
    
    logEvent('Register data', { username, email, hasPassword: !!password });
    
    // Show registration in progress
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registering...';
    
    // Add detailed request logging 
    logEvent('Sending registration request', {
      url: '/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { username, email, hasPassword: !!password }
    });
    
    // Track timing
    const startTime = Date.now();
    
    try {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const endTime = Date.now();
      logEvent('Register response', { 
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        responseTime: `${endTime - startTime}ms`
      });
      
      // Get response text for diagnostic purposes
      const responseText = await res.text();
      logEvent('Response body', { text: responseText });
      
      let responseData;
      try {
        // Try to parse as JSON if possible
        responseData = JSON.parse(responseText);
      } catch(e) {
        // If not JSON, use the raw text
        responseData = { rawResponse: responseText };
      }
      
      if (res.ok) {
        logEvent('Registration successful', responseData);
        alert('Registration successful! Logging in...');
        await loginUser(username, password);
      } else {
        logEvent('Registration failed', responseData);
        alert(`Registration failed: ${responseData.detail || res.statusText || responseText}`);
      }
    } catch (fetchError) {
      logEvent('Fetch error', { 
        message: fetchError.message, 
        stack: fetchError.stack,
        name: fetchError.name,
        type: 'Network or CORS issue'
      });
      alert(`Network error during registration: ${fetchError.message}. Check console for details.`);
    }
  } catch (error) {
    logEvent('Registration error', { 
      message: error.message, 
      stack: error.stack,
      name: error.name,
      type: error.constructor.name
    });
    alert(`Registration error: ${error.message}`);
  } finally {
    // Re-enable button
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
  }
});

loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  logEvent('Login button clicked', {});
  
  try {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    logEvent('Login data', { username, hasPassword: !!password });
    
    // Show login in progress
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    await loginUser(username, password);
  } catch (error) {
    logEvent('Login button error', { message: error.message });
    alert(`Login error: ${error.message}`);
  } finally {
    // Re-enable button
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

async function loginUser(username, password) {
  try {
    logEvent('Login request', { username });
    
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    logEvent('Login response', { 
      status: res.status, 
      statusText: res.statusText,
      ok: res.ok 
    });
    
    if (res.ok) {
      const data = await res.json();
      logEvent('Login successful', { hasToken: !!data.token });
      
      localStorage.setItem('token', data.token);
      document.getElementById('login').style.display = 'none';
      document.getElementById('game').style.display = 'block';
      
      // Check if the startGame function exists in the main.js module scope
      if (typeof window.startGame === 'function') {
        logEvent('Calling startGame function', { username });
        window.startGame(username);
      } else {
        logEvent('startGame function not found. Creating a simple version', {});
        // Define a basic startGame function for testing
        window.startGame = function(username) {
          document.getElementById('playerName').textContent = `Player: ${username}`;
          logEvent('Simple startGame called', { username });
          alert(`Welcome to the game, ${username}! This is a test version.`);
        };
        window.startGame(username);
      }
    } else {
      const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
      logEvent('Login failed', errorData);
      throw new Error(errorData.detail || res.statusText);
    }
  } catch (error) {
    logEvent('Login error', { message: error.message, stack: error.stack });
    throw error;
  }
}

