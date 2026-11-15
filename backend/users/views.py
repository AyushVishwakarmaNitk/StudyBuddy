import re
from datetime import timedelta
import logging
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import StudentProfile, EducationRecord, StudySpace, QuestionnaireResponse, PartnerRequest, StudentNotification
from .google_auth import verify_google_id_token
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    StudentProfileSerializer,
    EducationRecordSerializer,
    StudySpaceSerializer,
    StudyPartnerSerializer,
    QuestionnaireResponseSerializer,
    PartnerRequestSerializer,
    StudentNotificationSerializer,
)
from .matching import calculate_partner_matches


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


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None

        # Use the same response for known and unknown addresses to avoid account discovery.
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    'Reset your StudyBuddy password',
                    f"Hi {user.first_name or user.username},\n\nUse this link to choose a new password. It expires after a limited time:\n{reset_url}\n\nIf you did not request this, you can ignore this email.",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                # Keep the public response generic while preserving the delivery error in logs.
                logging.getLogger(__name__).exception('Password reset email could not be sent')

        return Response(
            {'message': 'If an account exists for that email, password reset instructions have been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not isinstance(new_password, str):
            return Response({'error': 'Please provide a valid new password.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if not user or not default_token_generator.check_token(user, token):
            return Response({'error': 'This password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except ValidationError as err:
            return Response({'error': ' '.join(err.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Your password has been reset. You can now sign in.'}, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    """
    Public endpoint for authenticating users via Google OAuth 2.0 ID token.
    Validates Google identity securely on the backend, finds or creates
    the User and StudentProfile, and returns JWT tokens and user data.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get('id_token') or request.data.get('credential')
        if not id_token or not str(id_token).strip():
            return Response(
                {'error': 'Google ID token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_data = verify_google_id_token(str(id_token).strip())
        except ValueError as err:
            return Response(
                {'error': str(err)},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = google_data['email']
        given_name = google_data['given_name']
        family_name = google_data['family_name']
        picture = google_data['picture']

        # 1. Find or create user by verified email
        user = User.objects.filter(email__iexact=email).first()

        if user:
            # Existing user - check if active
            if not user.is_active:
                return Response(
                    {'error': 'This user account is inactive. Please contact support.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Optionally populate missing first/last name
            updated_fields = []
            if not user.first_name and given_name:
                user.first_name = given_name
                updated_fields.append('first_name')
            if not user.last_name and family_name:
                user.last_name = family_name
                updated_fields.append('last_name')
            if updated_fields:
                user.save(update_fields=updated_fields)

            # Ensure profile exists and update picture / last_activity
            profile, _ = StudentProfile.objects.get_or_create(user=user)
            profile_updates = ['last_activity']
            profile.last_activity = timezone.now()
            if not profile.avatar_url and picture:
                profile.avatar_url = picture
                profile_updates.append('avatar_url')
            profile.save(update_fields=profile_updates)

            created = False
        else:
            # 2. New user registration from Google
            # Generate a clean, unique username based on email
            raw_prefix = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0])
            base_username = raw_prefix if len(raw_prefix) >= 3 else f"user_{raw_prefix}"
            username = base_username

            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                suffix = f"_{counter}"
                username = f"{base_username[:140]}{suffix}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=given_name,
                last_name=family_name,
            )
            user.set_unusable_password()
            user.save()

            # Profile is created via post_save signal; attach Google picture if present
            profile, _ = StudentProfile.objects.get_or_create(user=user)
            if picture:
                profile.avatar_url = picture
                profile.save(update_fields=['avatar_url'])

            created = True

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        msg = 'Account created with Google.' if created else 'Signed in with Google successfully.'
        return Response(
            {
                'message': msg,
                'user': user_data,
                'tokens': tokens,
                'requires_profile_completion': not user_data['is_profile_completed'],
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
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
        spaces = StudySpace.objects.filter(Q(owner=request.user) | Q(partner=request.user)).distinct()
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

    def get_object(self, pk, user, include_partner=False):
        try:
            space = StudySpace.objects.get(pk=pk)
            if space.owner_id == user.id or (include_partner and space.partner_id == user.id):
                return space
            return None
        except StudySpace.DoesNotExist:
            return None

    def get(self, request, pk):
        space = self.get_object(pk, request.user, include_partner=True)
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
        # Delete any questionnaire response attached to this space so history resets upon deletion
        QuestionnaireResponse.objects.filter(study_space=space).delete()
        # Cancel any pending partner requests
        PartnerRequest.objects.filter(study_space=space).update(status='cancelled')
        space.delete()
        return Response({'message': 'Study space deleted successfully.'}, status=status.HTTP_200_OK)


class StudyPartnerListView(APIView):
    """
    Endpoint providing discoverable study partners.
    Finds other registered users in the database and computes compatibility.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        candidates = User.objects.exclude(id=request.user.id).select_related('profile')[:20]

        # Check if the user has filled a questionnaire to provide personalized scoring
        user_q = QuestionnaireResponse.objects.filter(user=request.user).order_by('-created_at').first()
        if user_q:
            matches = calculate_partner_matches(user_q, request.user, limit=10)
            return Response({'partners': matches}, status=status.HTTP_200_OK)

        serializer = StudyPartnerSerializer(candidates, many=True)
        return Response({'partners': serializer.data}, status=status.HTTP_200_OK)


class QuestionnaireSubmitAndMatchView(APIView):
    """
    Endpoint to submit the 7-section Study Partner questionnaire,
    save responses to PostgreSQL / SQLite, update the student's study preferences,
    and return the top 5 compatible study partner matches with algorithmic reasoning.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        space_id = data.get('study_space_id')
        study_space = None
        if space_id:
            try:
                study_space = StudySpace.objects.get(id=space_id, owner=request.user)
            except StudySpace.DoesNotExist:
                study_space = None

        # Upsert QuestionnaireResponse (update if retaking for this study space)
        questionnaire = None
        if study_space:
            questionnaire = QuestionnaireResponse.objects.filter(user=request.user, study_space=study_space).first()

        fields_data = {
            # Section 1
            'subjects': data.get('subjects', []),
            'custom_subject': data.get('custom_subject', ''),
            'topics': data.get('topics', []),
            'custom_topics': data.get('custom_topics', ''),
            # Section 2
            'understanding_level': data.get('understanding_level', ''),
            'problem_solving_comfort': data.get('problem_solving_comfort', ''),
            'preferred_partner_level': data.get('preferred_partner_level', ''),
            # Section 3
            'daily_study_hours': data.get('daily_study_hours', ''),
            'preferred_study_time': data.get('preferred_study_time', ''),
            'available_days': data.get('available_days', []),
            'schedule_flexibility': data.get('schedule_flexibility', ''),
            # Section 4
            'session_duration': data.get('session_duration', ''),
            'session_structure': data.get('session_structure', ''),
            # Section 5
            'learning_modes': data.get('learning_modes', []),
            'collaboration_type': data.get('collaboration_type', ''),
            'partner_quality': data.get('partner_quality', ''),
            # Section 6
            'communication_channels': data.get('communication_channels', []),
            'primary_goal': data.get('primary_goal', ''),
            'study_frequency': data.get('study_frequency', ''),
            'expected_duration': data.get('expected_duration', ''),
            # Section 7
            'consistency_rating': data.get('consistency_rating', ''),
            'postpone_frequency': data.get('postpone_frequency', ''),
            'tracking_preference': data.get('tracking_preference', ''),
            'accountability_importance': data.get('accountability_importance', ''),
            # Survey feedback question
            'feedback_question': data.get('feedback_question', ''),
        }

        if questionnaire:
            for k, v in fields_data.items():
                setattr(questionnaire, k, v)
            questionnaire.save()
        else:
            questionnaire = QuestionnaireResponse.objects.create(
                user=request.user,
                study_space=study_space,
                **fields_data
            )

        # Sync profile study preferences from questionnaire
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        if questionnaire.subjects:
            profile.subjects = ", ".join(questionnaire.subjects)
        if questionnaire.preferred_study_time:
            profile.availability = questionnaire.preferred_study_time
        if questionnaire.session_duration:
            profile.session_duration = questionnaire.session_duration
        if questionnaire.session_structure:
            profile.collaboration_style = questionnaire.session_structure
        profile.save()

        # Run multi-dimensional matching algorithm
        top_matches = calculate_partner_matches(questionnaire, request.user, limit=5)

        return Response(
            {
                'message': 'Questionnaire analyzed successfully.',
                'questionnaire_id': questionnaire.id,
                'top_matches': top_matches,
            },
            status=status.HTTP_201_CREATED
        )

    def get(self, request):
        """Retrieve student's latest questionnaire response."""
        space_id = request.query_params.get('space_id')
        query = QuestionnaireResponse.objects.filter(user=request.user)
        if space_id:
            query = query.filter(study_space_id=space_id)

        latest_q = query.order_by('-created_at').first()
        if not latest_q:
            return Response({'questionnaire': None}, status=status.HTTP_200_OK)

        serializer = QuestionnaireResponseSerializer(latest_q)
        return Response({'questionnaire': serializer.data}, status=status.HTTP_200_OK)


class StudySpaceMatchesView(APIView):
    """
    Endpoint to retrieve the top 5 matched partners for a specific Study Space.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            space = StudySpace.objects.get(pk=pk, owner=request.user)
        except StudySpace.DoesNotExist:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Questionnaire history belongs to a single study goal. Never reuse a response
        # from another goal when deciding whether this space has completed onboarding.
        target_q = QuestionnaireResponse.objects.filter(user=request.user, study_space=space).order_by('-created_at').first()

        if not target_q:
            # If no questionnaire exists yet, return empty list with flag indicating questionnaire required
            return Response(
                {
                    'requires_questionnaire': True,
                    'matches': [],
                    'message': 'Please complete the compatibility questionnaire to discover matching study partners.'
                },
                status=status.HTTP_200_OK
            )

        matches = calculate_partner_matches(target_q, request.user, limit=5)
        return Response(
            {
                'requires_questionnaire': False,
                'matches': matches,
                'questionnaire_id': target_q.id
            },
            status=status.HTTP_200_OK
        )


class SessionExtendView(APIView):
    """
    Session Inactivity Extension Endpoint.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile, _ = StudentProfile.objects.get_or_create(user=user)

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
                pass

        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class PartnerRequestListCreateView(APIView):
    """
    List incoming/outgoing partner requests and send a new request.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        incoming = PartnerRequest.objects.filter(
            receiver=user, status='pending'
        ).select_related('sender__profile', 'study_space').order_by('-created_at')

        outgoing = PartnerRequest.objects.filter(
            sender=user, status='pending'
        ).select_related('receiver__profile', 'study_space').order_by('-created_at')

        return Response({
            'incoming': PartnerRequestSerializer(incoming, many=True).data,
            'outgoing': PartnerRequestSerializer(outgoing, many=True).data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        receiver_id = request.data.get('receiver_id')
        space_id = request.data.get('study_space_id')
        compatibility_score = request.data.get('compatibility_score', 0)

        if not receiver_id:
            return Response({'error': 'Please select a study partner to connect with.'}, status=status.HTTP_400_BAD_REQUEST)
        if not space_id:
            return Response({'error': 'Study space is required to send a partner request.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            space = StudySpace.objects.get(id=space_id, owner=user)
        except StudySpace.DoesNotExist:
            return Response({'error': 'Study space not found or you are not authorized.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            receiver = User.objects.get(id=receiver_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Selected student could not be found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)

        if receiver.id == user.id:
            return Response({'error': 'You cannot send a partner request to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if there is already an active pending request to this user for this space
        existing_request = PartnerRequest.objects.filter(
            study_space=space,
            receiver=receiver,
            status='pending'
        ).first()

        if existing_request:
            receiver_name = f"{receiver.first_name} {receiver.last_name}".strip() or receiver.username
            return Response(
                {'error': f'A pending partner request has already been sent to {receiver_name}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cancel any other pending request for this space
        PartnerRequest.objects.filter(study_space=space, status='pending').update(status='cancelled')

        score = 0
        try:
            score = int(compatibility_score)
        except (ValueError, TypeError):
            score = 0

        partner_req = PartnerRequest.objects.create(
            sender=user,
            receiver=receiver,
            study_space=space,
            compatibility_score=score,
            status='pending'
        )

        space.status = 'pending_request'
        space.save(update_fields=['status'])

        target_name = f"{receiver.first_name} {receiver.last_name}".strip() or receiver.username
        return Response(
            {
                'message': f'Study partner request sent to {target_name}! You will be paired as soon as they accept.',
                'request': PartnerRequestSerializer(partner_req).data
            },
            status=status.HTTP_201_CREATED
        )


class StudentNotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = StudentNotification.objects.filter(recipient=request.user, is_read=False)
        return Response({'notifications': StudentNotificationSerializer(notifications, many=True).data})


class StudentNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = StudentNotification.objects.filter(recipient=request.user, pk=pk).first()
        if not notification:
            return Response({'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)


class PartnerRequestAcceptView(APIView):
    """Accept an incoming partner request and activate the study spaces for both users."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            partner_req = PartnerRequest.objects.select_for_update().get(pk=pk, receiver=request.user)
        except PartnerRequest.DoesNotExist:
            return Response({'error': 'Partner request not found or not addressed to you.'}, status=status.HTTP_404_NOT_FOUND)

        if partner_req.status != 'pending':
            return Response({'error': f'This request is already {partner_req.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        partner_req.status = 'accepted'
        partner_req.save(update_fields=['status'])

        # Pair sender's study space
        space = partner_req.study_space
        space.partner = request.user
        space.status = 'active'
        space.upcoming_sessions = max(space.upcoming_sessions, 1)
        space.save()

        # Cancel any remaining pending requests for this space
        PartnerRequest.objects.filter(study_space=space, status='pending').update(status='cancelled')

        # The questionnaire is no longer needed once this goal has a confirmed partner.
        QuestionnaireResponse.objects.filter(user=partner_req.sender, study_space=space).delete()

        sender_name = f"{partner_req.sender.first_name} {partner_req.sender.last_name}".strip() or partner_req.sender.username
        StudentNotification.objects.create(
            recipient=partner_req.sender,
            partner_request=partner_req,
            kind='partner_request_accepted',
            title='Partner request accepted',
            message=f'{sender_name} accepted your request for {space.title}. Your shared study goal is ready.',
        )
        return Response(
            {
                'message': f'You and {sender_name} are now study partners! The study space is active.',
                'request': PartnerRequestSerializer(partner_req).data
            },
            status=status.HTTP_200_OK
        )


class PartnerRequestDeclineView(APIView):
    """Decline an incoming partner request."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            partner_req = PartnerRequest.objects.select_for_update().get(pk=pk, receiver=request.user)
        except PartnerRequest.DoesNotExist:
            return Response({'error': 'Partner request not found or not addressed to you.'}, status=status.HTTP_404_NOT_FOUND)

        if partner_req.status != 'pending':
            return Response({'error': f'This request is already {partner_req.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        partner_req.status = 'declined'
        partner_req.save(update_fields=['status'])

        space = partner_req.study_space
        if not PartnerRequest.objects.filter(study_space=space, status='pending').exists():
            space.status = 'partner_needed'
            space.save(update_fields=['status'])

        receiver_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        StudentNotification.objects.create(
            recipient=partner_req.sender,
            partner_request=partner_req,
            kind='partner_request_declined',
            title='Partner request declined',
            message=f'{receiver_name} declined your request for {space.title}. You can choose another match.',
        )

        return Response(
            {'message': 'Partner request declined.', 'request': PartnerRequestSerializer(partner_req).data},
            status=status.HTTP_200_OK
        )


class PartnerRequestCancelView(APIView):
    """Cancel a sent partner request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            partner_req = PartnerRequest.objects.get(pk=pk, sender=request.user)
        except PartnerRequest.DoesNotExist:
            return Response({'error': 'Partner request not found or you are not the sender.'}, status=status.HTTP_404_NOT_FOUND)

        if partner_req.status != 'pending':
            return Response({'error': f'This request is already {partner_req.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        partner_req.status = 'cancelled'
        partner_req.save(update_fields=['status'])

        space = partner_req.study_space
        space.status = 'partner_needed'
        space.save(update_fields=['status'])

        return Response(
            {'message': 'Partner request cancelled.', 'request': PartnerRequestSerializer(partner_req).data},
            status=status.HTTP_200_OK
        )
