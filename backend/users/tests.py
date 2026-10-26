from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'

    def test_user_registration_success(self):
        data = {
            'username': 'teststudent',
            'email': 'student@university.edu',
            'password': 'SecurePassword123!',
            'password2': 'SecurePassword123!',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['username'], 'teststudent')
        self.assertEqual(response.data['user']['email'], 'student@university.edu')

        # Verify User and StudentProfile were created
        user = User.objects.get(username='teststudent')
        self.assertTrue(user.check_password('SecurePassword123!'))
        self.assertTrue(hasattr(user, 'profile'))

    def test_user_registration_passwords_mismatch(self):
        data = {
            'username': 'mismatchuser',
            'email': 'mismatch@example.com',
            'password': 'Password123!',
            'password2': 'DifferentPassword123!',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_user_login_with_username(self):
        User.objects.create_user(
            username='activeuser',
            email='active@example.com',
            password='MyPassword123!'
        )
        response = self.client.post(self.login_url, {
            'username': 'activeuser',
            'password': 'MyPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_user_login_with_email(self):
        User.objects.create_user(
            username='emailuser',
            email='loginviaemail@example.com',
            password='MyPassword123!'
        )
        response = self.client.post(self.login_url, {
            'username': 'loginviaemail@example.com',
            'password': 'MyPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'emailuser')

    def test_user_login_invalid_password(self):
        User.objects.create_user(
            username='wrongpassuser',
            email='wrong@example.com',
            password='CorrectPassword123!'
        )
        response = self.client.post(self.login_url, {
            'username': 'wrongpassuser',
            'password': 'WrongPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_current_user_me_endpoint(self):
        user = User.objects.create_user(
            username='jwtuser',
            email='jwt@example.com',
            password='Password123!'
        )
        # Without token
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Login and obtain token
        login_res = self.client.post(self.login_url, {
            'username': 'jwtuser',
            'password': 'Password123!'
        }, format='json')
        access_token = login_res.data['tokens']['access']

        # With Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.client.get(self.me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['user']['username'], 'jwtuser')
