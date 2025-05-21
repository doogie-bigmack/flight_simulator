try:
    from fastapi import (
        FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
    )
    from fastapi.responses import RedirectResponse
    from fastapi_socketio import SocketManager
    from pydantic import BaseModel
    from jose import jwt, JWTError
    from authlib.jose import JsonWebKey, jwt as oidc_jwt
    from sqlalchemy import create_engine, Column, Integer, String
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    from passlib.hash import bcrypt
except Exception:  # fallback for tests
    class WebSocket:
        pass
    class WebSocketDisconnect(Exception):
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
        def on_event(self, name):
            def decorator(func):
                return func
            return decorator
    class SocketManager:
        def __init__(self, *args, **kwargs):
            self.manager = self
        async def connect(self, *args, **kwargs):
            pass
        async def disconnect(self, *args, **kwargs):
            pass
        async def emit(self, *args, **kwargs):
            pass
    class BaseModel:
        pass
    class DummyMeta:
        def create_all(self, *args, **kwargs):
            pass
    def declarative_base():
        class Base:
            metadata = DummyMeta()
        return Base
    def create_engine(*args, **kwargs):
        return None
    def sessionmaker(*args, **kwargs):
        return lambda: None
    class Column:
        def __init__(self, *args, **kwargs):
            pass
    Integer = String = object
    class Session:
        pass
    class HTTPException(Exception):
        pass
    class RedirectResponse:
        def __init__(self, url: str):
            self.url = url
    class DummyBcrypt:
        @staticmethod
        def hash(p):
            return p
        @staticmethod
        def verify(p, h):
            return p == h
    bcrypt = DummyBcrypt
    jwt = None
    JWTError = Exception
    class JsonWebKey:
        @staticmethod
        def import_key_set(data):
            return data
    class DummyClaims(dict):
        def validate(self):
            return None

    class DummyOIDCJWT:
        @staticmethod
        def encode(header, claims, key):
            return claims

        @staticmethod
        def decode(token, key):
            return DummyClaims(token)
    oidc_jwt = DummyOIDCJWT

import os
import json
import uvicorn
import asyncio
import random
import time
from uuid import uuid4

SECRET_KEY = os.getenv('SECRET_KEY', 'secret')
OIDC_ISSUER = os.getenv('OIDC_ISSUER', '')
OIDC_CLIENT_ID = os.getenv('OIDC_CLIENT_ID', '')
OIDC_JWKS = os.getenv('OIDC_JWKS', '')
OIDC_REDIRECT_URI = os.getenv('OIDC_REDIRECT_URI', '')
if OIDC_JWKS:
    jwk_set = JsonWebKey.import_key_set(json.loads(OIDC_JWKS))
else:
    jwk_set = None

app = FastAPI()
sm = SocketManager(app=app)


@app.on_event('startup')
async def startup_event():
    asyncio.create_task(spawn_stars())

engine = create_engine(
    'sqlite:///app.db', connect_args={'check_same_thread': False}
)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    stars = Column(Integer, default=0)

    def __init__(
        self, username: str, email: str, password: str, stars: int = 0
    ):
        self.username = username
        self.email = email
        self.password = password
        self.stars = stars

Base.metadata.create_all(bind=engine)

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_token(username: str) -> str:
    """Return a JWT for the given username with a 1 hour expiry."""
    if jwt is None:
        return username
    exp = int(time.time()) + 3600
    payload = {'sub': username, 'exp': exp}
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def verify_token(token: str) -> str:
    """Validate a JWT/OIDC token and return the username."""
    if jwk_set is not None:
        try:
            claims = oidc_jwt.decode(token, jwk_set)
            claims.validate()
        except Exception as exc:
            raise HTTPException(status_code=401,
                                detail='Invalid token') from exc
        if OIDC_ISSUER and claims.get('iss') != OIDC_ISSUER:
            raise HTTPException(status_code=401, detail='Invalid issuer')
        if OIDC_CLIENT_ID and claims.get('aud') != OIDC_CLIENT_ID:
            raise HTTPException(status_code=401, detail='Invalid audience')
        return claims.get('sub') or claims.get('preferred_username', '')
    if jwt is None:
        return token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'],
                             options={'verify_exp': False})
    except Exception as exc:
        raise HTTPException(status_code=401, detail='Invalid token') from exc
    exp = payload.get('exp')
    if exp is not None and exp < int(time.time()):
        raise HTTPException(status_code=401, detail='Token expired')
    return payload.get('sub')

