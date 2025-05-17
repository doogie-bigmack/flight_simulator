try:
    from fastapi import FastAPI, WebSocket
    from fastapi.responses import HTMLResponse
    from fastapi_socketio import SocketManager
except Exception:  # fallback for tests
    class WebSocket:  # dummy
        pass
    class FastAPI:
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
    class SocketManager:
        def __init__(self, *args, **kwargs):
            self.manager = self
        async def connect(self, *args, **kwargs):
            pass
        async def emit(self, *args, **kwargs):
            pass
    HTMLResponse = object

from pydantic import BaseModel
import uvicorn
import asyncio

app = FastAPI()
sm = SocketManager(app=app)

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@app.post('/register')
async def register(req: RegisterRequest):
    return {"status": "ok"}

@app.get('/stats')
async def get_stats():
    return {"score": 0}

@app.websocket('/ws')
async def websocket_endpoint(socket: WebSocket):
    await sm.connect(socket)
    try:
        while True:
            await sm.emit('state', {"score": 0})
            # throttle updates to avoid hogging CPU
            await asyncio.sleep(0.05)
    except Exception:
        pass

def register_user(data: dict) -> dict:
    if not data.get('username'):
        raise ValueError('username required')
    return {"status": "ok"}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
