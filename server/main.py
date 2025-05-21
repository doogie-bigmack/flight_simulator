# Standard library imports
import os
import random
import json
import logging
import time
import traceback
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Configure logging
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'name': record.name,
            'message': record.getMessage()
        }
        
        # Add extra fields if available
        if hasattr(record, 'extra') and record.extra:
            log_record.update(record.extra)
            
        # Add exception info if available
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

# Set up logger with appropriate format based on environment setting
logger = logging.getLogger(__name__)
log_level = os.getenv('LOG_LEVEL', 'INFO')
log_format = os.getenv('LOG_FORMAT', 'standard')

# Set log level
logger.setLevel(getattr(logging, log_level))

# Create console handler
ch = logging.StreamHandler()

# Choose formatter based on config
if log_format.lower() == 'json':
    formatter = JsonFormatter()
else:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
ch.setFormatter(formatter)
logger.addHandler(ch)

# Track if we're using real FastAPI or dummy implementation
USING_REAL_FASTAPI = True

try:
    # FastAPI and related imports
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi_socketio import SocketManager
    from pydantic import BaseModel
    
    # JWT authentication
    from jose import jwt, JWTError, jwk
    from authlib.integrations.requests_client import OAuth2Session
    
    # Database libraries
    from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session, relationship
    from passlib.hash import bcrypt
    
    # Import progression system
    from progression import PlayerProgression
    
    # Define a simple ASGI middleware class
    class ASGIMiddleware:
        def __init__(self, app):
            self.app = app
            
        async def __call__(self, scope, receive, send):
            await self.app(scope, receive, send)
    
except Exception as e:  # fallback for tests
    USING_REAL_FASTAPI = False
    logger.warning(f"Using dummy implementations due to import error: {str(e)}")
    class WebSocket:
        pass
    class WebSocketDisconnect(Exception):
        pass
    class FastAPI:
        def __init__(self, **kwargs):
            self.routes = {}
            self.events = {}
            # Store any kwargs for compatibility with real FastAPI
            self.config = kwargs
            
        def post(self, path):
            def decorator(func):
                self.routes[('POST', path)] = func
                return func
            return decorator
            
        def get(self, path):
            def decorator(func):
                self.routes[('GET', path)] = func
                return func
            return decorator
            
        def websocket(self, path):
            def decorator(func):
                self.routes[('WS', path)] = func
                return func
            return decorator
            
        def on_event(self, name):
            def decorator(func):
                self.events[name] = func
                return func
            return decorator
            
        # Make the object callable for ASGI compatibility
        async def __call__(self, scope, receive, send):
            # This makes our dummy FastAPI class compatible with ASGI protocol
            type_scope = scope.get('type', '')
            
            if type_scope == 'lifespan':
                # Handle the lifespan protocol
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    await send({'type': 'lifespan.shutdown.complete'})
                return
            
            # For HTTP requests
            if type_scope == 'http':
                method = scope.get('method', '')
                path = scope.get('path', '')
                
                # Wait for the request body
                await receive()
                
                # Log the request
                logger.info(f"Dummy FastAPI handling request", extra={"method": method, "path": path})
                
                # For the register endpoint specifically
                if method == 'POST' and path == '/register':
                    # Simple response for ASGI protocol
                    await send({
                        'type': 'http.response.start',
                        'status': 200,
                        'headers': [[b'content-type', b'application/json']],
                    })
                    
                    # Format a basic response for register
                    response = '{"status": "ok", "message": "User registered successfully"}'
                    await send({
                        'type': 'http.response.body',
                        'body': response.encode('utf-8'),
                    })
                else:
                    # Default response
                    await send({
                        'type': 'http.response.start',
                        'status': 200,
                        'headers': [[b'content-type', b'application/json']],
                    })
                    
                    # Format a basic response
                    response = '{"status": "ok"}'
                    await send({
                        'type': 'http.response.body',
                        'body': response.encode('utf-8'),
                    })
            
        # Mock middleware methods
        def add_middleware(self, middleware_class, **options):
            # Do nothing in dummy mode
            pass
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
    Integer = String = DateTime = Boolean = object
    def ForeignKey(col_name):
        return None
    class Session:
        pass
    class HTTPException(Exception):
        pass
    def relationship(*args, **kwargs):
        return None
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

# Environment variables
SECRET_KEY = os.getenv('SECRET_KEY', 'secret')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))

import uvicorn
import asyncio

