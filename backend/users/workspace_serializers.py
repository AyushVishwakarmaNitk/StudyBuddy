from rest_framework import serializers
from .models import StudyTask, StudyTaskCompletion, StudySpaceMessage, StudyBet, StudyRoom


class StudyTaskCompletionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyTaskCompletion
        fields = ['user_id', 'user_name', 'completion_note', 'completed_at']

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username


class StudyTaskSerializer(serializers.ModelSerializer):
    assignment_scope = serializers.SerializerMethodField()
    completed_by = StudyTaskCompletionSerializer(source='completions', many=True, read_only=True)
    is_completed_by_me = serializers.SerializerMethodField()
    my_completion_note = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyTask
        fields = [
            'id', 'title', 'description', 'deadline', 'is_daily', 'assignment_scope',
            'creator_name', 'created_at', 'updated_at', 'completed_by',
            'is_completed_by_me', 'my_completion_note',
        ]

    def get_assignment_scope(self, obj):
        if obj.assignee_id is None:
            return 'both'
        return 'self' if obj.assignee_id == self.context['request'].user.id else 'partner'

    def get_is_completed_by_me(self, obj):
        return obj.completions.filter(user=self.context['request'].user).exists()

    def get_my_completion_note(self, obj):
        completion = obj.completions.filter(user=self.context['request'].user).first()
        return completion.completion_note if completion else ''

    def get_creator_name(self, obj):
        full_name = f"{obj.creator.first_name} {obj.creator.last_name}".strip()
        return full_name or obj.creator.username


class StudyTaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    deadline = serializers.DateField()
    is_daily = serializers.BooleanField(required=False, default=False)
    assignment_scope = serializers.ChoiceField(choices=['self', 'partner', 'both'])


class StudySpaceMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = StudySpaceMessage
        fields = ['id', 'sender_id', 'sender_name', 'message', 'created_at']

    def get_sender_name(self, obj):
        full_name = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return full_name or obj.sender.username


class StudySpaceMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, trim_whitespace=True)


class StudyBetSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()
    accepted_by_name = serializers.SerializerMethodField()
    winner_name = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()

    class Meta:
        model = StudyBet
        fields = [
            'id', 'description', 'reward', 'deadline', 'status', 'task', 'task_title',
            'creator_id', 'creator_name', 'accepted_by_id', 'accepted_by_name',
            'winner_id', 'winner_name', 'created_at', 'updated_at',
        ]

    @staticmethod
    def _name(user):
        if not user:
            return None
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username

    def get_creator_name(self, obj):
        return self._name(obj.creator)

    def get_task_title(self, obj):
        return obj.task.title if obj.task_id else ''

    def get_accepted_by_name(self, obj):
        return self._name(obj.accepted_by)

    def get_winner_name(self, obj):
        return self._name(obj.winner)


class StudyBetCreateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=240, trim_whitespace=True)
    reward = serializers.CharField(max_length=120, trim_whitespace=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    task_id = serializers.IntegerField(required=False, allow_null=True)


class StudyRoomSerializer(serializers.ModelSerializer):
    initiator_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyRoom
        fields = ['id', 'status', 'initiator_id', 'initiator_name', 'created_at', 'ended_at']

    def get_initiator_name(self, obj):
        full_name = f"{obj.initiator.first_name} {obj.initiator.last_name}".strip()
        return full_name or obj.initiator.username