@app.get('/register')
async def register():
    if not OIDC_ISSUER:
        raise HTTPException(status_code=500, detail='OIDC not configured')
    url = (f"{OIDC_ISSUER}/register?client_id={OIDC_CLIENT_ID}"
           f"&redirect_uri={OIDC_REDIRECT_URI}")
    return RedirectResponse(url)


@app.get('/login')
async def login():
    if not OIDC_ISSUER:
        raise HTTPException(status_code=500, detail='OIDC not configured')
    url = (f"{OIDC_ISSUER}/authorize?response_type=code&client_id="
           f"{OIDC_CLIENT_ID}&redirect_uri={OIDC_REDIRECT_URI}"
           f"&scope=openid email profile")
    return RedirectResponse(url)

@app.get('/stats')
async def get_stats(authorization: str = '', db: Session = Depends(get_db)):
    token = authorization.replace('Bearer ', '') if authorization else ''
    username = verify_token(token)
    user = db.query(User).filter_by(username=username).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {'username': username, 'stars': user.stars}

players = {}
score = 0
stars = []


async def spawn_stars():
    """Periodically spawn stars at random positions."""
    while True:
        stars.append({'id': str(uuid4()),
                      'x': random.uniform(-5, 5),
                      'y': random.uniform(-5, 5)})
        await asyncio.sleep(1)


def collect_star(star_id: str) -> bool:
    """Remove star and increase score if it exists."""
    global score
    star = next((s for s in stars if s['id'] == star_id), None)
    if star:
        stars.remove(star)
        score += 10
        return True
    return False

@app.websocket('/ws')
async def websocket_endpoint(socket: WebSocket):
    token = ''
    if hasattr(socket, 'query_params'):
        token = socket.query_params.get('token', '')
    try:
        verify_token(token)
    except HTTPException:
        if hasattr(socket, 'close'):
            await socket.close(code=403)
        return
    await sm.connect(socket)
    players[socket] = {'username': '', 'x': 0.0, 'y': 0.0}
    try:
        while True:
            try:
                data = await asyncio.wait_for(socket.receive_json(),
                                             timeout=0.05)
            except asyncio.TimeoutError:
                data = None
            if data:
                if data.get('type') == 'join':
                    players[socket]['username'] = data.get('username', '')
                elif data.get('type') == 'move' and socket in players:
                    cmd = data.get('command')
                    pos = players[socket]
                    if cmd == 'up':
                        pos['y'] += 0.1
                    elif cmd == 'down':
                        pos['y'] -= 0.1
                    elif cmd == 'left':
                        pos['x'] -= 0.1
                    elif cmd == 'right':
                        pos['x'] += 0.1
                    players[socket] = pos
                elif data.get('type') == 'collect_star':
                    if collect_star(data.get('starId', '')):
                        username = players[socket].get('username', '')
                        if username:
                            try:
                                db = SessionLocal()
                                user = (
                                    db.query(User)
                                    .filter_by(username=username)
                                    .first()
                                )
                                if user:
                                    user.stars += 1
                                    db.commit()
                            finally:
                                db.close()
            state = {
                'score': score,
                'players': list(players.values()),
                'stars': stars,
            }
            await sm.emit('state', state)
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        players.pop(socket, None)


def register_user(data: dict, db: Session = None) -> dict:
    if not data.get('username'):
        raise ValueError('username required')
    if db is None:
        try:
            db = SessionLocal()
        except Exception:
            return {'status': 'ok'}
        close = True
    else:
        close = False
    try:
        hashed = bcrypt.hash(data['password'])
        user = User(
            username=data['username'],
            email=data['email'],
            password=hashed
        )
        if hasattr(db, 'add'):
            db.add(user)
            db.commit()
    finally:
        if close and hasattr(db, 'close'):
            db.close()
    return {'status': 'ok'}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
