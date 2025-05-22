"""
Test cases for database utilities (init_db and backup_db)
"""
import os
import json
import tempfile
import unittest
import shutil
from datetime import datetime
from unittest.mock import patch, MagicMock, mock_open

import sys
# Add parent directory to path to enable imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from server import init_db, backup_db


class TestInitDB(unittest.TestCase):
    """Test cases for database initialization functionality"""
    
    def setUp(self):
        """Set up test environment"""
        # Create a temporary directory for test database
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test.db")
        
        # Mock environment variables
        self.env_patcher = patch.dict('os.environ', {
            'DATABASE_URL': f'sqlite:///{self.db_path}',
            'TEST_MODE': 'true'
        })
        self.env_patcher.start()
    
    def tearDown(self):
        """Clean up after tests"""
        self.env_patcher.stop()
        # Remove temp directory
        shutil.rmtree(self.temp_dir)
    
    @patch('server.init_db.logger')
    def test_get_db_path(self, mock_logger):
        """Test retrieving database path from environment"""
        # Test with environment variable
        path = init_db.get_db_path()
        self.assertEqual(path, self.db_path)
        
        # Test with default path
        with patch.dict('os.environ', {}, clear=True):
            path = init_db.get_db_path()
            self.assertEqual(path, "data/game.db")
    
    @patch('server.init_db.logger')
    def test_ensure_data_directory(self, mock_logger):
        """Test creating data directory"""
        test_path = os.path.join(self.temp_dir, "subdir", "game.db")
        init_db.ensure_data_directory(test_path)
        
        # Verify directory was created
        self.assertTrue(os.path.exists(os.path.dirname(test_path)))
        
        # Test error case
        with patch('os.makedirs') as mock_makedirs:
            mock_makedirs.side_effect = PermissionError("Access denied")
            with self.assertRaises(SystemExit):
                init_db.ensure_data_directory("/root/forbidden.db")
    
    @patch('server.init_db.logger')
    @patch('sqlite3.connect')
    def test_init_database(self, mock_connect, mock_logger):
        """Test database initialization"""
        # Setup mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Run the function
        init_db.init_database()
        
        # Verify correct calls were made
        mock_connect.assert_called_once()
        self.assertTrue(mock_cursor.execute.called)
        mock_conn.commit.assert_called_once()
        mock_conn.close.assert_called_once()
        
        # Test error case
        mock_connect.side_effect = sqlite3.Error("Database error")
        with self.assertRaises(SystemExit):
            init_db.init_database()
    
    @patch('server.init_db.init_database')
    def test_main(self, mock_init):
        """Test main function"""
        result = init_db.main()
        self.assertEqual(result, 0)
        mock_init.assert_called_once()
        
        # Test error case
        mock_init.side_effect = Exception("Unexpected error")
        result = init_db.main()
        self.assertEqual(result, 1)


