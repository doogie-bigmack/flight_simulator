# Prompt for AI Coding Agent: 2D Multiplayer Flight Simulator Game

Create a simple 2D multiplayer flight simulator game called "Sky Squad" for kids, using Three.js for the frontend, a Python FastAPI server for backend logic, and Docker for deployment. The game should be a collaborative, colorful adventure where players fly planes to collect stars, designed to be engaging and easy for kids aged 6–12. Include a basic player registration feature and use OpenID Connect (OIDC) for authentication to track stats.

## Requirements

### 1. Game Mechanics
- A 2D sky world with a bright, cartoonish background (e.g., clouds, sun, blue sky).
- Players control plane avatars (e.g., red, blue, yellow planes) using arrow keys:
  - Up: Increase speed (max 0.2 units/frame).
  - Down: Decrease speed (min 0.05 units/frame).
  - Left/Right: Rotate plane (e.g., ±5 degrees/frame).
- Stars spawn randomly; collecting them adds 10 points to a shared team score.
- Supports 2–4 players in real-time, with all planes visible.
- Display team score and player usernames above planes.

### 2. Frontend (Three.js)
- Use Three.js to render a 2D top-down view with sprites for planes and stars.
- Include kid-friendly animations (e.g., stars twinkle, planes wobble) and cheerful sound effects (e.g., star collection jingle).
- Use free/open-source assets (e.g., from OpenGameArt.org) for planes (32x32 PNGs), stars (32x32 PNGs), and background (512x512 PNG).
- Ensure smooth rendering at 60 FPS.
- **Player Registration**:
  - Add a basic registration/login page (HTML/CSS) before the game starts.
  - Collect username, email, and password; store via backend API.
  - Use OIDC for authentication (e.g., redirect to Okta login page).
  - Display authenticated username in-game and persist stats (e.g., total stars collected).

### 3. Backend (FastAPI)
- Use FastAPI with FastAPI-SocketIO for real-time multiplayer via WebSockets.
- Implement REST APIs for registration (POST /register), login (OIDC flow), and stat retrieval (GET /stats).
- Manage player connections, plane positions, rotations, speeds, star collection, and score updates.
- Store user data (username, email, hashed password, stats) in a SQLite database.
- Synchronize game state across clients every 50ms.
- Handle player disconnections gracefully, removing their plane from the game.
- **OIDC Authentication**:
  - Integrate with an OIDC provider (e.g., Okta) for secure login.
  - Use python-jose and python-authlib for OIDC token validation.
  - Protect game APIs with JWT tokens, verifying user identity for stat tracking.

### 4. Deployment (Docker)
- Provide a `Dockerfile` for the FastAPI server and a static file server (e.g., Nginx) for the frontend.
- Include a `docker-compose.yml` to orchestrate both services, including SQLite setup.
- Expose server on port 8000 and client on port 80.
- Include a `.dockerignore` for Python artifacts (e.g., `__pycache__`).

### 5. Kid-Friendly Features
- Simple controls (arrow keys for gameplay, minimal form for registration).
- Bright, colorful graphics with positive feedback (e.g., “Awesome!” pop-up on star collection).
- Collaborative gameplay (shared score, no competition).
- Avoid   - Avoid complex physics; use basic movement (speed and rotation).

### 6. Deliverables
- **Source Code**:
  - Frontend: HTML/JavaScript with Three.js for rendering, Socket.IO for communication, and OIDC login.
  - Backend: Python/FastAPI-SocketIO for game logic, REST APIs, and OIDC integration.
- **Documentation**:
  - **README.md**: Setup, run instructions, prerequisites (Docker, Docker Compose), asset sources, and gameplay guide.
  - **PRD (Product Requirements Document)**: Outline game objectives, target audience (kids 6–12), features (controls, scoring, multiplayer, registration), and success criteria (e.g., 90% player retention for 10 minutes).
  - **Design Document**: Detail technical architecture (Three.js, FastAPI, WebSockets, OIDC), asset specifications, and animation/sound requirements.
  - **Test Approach Document**: Describe testing strategy, including unit tests (frontend/backend functions), integration tests (client-server sync, OIDC flow), performance tests (60 FPS, <100ms latency), and security tests (input validation, OIDC token security).
  - **Task List**: Markdown file listing development tasks (e.g., “Implement plane movement,” “Set up OIDC,” “Write unit tests”), prioritized and categorized (frontend, backend, testing, deployment).
- **Deployment Files**:
  - `Dockerfile` and `docker-compose.yml` for server and client.
  - `.dockerignore` for Python artifacts.
- Commented code for clarity.

### 7. Constraints
- Follow PEP 8 for Python (4-space indentation, max line length 79).
- Use camelCase, 2-space indentation for JavaScript.
- Use free/open-source assets.
- Ensure server handles up to 4 players without lag.
- Keep game simple for kids (no complex menus or physics).

### 8. Verification
- Test with `docker-compose up`, open `http://localhost` in 2–4 browser tabs, verify:
  - Planes move/rotate with arrow keys.
  - Stars are collected, score updates.
  - Registration/login works via OIDC, usernames display.
- Ensure no errors in browser console or server logs.
- **Mandatory Tests** (must pass before deployment):
  - **Unit Tests**: Cover frontend (e.g., plane movement logic) and backend (e.g., score update, API endpoints) with at least 80% coverage, using Jest for JavaScript and pytest for Python.
  - **Integration Tests**: Verify client-server sync (e.g., plane positions match), OIDC authentication flow, and stat persistence.
  - **Performance Tests**: Confirm 60 FPS rendering and <100ms server latency with 4 players.
  - **Security Tests**: Validate input sanitization (e.g., usernames, emails), OIDC token validation, and WebSocket security (e.g., no unauthorized access).
- Use a CI pipeline (e.g., GitHub Actions) to run tests automatically.

### 9. Notes
- List all external libraries in `requirements.txt` and CDNs in HTML.
- Provide asset placeholders if real assets aren’t included, with instructions to download.
- Commit message format: "feat: implement 2D multiplayer flight simulator game".
- Configure OIDC with a provider like Okta, including client ID, secret, and issuer URL in environment variables.

Please generate the complete project, test it thoroughly, and ensure a clean Git worktree. Follow AGENTS.md conventions if present, prioritizing this prompt’s instructions. Commit all changes with a clear commit message and verify all tests pass before finalizing.
