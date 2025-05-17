# Sky Squad

Sky Squad is a simple 2D multiplayer flight simulator game for kids. Players control colorful planes to collect stars together.

## Setup

Requirements:
- Docker
- Docker Compose

Run:
```bash
docker-compose up
```
Then open `http://localhost`.

## Testing

Run backend tests and frontend tests:

```bash
python -m unittest discover tests/backend -v
npm test
```