class TestBackupDB(unittest.TestCase):
    """Test cases for database backup functionality"""
    
    def setUp(self):
        """Set up test environment"""
        # Create a temporary directory for test database and backups
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test.db")
        self.backup_dir = os.path.join(self.temp_dir, "backups")
        
        # Create an empty database file
        with open(self.db_path, 'w') as f:
            f.write("dummy data")
        
        # Mock environment variables
        self.env_patcher = patch.dict('os.environ', {
            'DATABASE_URL': f'sqlite:///{self.db_path}',
            'DATABASE_BACKUP_DIR': self.backup_dir,
            'TEST_MODE': 'true'
        })
        self.env_patcher.start()
    
    def tearDown(self):
        """Clean up after tests"""
        self.env_patcher.stop()
        # Remove temp directory
        shutil.rmtree(self.temp_dir)
    
    @patch('server.backup_db.logger')
    def test_get_db_paths(self, mock_logger):
        """Test retrieving database and backup paths"""
        paths = backup_db.get_db_paths()
        self.assertEqual(paths["db_path"], self.db_path)
        self.assertEqual(paths["backup_dir"], self.backup_dir)
        
        # Test with default paths
        with patch.dict('os.environ', {}, clear=True):
            paths = backup_db.get_db_paths()
            self.assertEqual(paths["db_path"], "data/game.db")
            self.assertEqual(paths["backup_dir"], "./data/backups")
    
    @patch('server.backup_db.logger')
    def test_ensure_backup_directory(self, mock_logger):
        """Test creating backup directory"""
        backup_db.ensure_backup_directory(self.backup_dir)
        
        # Verify directory was created
        self.assertTrue(os.path.exists(self.backup_dir))
        
        # Test error case
        with patch('os.makedirs') as mock_makedirs:
            mock_makedirs.side_effect = PermissionError("Access denied")
            with self.assertRaises(SystemExit):
                backup_db.ensure_backup_directory("/root/forbidden")
    
    @patch('server.backup_db.logger')
    @patch('server.backup_db.datetime')
    def test_backup_database(self, mock_datetime, mock_logger):
        """Test database backup creation"""
        # Mock the datetime to get a consistent timestamp
        mock_date = datetime(2025, 5, 20, 14, 30, 0)
        mock_datetime.now.return_value = mock_date
        mock_datetime.strftime = datetime.strftime
        
        # Create backup directory
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Run the function
        backup_path = backup_db.backup_database()
        
        # Expected backup filename
        expected_filename = f"game_{mock_date.strftime('%Y%m%d_%H%M%S')}.db"
        expected_path = os.path.join(self.backup_dir, expected_filename)
        
        # Verify backup was created with the right path
        self.assertEqual(backup_path, expected_path)
        
        # Test error case with non-existent database
        with patch.dict('os.environ', {'DATABASE_URL': 'sqlite:///nonexistent.db'}):
            with self.assertRaises(SystemExit):
                backup_db.backup_database()
    
    @patch('server.backup_db.logger')
    def test_cleanup_old_backups(self, mock_logger):
        """Test cleanup of old backups"""
        # Create test backup files with different timestamps
        os.makedirs(self.backup_dir, exist_ok=True)
        backup_files = [
            "game_20250510_120000.db",
            "game_20250511_120000.db",
            "game_20250512_120000.db", 
            "game_20250513_120000.db",
            "game_20250514_120000.db",
            "game_20250515_120000.db",
            "game_20250516_120000.db"
        ]
        
        # Create the dummy backup files
        for filename in backup_files:
            with open(os.path.join(self.backup_dir, filename), 'w') as f:
                f.write("dummy backup")
        
        # Run cleanup keeping the 3 most recent
        backup_db.cleanup_old_backups(self.backup_dir, keep=3)
        
        # Check that only the 3 most recent backups are kept
        remaining_files = os.listdir(self.backup_dir)
        self.assertEqual(len(remaining_files), 3)
        self.assertIn("game_20250516_120000.db", remaining_files)
        self.assertIn("game_20250515_120000.db", remaining_files)
        self.assertIn("game_20250514_120000.db", remaining_files)
    
    @patch('server.backup_db.backup_database')
    @patch('server.backup_db.cleanup_old_backups')
    def test_main(self, mock_cleanup, mock_backup):
        """Test main function"""
        # Mock backup to return a valid path
        mock_backup.return_value = "/path/to/backup.db"
        
        # Run main
        result = backup_db.main()
        
        # Verify success
        self.assertEqual(result, 0)
        mock_backup.assert_called_once()
        mock_cleanup.assert_called_once()
        
        # Test backup failure
        mock_backup.return_value = None
        result = backup_db.main()
        self.assertEqual(result, 1)
        
        # Test unexpected error
        mock_backup.side_effect = Exception("Unexpected error")
        result = backup_db.main()
        self.assertEqual(result, 1)


if __name__ == "__main__":
    unittest.main()
