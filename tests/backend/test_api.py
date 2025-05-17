import unittest
import os
import sys

# Ensure the server package is importable when tests are run with pytest
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server.main import register_user

class ApiTestCase(unittest.TestCase):
    def test_register(self):
        data = {
            'username': 't',
            'email': 't@example.com',
            'password': 'secret'
        }
        res = register_user(data)
        self.assertEqual(res['status'], 'ok')

if __name__ == '__main__':
    unittest.main()