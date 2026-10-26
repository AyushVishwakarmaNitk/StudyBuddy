from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from .models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ['id', 'branch', 'year', 'bio', 'avatar_url', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate_email(self, value):
        normalized = value.strip().lower()
        try:
            validate_email(normalized)
        except Exception:
            raise serializers.ValidationError("Please provide a valid email address.")

        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_username(self, value):
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if User.objects.filter(username__iexact=trimmed).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another.")
        return trimmed

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Check Django password strength rules
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        login_input = attrs.get('username', '').strip()
        password = attrs.get('password', '')

        if not login_input or not password:
            raise serializers.ValidationError("Both username/email and password are required.")

        # If user entered an email address, lookup the username first
        resolved_username = login_input
        if '@' in login_input:
            user_obj = User.objects.filter(email__iexact=login_input).first()
            if user_obj:
                resolved_username = user_obj.username

        user = authenticate(username=resolved_username, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials. Please check your username/email and password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is inactive.")

        attrs['user'] = user
        return attrs