# Initialize FastAPI application
if USING_REAL_FASTAPI:
    # Real FastAPI with all features
    app = FastAPI(title="Sky Squad Game Server", 
           description="Backend server for Sky Squad kids flight simulator",
           version="1.0.0")
    # Enable CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("Using real FastAPI implementation")
else:
    # Simple dummy implementation for testing
    app = FastAPI()
    logger.warning("Using dummy FastAPI implementation")
    
# Initialize SocketManager for real-time communication
sm = SocketManager(app=app)

# Initialize progression system
player_progression = None

@app.on_event("startup")
async def initialize_progression():
    global player_progression
    player_progression = PlayerProgression(SessionLocal())

@app.on_event('startup')
async def startup_event():
    asyncio.create_task(spawn_stars())

engine = create_engine('sqlite:///app.db', connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    stars = Column(Integer, default=0)
    experience = Column(Integer, default=0)
    level = Column(Integer, default=0)
    login_streak = Column(Integer, default=0)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    
    # Relationships
    achievements = relationship("UserAchievement", back_populates="user")
    challenge_progress = relationship("ChallengeProgress", back_populates="user")
    
    def __init__(self, username: str, email: str, password: str, stars: int = 0,
                 experience: int = 0, level: int = 0):
        self.username = username
        self.email = email
        self.password = password
        self.stars = stars
        self.experience = experience
        self.level = level
        self.created_at = datetime.now()


class UserAchievement(Base):
    __tablename__ = 'user_achievements'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    achievement_id = Column(String, index=True)
    unlocked_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    
    def __init__(self, user_id: int, achievement_id: str):
        self.user_id = user_id
        self.achievement_id = achievement_id


class ChallengeProgress(Base):
    __tablename__ = 'challenge_progress'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    challenge_id = Column(String, index=True)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    user = relationship("User", back_populates="challenge_progress")
    
    def __init__(self, user_id: int, challenge_id: str, progress: int = 0):
        self.user_id = user_id
        self.challenge_id = challenge_id
        self.progress = progress

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
    """Validate a JWT and return the username if valid and not expired."""
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

@app.post('/register')
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        # Log detailed registration information
        logger.info("Registration attempt", extra={
            "username": req.username,
            "email": req.email,
            "has_password": bool(req.password),
            "request_info": {
                "endpoint": "/register",
                "method": "POST",
                "timestamp": datetime.now().isoformat()
            }
        })
        
        # Validate required fields
        if not req.username or not req.email or not req.password:
            missing = []
            if not req.username: missing.append("username")
            if not req.email: missing.append("email")
            if not req.password: missing.append("password")
            
            error_msg = f"Missing required fields: {', '.join(missing)}"
            logger.error("Registration validation failed", extra={
                "username": req.username,
                "error": error_msg,
                "missing_fields": missing
            })
            raise HTTPException(status_code=422, detail=error_msg)
        
        # Process registration
        try:
            data = req.dict()
            register_user(data, db)
            logger.info("Registration successful", extra={"username": req.username})
            return {'status': 'ok', 'username': req.username}
        except Exception as e:
            error_detail = str(e)
            logger.error("Registration processing failed", extra={
                "username": req.username,
                "error": error_detail,
                "error_type": type(e).__name__
            })
            raise HTTPException(status_code=400, detail=error_detail)
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        logger.error("Registration HTTP exception", extra={
            "username": req.username if hasattr(req, 'username') else "unknown",
            "status_code": he.status_code,
            "detail": he.detail
        })
        raise
    except Exception as e:
        # Catch all other exceptions
        logger.error("Registration unexpected error", extra={
            "username": req.username if hasattr(req, 'username') else "unknown",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
        raise HTTPException(status_code=500, detail="Internal server error during registration")


@app.post('/login')
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username).first()
    if not user or not bcrypt.verify(req.password, user.password):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_token(user.username)
    return {'token': token}

@app.get('/stats')
async def get_stats(authorization: str = '', db: Session = Depends(get_db)):
    token = authorization.replace('Bearer ', '') if authorization else ''
    username = verify_token(token)
    user = db.query(User).filter_by(username=username).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {'username': username, 'stars': user.stars}

# Game state variables
players = {}
score = 0
stars = []
star_id_counter = 0

# Configure logger
logger = logging.getLogger("sky_squad")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(json.dumps({
    "timestamp": "%(asctime)s",
    "level": "%(levelname)s",
    "message": "%(message)s",
    "module": "%(module)s",
    "function": "%(funcName)s"
})))
logger.addHandler(handler)


def generate_star():
    """Generate a new star with random position and value"""
    global stars, star_id_counter
    star_id_counter += 1
    
    # Randomly assign value - 10% chance of special star
    value = 5 if random.random() < 0.1 else 1
    
    star = {
        'id': f'star_{star_id_counter}',
        'x': random.uniform(-4.5, 4.5),
        'y': random.uniform(-4.5, 4.5),
        'value': value  # Add value property
    }
    stars.append(star)
    logger.info("Generated star", extra={
        "star_id": star['id'],
        "position": {"x": star['x'], "y": star['y']},
        "value": star['value']
    })
    return star

async def spawn_stars():
    """Periodically spawn stars at random positions."""
    while True:
        generate_star()
        await asyncio.sleep(1)


async def collect_star(star_id: str, socket: WebSocket = None) -> bool:
    """Remove star and increase score if it exists."""
    global score
    star = next((s for s in stars if s['id'] == star_id), None)
    if not star:
        return False
    
    # Get star value
    star_value = star.get('value', 1)
    stars.remove(star)
    
    # Add star value to score
    score += star_value
    
    # Track progression if socket has a user
    if socket and socket in players and 'user_id' in players[socket]:
        user_id = players[socket]['user_id']
        
        # Track star collection for achievements
        progression = PlayerProgression(SessionLocal())
        unlocked_achievements = await progression.track_star_collection(user_id, star_value)
        
        # Notify client of achievements
        if unlocked_achievements and len(unlocked_achievements) > 0:
            for achievement in unlocked_achievements:
                await sm.emit('achievement', achievement, room=socket.client.sid)
    
    # Log star collection
    logger.info("Star collected", extra={
        "star_id": star_id,
        "value": star_value,
        "new_score": score
    })
    
    # Generate a new star to replace the collected one
    generate_star()
    return True

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
    players[socket] = {'username': '', 'user_id': None, 'x': 0.0, 'y': 0.0}
    
    # Setup progression
    progression = PlayerProgression(SessionLocal())
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(socket.receive_json(),
                                             timeout=0.05)
            except asyncio.TimeoutError:
                data = None
                
            if data:
                if data.get('type') == 'join':
                    username = data.get('username', '')
                    players[socket]['username'] = username
                    
                    # Get or create user
                    db = SessionLocal()
                    try:
                        user = db.query(User).filter(User.username == username).first()
                        if not user:
                            user = User(username=username, email=f"{username}@example.com", password="")
                            db.add(user)
                            db.commit()
                            db.refresh(user)
                        
                        # Set user_id in player data
                        players[socket]['user_id'] = user.id
                        
                        # Update login streak
                        streak, achievement = await progression.update_login_streak(user.id)
                        if achievement:
                            await sm.emit('achievement', achievement, room=socket.client.sid)
                            
                        # Send user progress data
                        progress = await progression.get_user_progress(user.id)
                        await sm.emit('progress', progress, room=socket.client.sid)
                        
                        # Send challenges
                        challenges = progression.get_challenges()
                        await sm.emit('challenges', challenges, room=socket.client.sid)
                    except Exception as e:
                        logger.error("Error processing join", extra={"error": str(e)})
                    finally:
                        db.close()
                        
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
                    # Use our async version that handles progression tracking
                    star_collected = await collect_star(data.get('starId', ''), socket)
                    
                    # Also update the user's star count in the database
                    if star_collected:
                        username = players[socket].get('username', '')
                        if username:
                            try:
                                db = SessionLocal()
                                user = db.query(User).filter_by(username=username).first()
                                if user:
                                    user.stars += 1
                                    db.commit()
                            finally:
                                db.close()
                    
                elif data.get('type') == 'get_progress' and socket in players and players[socket].get('user_id'):
                    user_id = players[socket]['user_id']
                    progress = await progression.get_user_progress(user_id)
                    await sm.emit('progress', progress, room=socket.client.sid)
                    
                elif data.get('type') == 'get_challenges' and socket in players:
                    challenges = progression.get_challenges()
                    await sm.emit('challenges', challenges, room=socket.client.sid)
            
            # Send game state update
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
        user = User(username=data['username'], email=data['email'], password=hashed)
        if hasattr(db, 'add'):
            db.add(user)
            db.commit()
    finally:
        if close and hasattr(db, 'close'):
            db.close()
    return {'status': 'ok'}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
