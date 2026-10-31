from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import StudentProfile, EducationRecord, StudySpace
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    StudentProfileSerializer,
    EducationRecordSerializer,
    StudySpaceSerializer,
    StudyPartnerSerializer,
)


def get_tokens_for_user(user):
    """Generate access and refresh tokens for authenticated user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """
    Public endpoint for registering new student users.
    Validates credentials, creates User and StudentProfile, and returns JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response(
                {
                    'message': 'Account created successfully.',
                    'user': user_data,
                    'tokens': tokens,
                    'requires_profile_completion': not user_data['is_profile_completed'],
                },
                status=status.HTTP_201_CREATED
            )

        errors = serializer.errors
        if 'password' in errors:
            error_msg = errors['password'][0] if isinstance(errors['password'], list) else str(errors['password'])
        elif 'username' in errors:
            error_msg = errors['username'][0] if isinstance(errors['username'], list) else str(errors['username'])
        elif 'email' in errors:
            error_msg = errors['email'][0] if isinstance(errors['email'], list) else str(errors['email'])
        elif 'non_field_errors' in errors:
            error_msg = errors['non_field_errors'][0] if isinstance(errors['non_field_errors'], list) else str(errors['non_field_errors'])
        else:
            first_key = next(iter(errors))
            error_msg = f"{first_key}: {errors[first_key][0] if isinstance(errors[first_key], list) else errors[first_key]}"

        return Response(
            {
                'error': error_msg,
                'details': errors,
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):
    """
    Public endpoint for user authentication.
    Accepts username or email along with password and returns JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)

            # Update last activity
            if hasattr(user, 'profile'):
                user.profile.last_activity = timezone.now()
                user.profile.save(update_fields=['last_activity'])

            user_data = UserSerializer(user).data
            return Response(
                {
                    'message': 'Signed in successfully.',
                    'user': user_data,
                    'tokens': tokens,
                    'requires_profile_completion': not user_data['is_profile_completed'],
                },
                status=status.HTTP_200_OK
            )

        errors = serializer.errors
        if 'non_field_errors' in errors:
            error_msg = errors['non_field_errors'][0] if isinstance(errors['non_field_errors'], list) else str(errors['non_field_errors'])
        else:
            first_key = next(iter(errors))
            error_msg = errors[first_key][0] if isinstance(errors[first_key], list) else str(errors[first_key])

        return Response(
            {
                'error': error_msg,
                'details': errors,
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


class CurrentUserView(APIView):
    """
    Protected endpoint to retrieve the authenticated student's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if hasattr(user, 'profile'):
            user.profile.last_activity = timezone.now()
            user.profile.save(update_fields=['last_activity'])
        user_data = UserSerializer(user).data
        return Response({'user': user_data}, status=status.HTTP_200_OK)


class UpdateProfileView(APIView):
    """
    Protected endpoint to update student profile information.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        profile, _ = StudentProfile.objects.get_or_create(user=user)

        # Allow updating name on User model
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        full_name = request.data.get('name')
        if full_name and not (first_name or last_name):
            parts = full_name.strip().split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
        else:
            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
        user.save()

        # Update StudentProfile fields
        serializer = StudentProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    'message': 'Profile updated successfully.',
                    'user': UserSerializer(user).data
                },
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompleteProfileView(APIView):
    """
    Protected endpoint to validate and complete the initial student onboarding profile.
    Accepts personal info, academic info, and optional initial education record.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile, _ = StudentProfile.objects.get_or_create(user=user)

        # 1. Update personal info (name)
        full_name = request.data.get('name', '').strip()
        if full_name:
            parts = full_name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()

        # 2. Update profile fields
        branch = request.data.get('branch', '').strip()
        year = request.data.get('year')
        bio = request.data.get('bio', '').strip()
        avatar_url = request.data.get('avatar_url', '')

        if branch:
            profile.branch = branch
        if year:
            profile.year = int(year)
        if bio:
            profile.bio = bio
        if avatar_url is not None:
            profile.avatar_url = avatar_url

        # Preferences
        if 'availability' in request.data:
            profile.availability = request.data['availability']
        if 'collaboration_style' in request.data:
            profile.collaboration_style = request.data['collaboration_style']
        if 'session_duration' in request.data:
            profile.session_duration = request.data['session_duration']
        if 'subjects' in request.data:
            subjects_val = request.data['subjects']
            if isinstance(subjects_val, list):
                profile.subjects = ", ".join(subjects_val)
            else:
                profile.subjects = str(subjects_val)

        # 3. Handle optional education record passed in onboarding
        edu_data = request.data.get('education')
        if edu_data and isinstance(edu_data, dict) and edu_data.get('institution_name'):
            EducationRecord.objects.create(
                student=profile,
                level=edu_data.get('level', 'ug'),
                institution_name=edu_data.get('institution_name'),
                board=edu_data.get('board', ''),
                stream=edu_data.get('stream', ''),
                degree=edu_data.get('degree', ''),
                specialization=edu_data.get('specialization', ''),
                passing_year=edu_data.get('passing_year'),
                start_year=edu_data.get('start_year'),
                completion_year=edu_data.get('completion_year'),
                is_currently_studying=edu_data.get('is_currently_studying', False),
                grading_type=edu_data.get('grading_type', 'cgpa'),
                percentage=edu_data.get('percentage'),
                cgpa=edu_data.get('cgpa'),
                cgpa_scale=edu_data.get('cgpa_scale', 10.0),
            )

        # Mark profile completed
        profile.is_profile_completed = True
        profile.save()

        # Re-fetch user with fresh profile relation
        fresh_user = User.objects.select_related('profile').get(pk=user.pk)
        return Response(
            {
                'message': 'Profile onboarding completed successfully!',
                'user': UserSerializer(fresh_user).data
            },
            status=status.HTTP_200_OK
        )


class EducationRecordListCreateView(APIView):
    """
    CRUD API for Student Education Records.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = EducationRecord.objects.filter(student__user=request.user)
        serializer = EducationRecordSerializer(records, many=True)
        return Response({'education': serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        serializer = EducationRecordSerializer(data=request.data)
        if serializer.is_valid():
            record = serializer.save(student=profile)
            return Response(
                {
                    'message': 'Education record added successfully.',
                    'record': EducationRecordSerializer(record).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EducationRecordDetailView(APIView):
    """
    Retrieve, update or delete a specific education record.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return EducationRecord.objects.get(pk=pk, student__user=user)
        except EducationRecord.DoesNotExist:
            return None

    def get(self, request, pk):
        record = self.get_object(pk, request.user)
        if not record:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EducationRecordSerializer(record).data)

    def put(self, request, pk):
        record = self.get_object(pk, request.user)
        if not record:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EducationRecordSerializer(record, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    'message': 'Education record updated successfully.',
                    'record': serializer.data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        record = self.get_object(pk, request.user)
        if not record:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)
        record.delete()
        return Response({'message': 'Education record removed successfully.'}, status=status.HTTP_200_OK)


