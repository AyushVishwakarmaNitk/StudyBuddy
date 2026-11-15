import json
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    StudySpace,
    StudyTask,
    StudyTaskCompletion,
    StudySpaceMessage,
    StudyBet,
    StudyRoom,
    StudyRoomSignal,
    StudentNotification,
)
from .serializers import StudySpaceSerializer, StudyPartnerSerializer, StudentNotificationSerializer
from .workspace_serializers import (
    StudyTaskSerializer,
    StudyTaskCreateSerializer,
    StudySpaceMessageSerializer,
    StudySpaceMessageCreateSerializer,
    StudyBetSerializer,
    StudyBetCreateSerializer,
    StudyRoomSerializer,
)


def get_shared_space(space_id, user):
    return StudySpace.objects.filter(pk=space_id).filter(Q(owner=user) | Q(partner=user)).select_related(
        'owner__profile', 'partner__profile'
    ).first()


def get_other_participant(space, user):
    if space.owner_id == user.id:
        return space.partner
    if space.partner_id == user.id:
        return space.owner
    return None


def display_name(user):
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def notify_participant(recipient, kind, title, message, **related):
    if recipient:
        StudentNotification.objects.create(
            recipient=recipient,
            kind=kind,
            title=title,
            message=message,
            **related,
        )


def task_progress(space, user):
    tasks = StudyTask.objects.filter(space=space).filter(Q(assignee=user) | Q(assignee__isnull=True))
    total = tasks.count()
    completed = StudyTaskCompletion.objects.filter(task__in=tasks, user=user).count()
    return {
        'completed': completed,
        'total': total,
        'percent': round((completed / total) * 100) if total else 0,
    }


def streak_summary(space, user):
    completion_times = StudyTaskCompletion.objects.filter(
        user=user,
        task__space=space,
        task__is_daily=True,
    ).filter(Q(task__assignee=user) | Q(task__assignee__isnull=True)).values_list('completed_at', flat=True)
    dates = {timezone.localtime(completed_at).date() for completed_at in completion_times}
    ordered = sorted(dates)

    longest = 0
    run = 0
    previous = None
    for completed_date in ordered:
        run = run + 1 if previous and completed_date == previous + timedelta(days=1) else 1
        longest = max(longest, run)
        previous = completed_date

    today = timezone.localdate()
    end_date = today if today in dates else today - timedelta(days=1) if today - timedelta(days=1) in dates else None
    current = 0
    while end_date and end_date in dates:
        current += 1
        end_date -= timedelta(days=1)

    return {
        'current': current,
        'longest': longest,
        'last_completed_date': max(dates).isoformat() if dates else None,
        'badges': [
            {'id': 'weekly_champion', 'name': 'Weekly Consistency Champion', 'days_required': 7, 'unlocked': longest >= 7},
            {'id': 'monthly_master', 'name': 'Monthly Dedication Master', 'days_required': 30, 'unlocked': longest >= 30},
        ],
    }


class StudySpaceWorkspaceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)

        other = get_other_participant(space, request.user)
        tasks = StudyTask.objects.filter(space=space).select_related('creator', 'assignee').prefetch_related('completions__user')
        messages = StudySpaceMessage.objects.filter(space=space).select_related('sender').order_by('-id')[:100]
        room = StudyRoom.objects.filter(space=space, status='active').first()
        if room and room.created_at < timezone.now() - timedelta(hours=3):
            room.status = 'ended'
            room.ended_at = timezone.now()
            room.save(update_fields=['status', 'ended_at'])
            room = None

        return Response({
            'space': StudySpaceSerializer(space).data,
            'participants': {
                'self': StudyPartnerSerializer(request.user).data,
                'partner': StudyPartnerSerializer(other).data if other else None,
            },
            'tasks': StudyTaskSerializer(tasks, many=True, context={'request': request}).data,
            'progress': {
                'self': task_progress(space, request.user),
                'partner': task_progress(space, other) if other else {'completed': 0, 'total': 0, 'percent': 0},
            },
            'streaks': {
                'self': streak_summary(space, request.user),
                'partner': streak_summary(space, other) if other else {'current': 0, 'longest': 0, 'last_completed_date': None, 'badges': []},
            },
            'messages': StudySpaceMessageSerializer(list(reversed(messages)), many=True).data,
            'bets': StudyBetSerializer(StudyBet.objects.filter(space=space).select_related('creator', 'accepted_by', 'winner', 'task'), many=True).data,
            'active_room': StudyRoomSerializer(room).data if room else None,
        })


class StudyTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        tasks = StudyTask.objects.filter(space=space).select_related('creator', 'assignee').prefetch_related('completions__user')
        return Response({'tasks': StudyTaskSerializer(tasks, many=True, context={'request': request}).data})

    def post(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space or not space.partner_id or space.status != 'active':
            return Response({'error': 'An active partner is required to add a shared study task.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StudyTaskCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        values = serializer.validated_data
        other = get_other_participant(space, request.user)
        scope = values['assignment_scope']
        assignee = request.user if scope == 'self' else other if scope == 'partner' else None
        task = StudyTask.objects.create(
            space=space,
            creator=request.user,
            assignee=assignee,
            title=values['title'],
            description=values.get('description', ''),
            deadline=values['deadline'],
            is_daily=values.get('is_daily', False),
        )
        assignment_label = 'both partners' if scope == 'both' else display_name(assignee)
        notify_participant(
            other,
            'study_task_created',
            'New study task',
            f'{display_name(request.user)} added “{task.title}” for {assignment_label}.',
            study_space=space,
            study_task=task,
        )
        task = StudyTask.objects.select_related('creator', 'assignee').prefetch_related('completions__user').get(pk=task.pk)
        return Response({'task': StudyTaskSerializer(task, context={'request': request}).data}, status=status.HTTP_201_CREATED)


class StudyTaskCompletionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        task = StudyTask.objects.select_related('space', 'space__owner', 'space__partner', 'assignee').filter(pk=task_id).first()
        if not task or request.user.id not in (task.space.owner_id, task.space.partner_id):
            return Response({'error': 'Study task not found.'}, status=status.HTTP_404_NOT_FOUND)
        if task.assignee_id and task.assignee_id != request.user.id:
            return Response({'error': 'This personal task is assigned to your partner.'}, status=status.HTTP_403_FORBIDDEN)

        note = str(request.data.get('completion_note', '')).strip()
        completion, created = StudyTaskCompletion.objects.get_or_create(task=task, user=request.user)
        if not created and note != completion.completion_note:
            completion.completion_note = note
            completion.completed_at = timezone.now()
            completion.save(update_fields=['completion_note', 'completed_at'])
        elif created:
            completion.completion_note = note
            completion.save(update_fields=['completion_note'])

        other = get_other_participant(task.space, request.user)
        if created:
            notify_participant(
                other,
                'study_task_completed',
                'Study task completed',
                f'{display_name(request.user)} completed “{task.title}”.' + (f' Note: {note}' if note else ''),
                study_space=task.space,
                study_task=task,
            )
        task = StudyTask.objects.select_related('creator', 'assignee').prefetch_related('completions__user').get(pk=task.pk)
        return Response({'task': StudyTaskSerializer(task, context={'request': request}).data})

    def delete(self, request, task_id):
        task = StudyTask.objects.select_related('space', 'assignee').filter(pk=task_id).first()
        if not task or request.user.id not in (task.space.owner_id, task.space.partner_id):
            return Response({'error': 'Study task not found.'}, status=status.HTTP_404_NOT_FOUND)
        if task.assignee_id and task.assignee_id != request.user.id:
            return Response({'error': 'This personal task is assigned to your partner.'}, status=status.HTTP_403_FORBIDDEN)
        deleted, _ = StudyTaskCompletion.objects.filter(task=task, user=request.user).delete()
        if not deleted:
            return Response({'error': 'This task was not marked complete by you.'}, status=status.HTTP_400_BAD_REQUEST)
        other = get_other_participant(task.space, request.user)
        notify_participant(
            other,
            'study_task_reopened',
            'Study task reopened',
            f'{display_name(request.user)} marked “{task.title}” as not done.',
            study_space=task.space,
            study_task=task,
        )
        return Response({'message': 'Task completion removed.'})


class StudySpaceMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            after_id = max(0, int(request.query_params.get('after_id', '0')))
        except ValueError:
            return Response({'error': 'after_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
        messages = StudySpaceMessage.objects.filter(space=space, id__gt=after_id).select_related('sender')[:200]
        return Response({'messages': StudySpaceMessageSerializer(messages, many=True).data})

    def post(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space or not space.partner_id or space.status != 'active':
            return Response({'error': 'An active partner is required to chat in this space.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = StudySpaceMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        message = StudySpaceMessage.objects.create(space=space, sender=request.user, **serializer.validated_data)
        return Response({'message': StudySpaceMessageSerializer(message).data}, status=status.HTTP_201_CREATED)


class StudyBetListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        bets = StudyBet.objects.filter(space=space).select_related('creator', 'accepted_by', 'winner', 'task')
        return Response({'bets': StudyBetSerializer(bets, many=True).data})

    def post(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space or not space.partner_id or space.status != 'active':
            return Response({'error': 'An active partner is required to make a study bet.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = StudyBetCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        values = serializer.validated_data
        task = None
        if values.get('task_id'):
            task = StudyTask.objects.filter(pk=values['task_id'], space=space).first()
            if not task:
                return Response({'error': 'The selected task does not belong to this study space.'}, status=status.HTTP_400_BAD_REQUEST)
        bet = StudyBet.objects.create(
            space=space,
            creator=request.user,
            task=task,
            description=values['description'],
            reward=values['reward'],
            deadline=values.get('deadline'),
        )
        other = get_other_participant(space, request.user)
        notify_participant(other, 'study_bet_created', 'New friendly bet', f'{display_name(request.user)} proposed: “{bet.description}” — {bet.reward}.', study_space=space, study_bet=bet)
        bet = StudyBet.objects.select_related('creator', 'accepted_by', 'winner', 'task').get(pk=bet.pk)
        return Response({'bet': StudyBetSerializer(bet).data}, status=status.HTTP_201_CREATED)


class StudyBetActionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, bet_id, action):
        bet = StudyBet.objects.select_for_update().select_related('space', 'space__owner', 'space__partner', 'creator').filter(pk=bet_id).first()
        if not bet or request.user.id not in (bet.space.owner_id, bet.space.partner_id):
            return Response({'error': 'Study bet not found.'}, status=status.HTTP_404_NOT_FOUND)
        other = get_other_participant(bet.space, request.user)

        if action == 'accept':
            if bet.status != 'open' or bet.creator_id == request.user.id:
                return Response({'error': 'This bet is not waiting for your response.'}, status=status.HTTP_400_BAD_REQUEST)
            bet.status = 'accepted'
            bet.accepted_by = request.user
            message = f'{display_name(request.user)} accepted the bet: “{bet.description}”.'
            notify_participant(bet.creator, 'study_bet_accepted', 'Bet accepted', message, study_space=bet.space, study_bet=bet)
        elif action == 'resolve':
            if bet.status != 'accepted':
                return Response({'error': 'Only an accepted bet can be resolved.'}, status=status.HTTP_400_BAD_REQUEST)
            winner_id = request.data.get('winner_id')
            if str(winner_id) not in {str(bet.space.owner_id), str(bet.space.partner_id)}:
                return Response({'error': 'Winner must be one of the study-space partners.'}, status=status.HTTP_400_BAD_REQUEST)
            from django.contrib.auth import get_user_model
            bet.winner = get_user_model().objects.get(pk=winner_id)
            bet.status = 'resolved'
            message = f'{display_name(bet.winner)} won the friendly bet “{bet.description}” — {bet.reward}.'
            notify_participant(other, 'study_bet_resolved', 'Friendly bet settled', message, study_space=bet.space, study_bet=bet)
        elif action == 'cancel':
            if bet.status != 'open' or bet.creator_id != request.user.id:
                return Response({'error': 'Only the creator can cancel a bet that is still open.'}, status=status.HTTP_400_BAD_REQUEST)
            bet.status = 'cancelled'
            message = 'Bet cancelled.'
        else:
            return Response({'error': 'Unknown bet action.'}, status=status.HTTP_400_BAD_REQUEST)

        bet.save()
        bet = StudyBet.objects.select_related('creator', 'accepted_by', 'winner', 'task').get(pk=bet.pk)
        return Response({'bet': StudyBetSerializer(bet).data, 'message': message})


class StudyRoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space:
            return Response({'error': 'Study space not found.'}, status=status.HTTP_404_NOT_FOUND)
        room = StudyRoom.objects.filter(space=space, status='active').first()
        if room and room.created_at < timezone.now() - timedelta(hours=3):
            room.status = 'ended'
            room.ended_at = timezone.now()
            room.save(update_fields=['status', 'ended_at'])
            room = None
        return Response({'room': StudyRoomSerializer(room).data if room else None})

    @transaction.atomic
    def post(self, request, space_id):
        space = get_shared_space(space_id, request.user)
        if not space or not space.partner_id or space.status != 'active':
            return Response({'error': 'An active partner is required to start a video room.'}, status=status.HTTP_403_FORBIDDEN)
        room = StudyRoom.objects.filter(space=space, status='active').first()
        created = False
        if not room:
            room = StudyRoom.objects.create(space=space, initiator=request.user)
            created = True
        return Response({'room': StudyRoomSerializer(room).data, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class StudyRoomSignalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_room(self, request, room_id):
        return StudyRoom.objects.filter(pk=room_id).filter(Q(space__owner=request.user) | Q(space__partner=request.user)).select_related('space').first()

    def get(self, request, room_id):
        room = self.get_room(request, room_id)
        if not room:
            return Response({'error': 'Video room not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            after_id = max(0, int(request.query_params.get('after_id', '0')))
        except ValueError:
            return Response({'error': 'after_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
        signals = room.signals.filter(id__gt=after_id).exclude(sender=request.user).select_related('sender')[:100]
        return Response({'signals': [
            {'id': item.id, 'kind': item.kind, 'payload': item.payload, 'sender_id': item.sender_id}
            for item in signals
        ], 'room_status': room.status})

    @transaction.atomic
    def post(self, request, room_id):
        room = self.get_room(request, room_id)
        if not room or room.status != 'active':
            return Response({'error': 'Active video room not found.'}, status=status.HTTP_404_NOT_FOUND)
        kind = request.data.get('kind')
        if kind not in {'offer', 'answer', 'ice_candidate', 'end'}:
            return Response({'error': 'Unsupported video signaling event.'}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data.get('payload') or {}
        if not isinstance(payload, dict) or len(json.dumps(payload)) > 64_000:
            return Response({'error': 'Invalid video signaling payload.'}, status=status.HTTP_400_BAD_REQUEST)
        signal = StudyRoomSignal.objects.create(room=room, sender=request.user, kind=kind, payload=payload)
        if kind == 'end':
            room.status = 'ended'
            room.ended_at = timezone.now()
            room.save(update_fields=['status', 'ended_at'])
        return Response({'id': signal.id, 'kind': signal.kind}, status=status.HTTP_201_CREATED)
