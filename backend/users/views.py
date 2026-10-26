from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, StudentProfileSerializer
from .models import StudentProfile


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
                },
                status=status.status_code if hasattr(status, 'status_code') else status.HTTP_201_CREATED
            )
        
        # Format validation errors for friendly frontend consumption
        errors = serializer.errors
        error_msg = None
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
            user_data = UserSerializer(user).data
            return Response(
                {
                    'message': 'Signed in successfully.',
                    'user': user_data,
                    'tokens': tokens,
                },
                status=status.HTTP_200_OK
            )

        errors = serializer.errors
        error_msg = None
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
        user_data = UserSerializer(request.user).data
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