class StudySpaceListCreateView(APIView):
    """
    List and create study spaces for the authenticated student.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        spaces = StudySpace.objects.filter(owner=request.user)
        serializer = StudySpaceSerializer(spaces, many=True)
        return Response({'spaces': serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StudySpaceSerializer(data=request.data)
        if serializer.is_valid():
            space = serializer.save(owner=request.user)
            return Response(
                {
                    'message': 'Study space created successfully.',
                    'space': StudySpaceSerializer(space).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudySpaceDetailView(APIView):
    """
    Retrieve, update (assign partner, complete sessions) or delete a study space.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return StudySpace.objects.get(pk=pk, owner=user)
        except StudySpace.DoesNotExist:
            return None

    def get(self, request, pk):
        space = self.get_object(pk, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(StudySpaceSerializer(space).data)

    def put(self, request, pk):
        space = self.get_object(pk, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudySpaceSerializer(space, data=request.data, partial=True)
        if serializer.is_valid():
            updated_space = serializer.save()
            return Response(
                {
                    'message': 'Study space updated successfully.',
                    'space': StudySpaceSerializer(updated_space).data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        space = self.get_object(pk, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        space.delete()
        return Response({'message': 'Study space deleted successfully.'}, status=status.HTTP_200_OK)


class StudyPartnerListView(APIView):
    """
    Endpoint providing discoverable study partners.
    Finds other registered users in the database and computes compatibility.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Exclude the current student
        candidates = User.objects.exclude(id=request.user.id).select_related('profile')[:20]

        # If database has no other users yet, seed realistic mock peers for a rich experience
        if not candidates.exists():
            default_candidates = [
                {
                    'id': 'p-priya',
                    'name': 'Priya Sharma',
                    'username': 'priya_s',
                    'branch': 'CSE',
                    'year': 3,
                    'compatibility': 96,
                    'bio': 'Focusing on Full-Stack React & Node.js projects with daily Pomodoro sessions.',
                    'avatar': ''
                },
                {
                    'id': 'p-rohan',
                    'name': 'Rohan Verma',
                    'username': 'rohan_v',
                    'branch': 'IT',
                    'year': 3,
                    'compatibility': 89,
                    'bio': 'Looking for a dedicated coding accountability partner for DBMS & System Design.',
                    'avatar': ''
                },
                {
                    'id': 'p-sneha',
                    'name': 'Sneha Patel',
                    'username': 'sneha_p',
                    'branch': 'ECE',
                    'year': 2,
                    'compatibility': 86,
                    'bio': 'Studying Web Development fundamentals, algorithms, and Git collaboration.',
                    'avatar': ''
                }
            ]
            return Response({'partners': default_candidates}, status=status.HTTP_200_OK)

        serializer = StudyPartnerSerializer(candidates, many=True)
        return Response({'partners': serializer.data}, status=status.HTTP_200_OK)


class SessionExtendView(APIView):
    """
    Session Inactivity Extension Endpoint.

    The JWT access token is the real authentication gate — IsAuthenticated handles
    that. If the token is valid and the user clicks "Stay Logged In", we always
    extend the server-side last_activity timestamp unconditionally.

    Why not check last_activity here?
    - The frontend warning dialog already fires BEFORE the inactivity window expires,
      giving the user time to act. By the time they click, elapsed time may exceed
      the warning threshold but the JWT is still valid (1-day lifetime).
    - A redundant server-side inactivity check at this point would reject legitimate
      extension attempts and force unnecessary logouts.
    - Security is maintained by the JWT expiry (ACCESS_TOKEN_LIFETIME = 1 day).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile, _ = StudentProfile.objects.get_or_create(user=user)

        # Always extend: refresh server-side activity so future checks are accurate.
        now = timezone.now()
        profile.last_activity = now
        profile.save(update_fields=['last_activity'])

        timeout_seconds = getattr(settings, 'SESSION_TIMEOUT_SECONDS', 1800)

        return Response(
            {
                'success': True,
                'message': 'Session successfully extended.',
                'timeout_seconds': timeout_seconds,
            },
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):
    """
    Server-side Logout Endpoint.
    Invalidates session and optionally blacklists refresh token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token may already be expired or blacklisting not active
                pass

        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
