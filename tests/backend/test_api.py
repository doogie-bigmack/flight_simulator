import unittest
import os
import sys

# Ensure the server package is importable when tests are run with pytest
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import server.main as m
from server.main import register_user, collect_star, stars

class ApiTestCase(unittest.TestCase):
    def test_register(self):
        data = {
            'username': 't',
            'email': 't@example.com',
            'password': 'secret'
        }
        res = register_user(data)
        self.assertEqual(res['status'], 'ok')

    def test_collect_star_increases_score(self):
        stars.clear()
        stars.append({'id': 's1', 'x': 0, 'y': 0})
        start_score = m.score
        collect_star('s1')
        self.assertEqual(m.score, start_score + 1)
        self.assertEqual(len(stars), 0)
if __name__ == '__main__':
    unittest.main()
