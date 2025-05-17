try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
except Exception:  # fallback for tests
    class WebSocket:
        async def accept(self):
            pass
        async def receive_json(self):
            return {}
        async def send_json(self, data):
            pass
    class WebSocketDisconnect(Exception):
        pass
    class FastAPI:
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

app = FastAPI()

players = {}
websockets = []
score = 0
star = {"x": 0.0, "y": 0.0}

def spawn_star():
    import random
    star["x"] = random.uniform(-4, 4)
    star["y"] = random.uniform(-4, 4)

spawn_star()

def compute_move(pos: dict, direction: str) -> dict:
    step = 0.1
    if direction == 'up':
        pos['y'] += step
    elif direction == 'down':
        pos['y'] -= step
    elif direction == 'left':
        pos['x'] -= step
    elif direction == 'right':
        pos['x'] += step
    return pos

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@app.post('/register')
async def register(req: RegisterRequest):
    return register_user(req.dict())

@app.get('/stats')
async def get_stats():
    return {"score": score}

@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    websockets.append(ws)
    pid = id(ws)
    players[pid] = {"x": 0.0, "y": 0.0, "username": "anon"}
    await broadcast_state()
    try:
        while True:
            data = await ws.receive_json()
            if data.get('type') == 'join':
                players[pid]['username'] = data.get('username', 'anon')
            elif data.get('type') == 'move':
                direction = data.get('direction')
                players[pid] = compute_move(players[pid], direction)
                if abs(players[pid]['x'] - star['x']) < 0.5 and abs(players[pid]['y'] - star['y']) < 0.5:
                    global score
                    score += 10
                    spawn_star()
            await broadcast_state()
    except WebSocketDisconnect:
        websockets.remove(ws)
        players.pop(pid, None)
        await broadcast_state()

def register_user(data: dict) -> dict:
    if not data.get('username'):
        raise ValueError('username required')
    # placeholder for storing user in database
    return {"status": "ok"}

async def broadcast_state():
    state = {"players": list(players.values()), "score": score, "star": star}
    for ws in list(websockets):
        try:
            await ws.send_json(state)
        except Exception:
            pass

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
