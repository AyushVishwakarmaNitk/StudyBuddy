# Generated manually for StudyBuddy AI QuestionnaireResponse

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_studentprofile_availability_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='QuestionnaireResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subjects', models.JSONField(blank=True, default=list)),
                ('custom_subject', models.CharField(blank=True, default='', max_length=255)),
                ('topics', models.JSONField(blank=True, default=list)),
                ('custom_topics', models.TextField(blank=True, default='')),
                ('understanding_level', models.CharField(blank=True, default='', max_length=100)),
                ('problem_solving_comfort', models.CharField(blank=True, default='', max_length=150)),
                ('preferred_partner_level', models.CharField(blank=True, default='', max_length=150)),
                ('daily_study_hours', models.CharField(blank=True, default='', max_length=100)),
                ('preferred_study_time', models.CharField(blank=True, default='', max_length=100)),
                ('available_days', models.JSONField(blank=True, default=list)),
                ('schedule_flexibility', models.CharField(blank=True, default='', max_length=100)),
                ('session_duration', models.CharField(blank=True, default='', max_length=100)),
                ('session_structure', models.CharField(blank=True, default='', max_length=150)),
                ('learning_modes', models.JSONField(blank=True, default=list)),
                ('collaboration_type', models.CharField(blank=True, default='', max_length=150)),
                ('partner_quality', models.CharField(blank=True, default='', max_length=150)),
                ('communication_channels', models.JSONField(blank=True, default=list)),
                ('primary_goal', models.CharField(blank=True, default='', max_length=150)),
                ('study_frequency', models.CharField(blank=True, default='', max_length=100)),
                ('expected_duration', models.CharField(blank=True, default='', max_length=100)),
                ('consistency_rating', models.CharField(blank=True, default='', max_length=100)),
                ('postpone_frequency', models.CharField(blank=True, default='', max_length=100)),
                ('tracking_preference', models.CharField(blank=True, default='', max_length=100)),
                ('accountability_importance', models.CharField(blank=True, default='', max_length=100)),
                ('feedback_question', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('study_space', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='questionnaire_responses', to='users.studyspace')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questionnaire_responses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
