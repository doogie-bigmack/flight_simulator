#!/usr/bin/env python3
"""
SQLite Database Initialization Script
Creates all necessary tables for the Sky Squad Flight Simulator
"""
import os
import sqlite3
import logging
import json
import sys
from datetime import datetime

# Configure JSON logging
logging.basicConfig(
    level=logging.INFO,
    format=json.dumps({
        "timestamp": "%(asctime)s",
        "level": "%(levelname)s",
        "message": "%(message)s",
        "component": "DBInit",
        "function": "%(funcName)s"
    }),
    datefmt="%Y-%m-%dT%H:%M:%SZ"
)
logger = logging.getLogger("db_init")

def get_db_path():
    """Get the database path from environment or use default"""
    db_url = os.environ.get("DATABASE_URL", "sqlite:///data/game.db")
    if not db_url.startswith("sqlite:///"):
        logger.error(
            "Only SQLite is supported",
            extra={"database_url": db_url}
        )
        sys.exit(1)
    
    # Extract path from SQLite URL
    db_path = db_url.replace("sqlite:///", "")
    return db_path

def ensure_data_directory(db_path):
    """Ensure the directory for the database exists"""
    try:
        directory = os.path.dirname(os.path.abspath(db_path))
        os.makedirs(directory, exist_ok=True)
        logger.info(
            "Ensured data directory exists",
            extra={"directory": directory}
        )
    except Exception as e:
        logger.error(
            "Failed to create data directory",
            extra={"error": str(e), "directory": os.path.dirname(db_path)}
        )
        sys.exit(1)

def init_database():
    """Initialize the SQLite database with all required tables"""
    db_path = get_db_path()
    ensure_data_directory(db_path)
    
    logger.info(
        "Initializing database",
        extra={"db_path": db_path}
    )
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            experience INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            total_stars INTEGER DEFAULT 0,
            special_stars INTEGER DEFAULT 0,
            login_streak INTEGER DEFAULT 0,
            last_login TEXT,
            created_at TEXT
        )
        ''')
        
        # Create achievements table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS achievements (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            achievement_id TEXT,
            unlocked_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, achievement_id)
        )
        ''')
        
        # Create challenges table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS challenges (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            challenge_id TEXT,
            progress INTEGER DEFAULT 0,
            goal INTEGER,
            completed BOOLEAN DEFAULT 0,
            expires_at TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        # Create game_settings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            description TEXT,
            updated_at TEXT
        )
        ''')
        
        # Create initial settings if they don't exist
        settings = [
            ('star_base_value', '1', 'Base value for regular stars'),
            ('star_special_value', '5', 'Value for special stars'),
            ('xp_per_star', '10', 'XP awarded per star'),
            ('max_player_level', '30', 'Maximum player level'),
            ('challenge_duration_hours', '24', 'Duration of daily challenges in hours'),
            ('daily_challenges_count', '3', 'Number of daily challenges to generate')
        ]
        
        cursor.executemany('''
        INSERT OR IGNORE INTO game_settings (key, value, description, updated_at)
        VALUES (?, ?, ?, ?)
        ''', [(k, v, d, datetime.utcnow().isoformat() + "Z") for k, v, d in settings])
        
        conn.commit()
        logger.info(
            "Database successfully initialized",
            extra={"tables_created": 4, "initial_settings": len(settings)}
        )
    except sqlite3.Error as e:
        logger.error(
            "SQLite error occurred",
            extra={"error": str(e)}
        )
        sys.exit(1)
    except Exception as e:
        logger.error(
            "Unexpected error occurred",
            extra={"error": str(e)}
        )
        sys.exit(1)
    finally:
        if conn:
            conn.close()

def main():
    """Main function to initialize the database"""
    init_database()
    return 0

if __name__ == "__main__":
    sys.exit(main())
