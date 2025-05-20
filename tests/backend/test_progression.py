"""
Tests for the progression system
"""
import unittest
import asyncio
import logging
import json
from unittest.mock import MagicMock, AsyncMock, patch
import sys
import os

# Add the server directory to the path so we can import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../server')))

# Import the modules to test
from progression import PlayerProgression, Achievement, Challenge


class TestPlayerProgression(unittest.TestCase):
    """Tests for the player progression system"""
    
    def setUp(self):
        """Set up test environment"""
        # Create a mock database session
        self.db_session = MagicMock()
        
        # Configure test logger with JSON formatting
        self.logger = logging.getLogger("test_logger")
        for handler in self.logger.handlers:
            self.logger.removeHandler(handler)
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(json.dumps({
            "timestamp": "%(asctime)s",
            "level": "%(levelname)s",
            "message": "%(message)s",
            "module": "%(module)s",
            "function": "%(funcName)s"
        })))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
        
        # Create the progression system
        self.progression = PlayerProgression(self.db_session)
        
        # Override the logger
        self.progression.logger = self.logger
        
        # Create a mock event loop
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
    
    def tearDown(self):
        """Clean up after tests"""
        self.loop.close()
    
    def test_achievement_creation(self):
        """Test that achievements can be created correctly"""
        achievement = Achievement("test_id", "Test Achievement", "Test description", "🔆", 10)
        
        self.assertEqual(achievement.id, "test_id")
        self.assertEqual(achievement.title, "Test Achievement")
        self.assertEqual(achievement.description, "Test description")
        self.assertEqual(achievement.icon, "🔆")
        self.assertEqual(achievement.points, 10)
        self.assertEqual(achievement.hidden, False)
    
    def test_challenge_creation(self):
        """Test that challenges can be created correctly"""
        challenge = Challenge("challenge_id", "Test Challenge", "Test description", 10, 20, "collection", 24)
        
        self.assertEqual(challenge.id, "challenge_id")
        self.assertEqual(challenge.title, "Test Challenge")
        self.assertEqual(challenge.description, "Test description")
        self.assertEqual(challenge.goal, 10)
        self.assertEqual(challenge.reward, 20)
        self.assertEqual(challenge.category, "collection")
        self.assertEqual(challenge.duration_hours, 24)
        
        # Test expiration logic
        self.assertFalse(challenge.is_expired())
    
    def test_level_calculation(self):
        """Test that level calculation works correctly"""
        test_cases = [
            (0, 0),       # 0 XP = level 0
            (50, 0),      # 50 XP < 100 XP (level 1 threshold) = level 0
            (100, 1),     # 100 XP = level 1
            (200, 1),     # 200 XP < 250 XP (level 2 threshold) = level 1
            (250, 2),     # 250 XP = level 2
            (3000, 9),    # 3000 XP < 3250 XP (level 10 threshold) = level 9
            (3250, 10),   # 3250 XP = level 10
            (5000, 10)    # 5000 XP > max defined level = level 10
        ]
        
        for xp, expected_level in test_cases:
            with self.subTest(xp=xp, expected_level=expected_level):
                level = self.progression._calculate_level(xp)
                self.assertEqual(level, expected_level, f"XP {xp} should be level {expected_level}, got {level}")
    
    def test_get_next_level_xp(self):
        """Test getting XP required for the next level"""
        test_cases = [
            (0, 100),     # Level 0 -> Level 1 requires 100 XP
            (5, 1000),    # Level 5 -> Level 6 requires 1000 XP
            (10, -1)      # Level 10 is max, returns -1
        ]
        
        for level, expected_xp in test_cases:
            with self.subTest(level=level, expected_xp=expected_xp):
                next_xp = self.progression.get_next_level_xp(level)
                self.assertEqual(next_xp, expected_xp)
    
    @patch('progression.PlayerProgression._get_user')
    @patch('progression.PlayerProgression._update_user_progression')
    @patch('progression.PlayerProgression.unlock_achievement')
    async def test_add_experience(self, mock_unlock, mock_update, mock_get_user):
        """Test adding experience and leveling up"""
        # Mock user data
        mock_get_user.return_value = {"id": 1, "experience": 90, "level": 0}
        mock_update.return_value = True
        mock_unlock.return_value = None
        
        # Add 20 XP, which should level up to level 1
        result = await self.progression.add_experience(1, 20)
        
        # Check that the user leveled up
        self.assertEqual(result[0], 110)  # New XP
        self.assertEqual(result[1], 1)    # New level
        
        # Check that update was called with correct values
        mock_update.assert_called_once_with(1, 110, 1)
        
        # Check that achievement check was called for level 5
        mock_unlock.assert_not_called()
        
        # Reset mocks
        mock_update.reset_mock()
        mock_unlock.reset_mock()
        
        # Test level 5 achievement
        mock_get_user.return_value = {"id": 1, "experience": 950, "level": 4}
        
        # Add 100 XP, which should level up to level 5
        result = await self.progression.add_experience(1, 100)
        
        # Check level up
        self.assertEqual(result[0], 1050)  # New XP
        self.assertEqual(result[1], 5)     # New level
        
        # Check that level 5 achievement was unlocked
        mock_unlock.assert_called_once_with(1, "level_5")
    
    @patch('progression.PlayerProgression._get_user')
    async def test_track_star_collection(self, mock_get_user):
        """Test tracking star collection achievements"""
        # Mock user data - first time collector
        mock_get_user.return_value = {
            "id": 1, 
            "experience": 0, 
            "level": 0,
            "total_stars": 0,
            "special_stars": 0
        }
        
        # Mock the unlock_achievement method
        self.progression.unlock_achievement = AsyncMock()
        self.progression.unlock_achievement.return_value = {
            "id": "first_star",
            "title": "First Star",
            "description": "Collect your first star",
            "icon": "⭐",
            "points": 5
        }
        
        # Collect first star
        result = await self.progression.track_star_collection(1, 1)
        
        # Verify first_star achievement was unlocked
        self.progression.unlock_achievement.assert_called_once_with(1, "first_star")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "first_star")
        
        # Reset mock
        self.progression.unlock_achievement.reset_mock()
        
        # Change user data to test special star
        mock_get_user.return_value = {
            "id": 1, 
            "experience": 0, 
            "level": 0,
            "total_stars": 1,
            "special_stars": 4,
            "achievements": ["first_star", "collector_10"]
        }
        
        # Mock achievement return value
        self.progression.unlock_achievement.return_value = {
            "id": "special_5",
            "title": "Special Star Hunter",
            "description": "Collect 5 special stars",
            "icon": "🌟",
            "points": 15
        }
        
        # Collect special star (value > 1)
        result = await self.progression.track_star_collection(1, 5)
        
        # Verify special_5 achievement was unlocked
        self.progression.unlock_achievement.assert_called_once_with(1, "special_5")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "special_5")
    
    def test_challenge_generation(self):
        """Test that challenges are generated correctly"""
        challenges = self.progression._generate_daily_challenges(3)
        
        # Verify we got the right number of challenges
        self.assertEqual(len(challenges), 3)
        
        # Verify each challenge has the required attributes
        for challenge in challenges:
            self.assertIsInstance(challenge.id, str)
            self.assertIsInstance(challenge.title, str)
            self.assertIsInstance(challenge.description, str)
            self.assertIsInstance(challenge.goal, int)
            self.assertIsInstance(challenge.reward, int)
            self.assertIsInstance(challenge.category, str)
            self.assertFalse(challenge.is_expired())


if __name__ == '__main__':
    unittest.main()
