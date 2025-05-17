import unittest
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
