# Sky Squad

Sky Squad is a simple 2D multiplayer flight simulator game for kids. Players control colorful planes to collect stars together.

## Setup

Requirements:
- Docker
- Docker Compose

Environment variables:
- `SECRET_KEY` (optional)

Run:
```bash
docker-compose up
```
Then open `http://localhost`.

Docker Compose starts an Nginx container for the frontend. It serves the static
files in `client/` and proxies `/register`, `/login`, `/stats`, and `/ws` to the
backend service at `http://server:8000` using the config in `client/nginx.conf`.

Use the registration form to create an account, then log in to receive a JWT
token. The game uses this token for authenticated requests. Tokens are valid for
one hour by default.

