from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from .models import StudentProfile, EducationRecord, StudySpace


class EducationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationRecord
        fields = [
            'id', 'level', 'institution_name', 'board', 'stream',
            'degree', 'specialization', 'passing_year', 'start_year',
            'completion_year', 'is_currently_studying', 'grading_type',
            'percentage', 'cgpa', 'cgpa_scale', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        level = attrs.get('level') or (self.instance.level if self.instance else None)
        inst_name = attrs.get('institution_name', '').strip()
        if not inst_name and not (self.instance and self.instance.institution_name):
            raise serializers.ValidationError({"institution_name": "Institution name is required."})

        # Percentage validation
        percentage = attrs.get('percentage')
        if percentage is not None and (percentage < 0 or percentage > 100):
            raise serializers.ValidationError({"percentage": "Percentage must be between 0 and 100."})

        # CGPA validation
        cgpa = attrs.get('cgpa')
        cgpa_scale = attrs.get('cgpa_scale', 10.0)
        if cgpa is not None and (cgpa < 0 or cgpa > cgpa_scale):
            raise serializers.ValidationError({"cgpa": f"CGPA must be between 0 and {cgpa_scale}."})

        return attrs


class StudentProfileSerializer(serializers.ModelSerializer):
    education_records = EducationRecordSerializer(many=True, read_only=True)
    completion_status = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    study_preferences = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'branch', 'year', 'bio', 'avatar_url',
            'is_profile_completed', 'subjects', 'availability',
            'session_duration', 'collaboration_style',
            'average_rating', 'rating_count', 'rating',
            'study_preferences', 'education_records',
            'completion_status', 'created_at', 'updated_at'
        ]

    def get_completion_status(self, obj):
        return obj.calculate_completion()

    def get_rating(self, obj):
        if obj.rating_count > 0:
            return {
                'average': obj.average_rating,
                'count': obj.rating_count
            }
        return None

    def get_study_preferences(self, obj):
        subject_list = [s.strip() for s in obj.subjects.split(',') if s.strip()]
        return {
            'subjects': subject_list if subject_list else ['General Studies'],
            'availability': obj.availability or 'Flexible',
            'session_duration': obj.session_duration or '60 mins',
            'collaborationStyle': obj.collaboration_style or 'Pomodoro Focus'
        }


class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)
    is_profile_completed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_profile_completed']

    def get_is_profile_completed(self, obj):
        if hasattr(obj, 'profile'):
            # Profile is complete if explicitly flagged or satisfies required fields
            status = obj.profile.calculate_completion()
            return obj.profile.is_profile_completed or status['is_complete']
        return False


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


class StudyPartnerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    branch = serializers.CharField(source='profile.branch', default='')
    year = serializers.IntegerField(source='profile.year', default=1)
    bio = serializers.CharField(source='profile.bio', default='')
    avatar = serializers.CharField(source='profile.avatar_url', default='')
    compatibility = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'branch', 'year', 'bio', 'avatar', 'compatibility']

    def get_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else obj.username

    def get_compatibility(self, obj):
        # Calculate algorithmic compatibility score based on academic year and branch
        return 92


class StudySpaceSerializer(serializers.ModelSerializer):
    partner = StudyPartnerSerializer(read_only=True)
    partner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='partner',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = StudySpace
        fields = [
            'id', 'title', 'subject', 'goal', 'schedule', 'duration',
            'learning_style', 'partner', 'partner_id', 'sessions_completed',
            'upcoming_sessions', 'progress_percent', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
