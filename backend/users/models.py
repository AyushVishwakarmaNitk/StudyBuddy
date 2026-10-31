from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    branch = models.CharField(max_length=150, blank=True, default='')
    year = models.IntegerField(default=1, null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    avatar_url = models.TextField(blank=True, default='')
    is_profile_completed = models.BooleanField(default=False)
    
    # Study Preferences
    subjects = models.TextField(blank=True, default='Python, DBMS, React')
    availability = models.CharField(max_length=255, blank=True, default='Evenings 7:00 PM - 10:00 PM')
    session_duration = models.CharField(max_length=100, blank=True, default='60 mins')
    collaboration_style = models.CharField(max_length=255, blank=True, default='Pomodoro & Silent Accountability')
    
    # Rating metrics
    average_rating = models.FloatField(default=0.0)
    rating_count = models.IntegerField(default=0)
    
    # Session tracking
    last_activity = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    def calculate_completion(self):
        """
        Calculates profile completion percentage and missing required fields.
        Required fields:
        - name (first_name or username)
        - branch
        - year
        - bio (min length 10)
        - at least 1 education record
        """
        has_name = bool(self.user.first_name.strip() or self.user.username.strip())
        has_branch = bool(self.branch and self.branch.strip())
        has_year = bool(self.year and self.year > 0)
        has_bio = bool(self.bio and len(self.bio.strip()) >= 10)
        has_edu = self.education_records.exists()

        checks = {
            'name': has_name,
            'branch': has_branch,
            'year': has_year,
            'bio': has_bio,
            'education': has_edu,
        }

        completed_count = sum(1 for passed in checks.values() if passed)
        total_count = len(checks)
        percentage = int((completed_count / total_count) * 100)
        missing = [field for field, passed in checks.items() if not passed]
        is_complete = completed_count == total_count

        return {
            'is_complete': is_complete,
            'percentage': percentage,
            'missing_fields': missing,
        }


class EducationRecord(models.Model):
    LEVEL_CHOICES = [
        ('class_10', 'Class 10th'),
        ('class_12', 'Class 12th'),
        ('ug', 'Undergraduate (UG)'),
        ('pg', 'Postgraduate (PG)'),
    ]

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='education_records')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    institution_name = models.CharField(max_length=255)
    board = models.CharField(max_length=150, blank=True, default='')
    stream = models.CharField(max_length=150, blank=True, default='')
    degree = models.CharField(max_length=150, blank=True, default='')
    specialization = models.CharField(max_length=150, blank=True, default='')
    passing_year = models.IntegerField(null=True, blank=True)
    start_year = models.IntegerField(null=True, blank=True)
    completion_year = models.IntegerField(null=True, blank=True)
    is_currently_studying = models.BooleanField(default=False)
    grading_type = models.CharField(max_length=20, default='cgpa')
    percentage = models.FloatField(null=True, blank=True)
    cgpa = models.FloatField(null=True, blank=True)
    cgpa_scale = models.FloatField(default=10.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-passing_year', '-completion_year', '-id']

    def __str__(self):
        return f"{self.student.user.username} - {self.get_level_display()} at {self.institution_name}"


class StudySpace(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('partner_needed', 'Partner Needed'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_spaces')
    title = models.CharField(max_length=200)
    subject = models.CharField(max_length=200)
    goal = models.TextField()
    schedule = models.CharField(max_length=200, blank=True, default='Mon, Wed, Fri · 7:00 PM')
    duration = models.CharField(max_length=100, blank=True, default='60 mins')
    learning_style = models.CharField(max_length=200, blank=True, default='Pomodoro Focus')
    partner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='partner_spaces')
    sessions_completed = models.IntegerField(default=0)
    upcoming_sessions = models.IntegerField(default=0)
    progress_percent = models.IntegerField(default=0)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='partner_needed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.owner.username})"


@receiver(post_save, sender=User)
def create_or_update_student_profile(sender, instance, created, **kwargs):
    """Ensure a StudentProfile is automatically created whenever a User is created."""
    if created:
        StudentProfile.objects.get_or_create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
