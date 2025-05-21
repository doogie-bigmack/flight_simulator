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

Run:
```bash
docker-compose up
```
Then open `http://localhost`.

Use the registration form to create an account, then log in to receive a JWT
token. The game uses this token for authenticated requests. Tokens are valid for
one hour by default.

