#!/usr/bin/env python3
"""
SQLite Database Backup Script
Creates timestamped backups of the Sky Squad Flight Simulator database
"""
import os
import shutil
import logging
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any


# Configure JSON logging
logging.basicConfig(
    level=logging.INFO,
    format=json.dumps({
        "timestamp": "%(asctime)s",
        "level": "%(levelname)s",
        "message": "%(message)s",
        "component": "DBBackup",
        "function": "%(funcName)s"
    }),
    datefmt="%Y-%m-%dT%H:%M:%SZ"
)
logger = logging.getLogger("db_backup")


def get_db_paths() -> Dict[str, str]:
    """Get the database and backup paths from environment or use defaults"""
    db_url = os.environ.get("DATABASE_URL", "sqlite:///data/game.db")
    if not db_url.startswith("sqlite:///"):
        logger.error(
            "Only SQLite is supported for backups",
            extra={"database_url": db_url}
        )
        sys.exit(1)
    
    # Extract path from SQLite URL
    db_path = db_url.replace("sqlite:///", "")
    backup_dir = os.environ.get("DATABASE_BACKUP_DIR", "./data/backups")
    
    return {
        "db_path": db_path,
        "backup_dir": backup_dir
    }


def ensure_backup_directory(backup_dir: str) -> None:
    """Ensure the backup directory exists"""
    try:
        os.makedirs(backup_dir, exist_ok=True)
        logger.info(
            "Ensured backup directory exists",
            extra={"directory": backup_dir}
        )
    except Exception as e:
        logger.error(
            "Failed to create backup directory",
            extra={"error": str(e), "directory": backup_dir}
        )
        sys.exit(1)


def backup_database() -> Optional[str]:
    """
    Create a timestamped backup of the SQLite database
    
    Returns:
        Optional[str]: Path to the backup file if successful, None otherwise
    """
    paths = get_db_paths()
    db_path = paths["db_path"]
    backup_dir = paths["backup_dir"]
    
    if not os.path.exists(db_path):
        logger.error(
            "Database file not found",
            extra={"db_path": db_path}
        )
        return None
    
    ensure_backup_directory(backup_dir)
    
    # Create timestamp for backup filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"game_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    # Copy database file
    try:
        # SQLite recommended way: Create a database connection and use backup API
        if os.path.getsize(db_path) > 0:  # Check if source file is not empty
            import sqlite3
            
            # Connect to source database
            source_conn = sqlite3.connect(db_path)
            
            # Connect to destination database (will create if doesn't exist)
            backup_conn = sqlite3.connect(backup_path)
            
            # Use SQLite's backup API for safe copying of hot database
            source_conn.backup(backup_conn)
            
            # Close connections
            backup_conn.close()
            source_conn.close()
            
            logger.info(
                "Database backed up successfully using SQLite backup API",
                extra={
                    "source": db_path,
                    "destination": backup_path,
                    "timestamp": timestamp,
                    "size_bytes": os.path.getsize(backup_path)
                }
            )
        else:
            # Fallback to file copy for empty databases
            shutil.copy2(db_path, backup_path)
            logger.info(
                "Empty database backed up using file copy",
                extra={
                    "source": db_path,
                    "destination": backup_path,
                    "timestamp": timestamp
                }
            )
        
        # Cleanup old backups logic can be added here
        # Only keep the latest N backups to save space
        
        return backup_path
    except sqlite3.Error as e:
        logger.error(
            "SQLite error during backup",
            extra={"error": str(e), "source": db_path, "destination": backup_path}
        )
        return None
    except Exception as e:
        logger.error(
            "Unexpected error during backup",
            extra={"error": str(e), "source": db_path, "destination": backup_path}
        )
        return None


def cleanup_old_backups(backup_dir: str, keep: int = 5) -> None:
    """
    Remove old backups, keeping only the latest 'keep' number of backups
    
    Args:
        backup_dir: Directory containing backups
        keep: Number of recent backups to preserve
    """
    try:
        # Get all backup files
        backup_files = [f for f in os.listdir(backup_dir) 
                       if f.startswith("game_backup_") and f.endswith(".db")]
        
        # Sort by timestamp (newest first)
        backup_files.sort(reverse=True)
        
        # Remove old backups
        for old_backup in backup_files[keep:]:
            old_backup_path = os.path.join(backup_dir, old_backup)
            os.remove(old_backup_path)
            logger.info(
                "Removed old backup",
                extra={"file": old_backup}
            )
        
        logger.info(
            "Backup cleanup completed",
            extra={"kept": min(keep, len(backup_files)), "removed": max(0, len(backup_files) - keep)}
        )
    except Exception as e:
        logger.error(
            "Error during backup cleanup",
            extra={"error": str(e), "directory": backup_dir}
        )


def main() -> int:
    """Main function to backup the database"""
    backup_path = backup_database()
    
    if backup_path:
        # Cleanup old backups
        paths = get_db_paths()
        cleanup_old_backups(paths["backup_dir"])
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
