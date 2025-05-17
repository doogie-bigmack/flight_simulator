import unittest
from server.main import register_user, compute_move

class ApiTestCase(unittest.TestCase):
    def test_register(self):
        res = register_user({'username': 't'})
        self.assertEqual(res['status'], 'ok')

    def test_compute_move_up(self):
        pos = {'x': 0.0, 'y': 0.0}
        new_pos = compute_move(pos, 'up')
        self.assertGreater(new_pos['y'], 0.0)

if __name__ == '__main__':
    unittest.main()
