from unittest.mock import patch, MagicMock
import io
import json
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import EducationRecord, StudySpace, StudentProfile
from .google_auth import verify_google_id_token


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'
        self.complete_profile_url = '/api/auth/profile/complete/'
        self.session_extend_url = '/api/auth/session/extend/'
        self.logout_url = '/api/auth/logout/'
        self.education_url = '/api/education/'
        self.study_spaces_url = '/api/study-spaces/'
        self.partners_url = '/api/partners/'
        self.google_auth_url = '/api/auth/google/'

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
        self.assertTrue(response.data['requires_profile_completion'])

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
        login_res = self.client.post(self.login_url, {
            'username': 'jwtuser',
            'password': 'Password123!'
        }, format='json')
        access_token = login_res.data['tokens']['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.client.get(self.me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['user']['username'], 'jwtuser')

    def test_profile_completion_workflow(self):
        user = User.objects.create_user(
            username='onboarding_user',
            email='onboard@example.com',
            password='Password123!'
        )
        login_res = self.client.post(self.login_url, {
            'username': 'onboarding_user',
            'password': 'Password123!'
        }, format='json')
        access_token = login_res.data['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        payload = {
            'name': 'Rohan Sharma',
            'branch': 'Computer Science & Engineering',
            'year': 3,
            'bio': 'Passionate about algorithms, system design, and building AI applications.',
            'availability': 'Weekdays 6:00 PM - 9:00 PM',
            'collaboration_style': 'Pomodoro & Silent Accountability',
            'subjects': ['Python', 'DBMS', 'Algorithms'],
            'education': {
                'level': 'ug',
                'institution_name': 'Indian Institute of Technology',
                'degree': 'B.Tech',
                'specialization': 'Computer Science',
                'start_year': 2022,
                'completion_year': 2026,
                'is_currently_studying': True,
                'grading_type': 'cgpa',
                'cgpa': 9.1,
                'cgpa_scale': 10.0,
            }
        }
        res = self.client.post(self.complete_profile_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['user']['is_profile_completed'])

        # Verify education record was saved to DB
        user.refresh_from_db()
        self.assertEqual(user.first_name, 'Rohan')
        self.assertEqual(user.last_name, 'Sharma')
        self.assertTrue(user.profile.is_profile_completed)
        self.assertEqual(user.profile.education_records.count(), 1)

    def test_education_crud(self):
        user = User.objects.create_user(
            username='eduuser',
            email='edu@example.com',
            password='Password123!'
        )
        login_res = self.client.post(self.login_url, {
            'username': 'eduuser',
            'password': 'Password123!'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login_res.data["tokens"]["access"]}')

        # 1. Create education record
        create_res = self.client.post(self.education_url, {
            'level': 'class_12',
            'institution_name': 'Delhi Public School',
            'board': 'CBSE',
            'stream': 'Science',
            'passing_year': 2022,
            'percentage': 95.4,
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        rec_id = create_res.data['record']['id']

        # 2. List education records
        list_res = self.client.get(self.education_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data['education']), 1)

        # 3. Update education record
        update_res = self.client.put(f'{self.education_url}{rec_id}/', {
            'percentage': 96.0,
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['record']['percentage'], 96.0)

        # 4. Delete education record
        del_res = self.client.delete(f'{self.education_url}{rec_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertEqual(EducationRecord.objects.count(), 0)

    def test_study_spaces_crud(self):
        user = User.objects.create_user(
            username='spaceuser',
            email='space@example.com',
            password='Password123!'
        )
        login_res = self.client.post(self.login_url, {
            'username': 'spaceuser',
            'password': 'Password123!'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login_res.data["tokens"]["access"]}')

        # 1. Create space
        create_res = self.client.post(self.study_spaces_url, {
            'title': 'Learn Python Backend',
            'subject': 'Python & Django',
            'goal': 'Build REST APIs and learn ORM',
            'schedule': 'Mon, Wed, Fri · 7:00 PM',
            'duration': '60 mins',
            'learning_style': 'Pomodoro Focus',
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        space_id = create_res.data['space']['id']

        # 2. Update progress
        update_res = self.client.put(f'{self.study_spaces_url}{space_id}/', {
            'sessions_completed': 2,
            'progress_percent': 30,
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['space']['sessions_completed'], 2)

        # 3. List spaces
        list_res = self.client.get(self.study_spaces_url)
        self.assertEqual(len(list_res.data['spaces']), 1)

    def test_session_extend_and_logout(self):
        user = User.objects.create_user(
            username='sessionuser',
            email='sess@example.com',
            password='Password123!'
        )
        login_res = self.client.post(self.login_url, {
            'username': 'sessionuser',
            'password': 'Password123!'
        }, format='json')
        access_token = login_res.data['tokens']['access']
        refresh_token = login_res.data['tokens']['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 1. Extend active session
        extend_res = self.client.post(self.session_extend_url)
        self.assertEqual(extend_res.status_code, status.HTTP_200_OK)
        self.assertTrue(extend_res.data['success'])

        # 2. Logout
        logout_res = self.client.post(self.logout_url, {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)


class GoogleAuthTests(TestCase):
    """
    Test suite for Google OAuth 2.0 ID token authentication.
    Verifies secure token validation, account find/creation, JWT issuance,
    inactive account handling, and error conditions.
    """

    def setUp(self):
        self.client = APIClient()
        self.google_auth_url = '/api/auth/google/'
        self.me_url = '/api/auth/me/'

    def test_google_auth_missing_token(self):
        """Request without an id_token or credential returns 400 Bad Request."""
        res = self.client.post(self.google_auth_url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', res.data)
        self.assertEqual(res.data['error'], 'Google ID token is required.')

    @patch('users.views.verify_google_id_token')
    def test_google_auth_invalid_token_error(self, mock_verify):
        """Invalid or expired Google token returns 400 with a descriptive error."""
        mock_verify.side_effect = ValueError('Invalid or expired Google token: Token expired')
        res = self.client.post(self.google_auth_url, {'id_token': 'expired-jwt-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid or expired Google token', res.data['error'])

    @patch('users.views.verify_google_id_token')
    def test_google_auth_audience_mismatch_error(self, mock_verify):
        """Token with mismatched client ID audience returns 400."""
        mock_verify.side_effect = ValueError('Google token audience mismatch. The token was issued for a different client.')
        res = self.client.post(self.google_auth_url, {'id_token': 'mismatched-aud-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('audience mismatch', res.data['error'])

    @patch('users.views.verify_google_id_token')
    def test_google_auth_unverified_email_error(self, mock_verify):
        """Google account without verified email is rejected with 400."""
        mock_verify.side_effect = ValueError('Google account email address is not verified.')
        res = self.client.post(self.google_auth_url, {'id_token': 'unverified-email-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not verified', res.data['error'])

    @patch('users.views.verify_google_id_token')
    def test_google_auth_new_user_creation(self, mock_verify):
        """New user signing in with Google is created, given tokens, and assigned profile."""
        mock_verify.return_value = {
            'email': 'newstudent@university.edu',
            'sub': 'google-uid-1001',
            'name': 'Taylor Swift',
            'given_name': 'Taylor',
            'family_name': 'Swift',
            'picture': 'https://lh3.googleusercontent.com/avatar_ts.jpg',
        }

        res = self.client.post(self.google_auth_url, {'id_token': 'valid-google-id-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])
        self.assertIn('refresh', res.data['tokens'])
        self.assertEqual(res.data['user']['email'], 'newstudent@university.edu')
        self.assertTrue(res.data['requires_profile_completion'])

        # Verify DB records
        user = User.objects.get(email='newstudent@university.edu')
        self.assertEqual(user.first_name, 'Taylor')
        self.assertEqual(user.last_name, 'Swift')
        self.assertFalse(user.has_usable_password())
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.avatar_url, 'https://lh3.googleusercontent.com/avatar_ts.jpg')

    @patch('users.views.verify_google_id_token')
    def test_google_auth_existing_user_linking(self, mock_verify):
        """Existing student signs in with Google without creating duplicate account or breaking password login."""
        existing_user = User.objects.create_user(
            username='existinglearner',
            email='learner@university.edu',
            password='OriginalPassword123!',
            first_name='Existing',
            last_name='Learner',
        )

        mock_verify.return_value = {
            'email': 'learner@university.edu',
            'sub': 'google-uid-2002',
            'name': 'Existing Learner',
            'given_name': 'Existing',
            'family_name': 'Learner',
            'picture': 'https://lh3.googleusercontent.com/updated_pic.png',
        }

        res = self.client.post(self.google_auth_url, {'id_token': 'valid-google-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res.data)
        self.assertEqual(res.data['user']['id'], existing_user.id)
        self.assertEqual(res.data['user']['email'], 'learner@university.edu')

        # Ensure no duplicate user was created
        self.assertEqual(User.objects.filter(email='learner@university.edu').count(), 1)

        # Ensure original password login still works
        self.assertTrue(existing_user.check_password('OriginalPassword123!'))

    @patch('users.views.verify_google_id_token')
    def test_google_auth_inactive_account_rejected(self, mock_verify):
        """Inactive user account signing in with Google is rejected with 401."""
        inactive_user = User.objects.create_user(
            username='inactivelearner',
            email='inactive@university.edu',
            password='Password123!',
        )
        inactive_user.is_active = False
        inactive_user.save()

        mock_verify.return_value = {
            'email': 'inactive@university.edu',
            'sub': 'google-uid-inactive',
            'name': 'Inactive User',
            'given_name': 'Inactive',
            'family_name': 'User',
            'picture': '',
        }

        res = self.client.post(self.google_auth_url, {'id_token': 'valid-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('inactive', res.data['error'])

    @patch('users.views.verify_google_id_token')
    def test_google_auth_jwt_grants_access_to_protected_api(self, mock_verify):
        """Tokens issued from Google sign-in successfully authorize protected endpoints."""
        mock_verify.return_value = {
            'email': 'protected@university.edu',
            'sub': 'google-uid-protected',
            'name': 'Protected Student',
            'given_name': 'Protected',
            'family_name': 'Student',
            'picture': '',
        }

        res = self.client.post(self.google_auth_url, {'id_token': 'valid-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        access_token = res.data['tokens']['access']

        # Access protected CurrentUserView (/api/auth/me/)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.client.get(self.me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['user']['email'], 'protected@university.edu')

    @patch('urllib.request.urlopen')
    def test_verify_google_id_token_unit_success(self, mock_urlopen):
        """Unit test for verify_google_id_token with simulated Google tokeninfo response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {
            'iss': 'https://accounts.google.com',
            'aud': 'expected-client-id.apps.googleusercontent.com',
            'sub': 'sub-123456',
            'email': 'testuser@gmail.com',
            'email_verified': 'true',
            'name': 'Test User',
            'given_name': 'Test',
            'family_name': 'User',
            'picture': 'https://lh3.googleusercontent.com/pic.jpg',
        }
        mock_response.read.return_value = json.dumps(mock_payload).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        data = verify_google_id_token('simulated-token', expected_client_id='expected-client-id.apps.googleusercontent.com')
        self.assertEqual(data['email'], 'testuser@gmail.com')
        self.assertEqual(data['given_name'], 'Test')
        self.assertEqual(data['family_name'], 'User')
        self.assertEqual(data['picture'], 'https://lh3.googleusercontent.com/pic.jpg')

