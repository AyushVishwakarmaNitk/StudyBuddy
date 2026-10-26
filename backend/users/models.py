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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


@receiver(post_save, sender=User)
def create_or_update_student_profile(sender, instance, created, **kwargs):
    """Ensure a StudentProfile is automatically created whenever a User is created."""
    if created:
        StudentProfile.objects.get_or_create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
