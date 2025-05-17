import unittest
from server.main import register_user

class ApiTestCase(unittest.TestCase):
    def test_register(self):
        res = register_user({'username': 't'})
        self.assertEqual(res['status'], 'ok')

if __name__ == '__main__':
    unittest.main()
