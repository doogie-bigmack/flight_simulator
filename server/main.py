"""Backend for Sky Squad."""

try:  # real imports when available
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
except Exception:  # pragma: no cover - fallback for offline tests
    class WebSocket:  # type: ignore
        async def accept(self):
            pass
        async def receive_json(self):
            return {}
        async def send_json(self, data):
            pass
    class WebSocketDisconnect(Exception):
        pass
    class FastAPI:  # minimal fallback
        def __init__(self):
            pass
        def post(self, path):
            def decorator(func):
                return func
            return decorator
        def get(self, path):
            def decorator(func):
                return func
            return decorator
        def websocket(self, path):
            def decorator(func):
                return func
            return decorator


from pydantic import BaseModel
import uvicorn
import uuid
import random
from typing import Dict, List

app = FastAPI()

users: Dict[str, dict] = {}
players: Dict[str, dict] = {}
connections: List[WebSocket] = []
stars: List[dict] = []
score = 0

def spawn_star() -> dict:
    return {
        "id": uuid.uuid4().hex,
        "x": random.uniform(-4, 4),
        "y": random.uniform(-4, 4),
    }

for _ in range(3):
    stars.append(spawn_star())

def compute_new_position(pos: dict, command: str) -> dict:
    new_pos = dict(pos)
    if command == 'up':
        new_pos['y'] += 0.1
    elif command == 'down':
        new_pos['y'] -= 0.1
    elif command == 'left':
        new_pos['x'] -= 0.1
    elif command == 'right':
        new_pos['x'] += 0.1
    return new_pos

def check_stars(pid: str) -> None:
    global score
    player = players[pid]
    for star in list(stars):
        if (
            abs(player['x'] - star['x']) < 0.5
            and abs(player['y'] - star['y']) < 0.5
        ):
            stars.remove(star)
            score += 10
            stars.append(spawn_star())

async def broadcast_state() -> None:
    state = {'players': players, 'stars': stars, 'score': score}
    for conn in list(connections):
        try:
            await conn.send_json(state)
        except Exception:
            pass

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@app.post('/register')
async def register(req: RegisterRequest):
    users[req.username] = {
        "email": req.email,
        "password": req.password,
        "stats": {"stars": 0}
    }
    return {"status": "ok"}

@app.get('/stats')
async def get_stats():
    return {"score": score}

@app.websocket('/ws')
async def websocket_endpoint(socket: WebSocket):
    await socket.accept()
    pid = uuid.uuid4().hex
    players[pid] = {"x": 0.0, "y": 0.0, "username": ""}
    connections.append(socket)
    try:
        while True:
            data = await socket.receive_json()
            if data.get("type") == "join":
                players[pid]["username"] = data.get("username", "")
            elif data.get("type") == "move":
                players[pid] = compute_new_position(
                    players[pid], data.get("direction")
                )
                check_stars(pid)
            await broadcast_state()
    except WebSocketDisconnect:
        pass
    finally:
        connections.remove(socket)
        players.pop(pid, None)

def register_user(data: dict) -> dict:
    if not data.get('username'):
        raise ValueError('username required')
    users[data['username']] = {
        'email': data.get('email', ''),
        'password': data.get('password', '')
    }
    return {"status": "ok"}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
