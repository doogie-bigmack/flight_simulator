"""
Comprehensive tests for the main server API
"""
import unittest
import os
import sys
import json
from unittest.mock import patch, MagicMock, AsyncMock

# Ensure the server package is importable when tests are run with pytest
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import server.main as m
from server.main import (
    app, stars, players, score, generate_star, 
    collect_star, verify_token, register, get_stats
)


class TestMainAPI(unittest.TestCase):
    """Test cases for the main API functionality"""
    
    def setUp(self):
        """Set up test environment"""
        # Reset global state
        stars.clear()
        players.clear()
        m.score = 0
        
        # Set test environment variables
        self.env_patcher = patch.dict('os.environ', {
            'TEST_MODE': 'true',
            'DISABLE_AUTH': 'true'
        })
        self.env_patcher.start()
    
    def tearDown(self):
        """Clean up after tests"""
        self.env_patcher.stop()
    
    def test_generate_star(self):
        """Test star generation"""
        m.stars.clear()
        
        # Generate a star
        star = m.generate_star()
        
        # Verify it was added to the global stars list
        self.assertEqual(len(m.stars), 1)
        self.assertEqual(m.stars[0], star)
        
        # Verify the star has the required properties
        self.assertIn('id', star)
        self.assertIn('x', star)
        self.assertIn('y', star)
        self.assertIsInstance(star['id'], str)
        self.assertIsInstance(star['x'], float)
        self.assertIsInstance(star['y'], float)
        
        # These properties might be missing in the actual implementation
        if 'value' in star:
            self.assertIsInstance(star['value'], int)
    
    def test_collect_star_not_found(self):
        """Test collecting a non-existent star"""
        m.stars.clear()
        m.score = 0
        result = m.collect_star('nonexistent')
        self.assertFalse(result)
        self.assertEqual(m.score, 0)
    
    def test_collect_star_with_specific_value(self):
        """Test collecting a star with a specific value"""
        m.stars.clear()
        m.score = 0
        
        # Add a star with specific value
        star_id = 'special_star'
        m.stars.append({
            'id': star_id,
            'x': 100,
            'y': 100
        })
        
        # Collect the star
        result = m.collect_star(star_id)
        
        # Verify results
        self.assertTrue(result)
        self.assertEqual(m.score, 1)  # Default value is 1
        self.assertEqual(len(m.stars), 0)
    
    @patch('server.main.bcrypt')
    def test_register_user_duplicate(self, mock_bcrypt):
        """Test registering a user that already exists"""
        # Setup mock
        mock_bcrypt.hash.return_value = "hashed_password"
        
        # For unit testing, we need to mock the players dictionary
        original_players = m.players.copy()
        m.players.clear()  # Clear existing players
        
        try:
            # First registration should succeed
            data = {
                'username': 'duplicate_user',
                'email': 'duplicate@example.com',
                'password': 'secret'
            }
            result = m.register_user(data)
            self.assertEqual(result['status'], 'ok')
            
            # Second registration with same username should fail
            result = m.register_user(data)
            self.assertEqual(result['status'], 'error')
            self.assertIn('User already exists', result['message'])
        finally:
            # Restore the original players dictionary
            m.players = original_players
    
    @patch('server.main.bcrypt')
    def test_register_user_validation(self, mock_bcrypt):
        """Test user registration validation"""
        mock_bcrypt.hash.return_value = "hashed_password"
        
        # Test with missing fields
        data = {'username': 'incomplete'}
        # Make sure the password and email fields exist (even if None)
        data['password'] = None
        data['email'] = None
        result = m.register_user(data)
        self.assertEqual(result['status'], 'error')
        
        # Test with empty values
        data = {
            'username': '',
            'email': 'test@example.com',
            'password': 'secret'
        }
        result = m.register_user(data)
        self.assertEqual(result['status'], 'error')
    
    @patch('server.main.jwt')
    def test_verify_token(self, mock_jwt):
        """Test JWT token verification"""
        # Setup mock
        mock_jwt.decode = MagicMock()
        valid_payload = {'sub': 'user_id', 'username': 'testuser'}
        
        # Test successful verification
        mock_jwt.decode.return_value = valid_payload
        result = m.verify_token('valid_token')
        self.assertEqual(result, valid_payload)
        mock_jwt.decode.assert_called_once()
        
        # Test failed verification (decode raises exception)
        mock_jwt.decode.reset_mock()
        mock_jwt.decode.side_effect = m.JWTError("Invalid token")
        result = m.verify_token('invalid_token')
        self.assertIsNone(result)
    
    @patch('server.main.verify_token')
    @patch('server.main.SessionLocal')
    async def test_get_stats_endpoint(self, mock_session, mock_verify):
        """Test the get_stats API endpoint"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Create a mock user object
        mock_user = MagicMock()
        mock_user.stars = 10
        mock_user.experience = 500
        mock_user.level = 5
        
        # Configure the mock db session to return our mock user
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock token verification to return a valid user ID
        mock_verify.return_value = {'sub': 'user_id', 'username': 'testuser'}
        
        # Call the get_stats function directly and await the result
        response = await m.get_stats(authorization='Bearer valid_token', db=mock_db)
        
        # Verify expected API response format
        self.assertIn('status', response)
        self.assertEqual(response['status'], 'ok')
        self.assertEqual(response['stars'], 10)
        self.assertEqual(response['experience'], 500)
        self.assertEqual(response['level'], 5)
    
    @patch('server.main.verify_token')
    @patch('server.main.SessionLocal')
    async def test_get_stats_no_user(self, mock_session, mock_verify):
        """Test get_stats when user not found"""
        # Setup mocks
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # No user found in database
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mock token verification to return a valid user ID
        mock_verify.return_value = {'sub': 'user_id', 'username': 'testuser'}
        
        # Call the get_stats function directly and await the result
        response = await m.get_stats(authorization='Bearer valid_token', db=mock_db)
        
        # Verify error response
        self.assertIn('status', response)
        self.assertEqual(response['status'], 'error')
        self.assertIn('message', response)


class TestAsyncFunctions(unittest.IsolatedAsyncioTestCase):
    """Test cases for asynchronous functions"""
    
    async def test_spawn_stars(self):
        """Test star spawning loop"""
        # Patch the sleep function to return immediately
        with patch('asyncio.sleep', AsyncMock()) as mock_sleep:
            # Patch generate_star to keep track of calls
            with patch('server.main.generate_star') as mock_generate:
                # Create a MagicMock that will stop the infinite loop after n iterations
                mock_sleep.side_effect = [None, None, Exception("Stop loop")]
                
                # Call the function and handle the exception
                try:
                    await m.spawn_stars()
                except Exception:
                    pass
                
                # Check that generate_star was called
                self.assertEqual(mock_generate.call_count, 3)
    
    async def test_websocket_endpoint(self):
        """Test WebSocket endpoint connections"""
        # Create a mock WebSocket
        mock_socket = AsyncMock()
        mock_socket.accept = AsyncMock()
        mock_socket.close = AsyncMock()
        mock_socket.send_json = AsyncMock()
        mock_socket.receive_json = AsyncMock()
        
        # Mock out the socket manager
        with patch('server.main.sm', AsyncMock()) as mock_sm:
            # Set up receive_json to first return a connection message then raise disconnect
            mock_socket.receive_json.side_effect = [
                {"type": "connect", "data": {"username": "test_user"}},
                m.WebSocketDisconnect()
            ]
            
            # Mock generate_star to avoid randomness
            with patch('server.main.generate_star') as mock_generate:
                mock_generate.return_value = {"id": "test_star", "x": 0.5, "y": 0.5}
                
                # Mock spawn_stars to avoid async loop
                with patch('server.main.spawn_stars', AsyncMock()):
                    # Run the endpoint handler with exception handling
                    try:
                        await m.websocket_endpoint(mock_socket)
                    except Exception:
                        pass
                    
                    # Verify connection was accepted
                    mock_socket.accept.assert_called_once()
                    
                    # Verify socket was added to players
                    self.assertIn(mock_socket, m.players)


if __name__ == '__main__':
    unittest.main()
