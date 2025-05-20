# Sky Squad

Sky Squad is a simple 2D multiplayer flight simulator game for kids. Players control colorful planes to collect stars together.

## Setup

Requirements:
- Docker
- Docker Compose

Environment variables:
- `SECRET_KEY` - secret used to sign JWT tokens
- `TOKEN_EXPIRY_MINUTES` - how long tokens remain valid (default 60)
- `SERVER_PORT` - port for the FastAPI server (default 8000)

Set these in `docker-compose.yml` under `environment` or in a `.env` file.

Run:
```bash
docker-compose up
```
Then open `http://localhost`.

Use the registration form to create an account, then log in to receive a JWT
token. The game uses this token for authenticated requests.

