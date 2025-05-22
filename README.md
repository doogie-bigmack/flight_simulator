# Sky Squad

Sky Squad is a simple 2D multiplayer flight simulator game for kids. Players control colorful planes to collect stars together.

## Setup

Requirements:
- Docker
- Docker Compose

Environment variables:

- `SECRET_KEY` (optional)
- `OIDC_ISSUER` - OIDC provider URL
- `OIDC_CLIENT_ID` - client ID
- `OIDC_JWKS` - JWKS JSON string
- `OIDC_REDIRECT_URI` - callback URL

- `SECRET_KEY` - secret used to sign JWT tokens
- `TOKEN_EXPIRY_MINUTES` - how long tokens remain valid (default 60)
- `SERVER_PORT` - port for the FastAPI server (default 8000)

Set these in `docker-compose.yml` under `environment` or in a `.env` file.


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

