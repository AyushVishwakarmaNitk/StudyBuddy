from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import EducationRecord, StudySpace


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
