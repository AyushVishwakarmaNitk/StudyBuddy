from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    GoogleAuthView,
    CurrentUserView,
    UpdateProfileView,
    CompleteProfileView,
    SessionExtendView,
    LogoutView,
    EducationRecordListCreateView,
    EducationRecordDetailView,
    StudySpaceListCreateView,
    StudySpaceDetailView,
    StudyPartnerListView,
    QuestionnaireSubmitAndMatchView,
    StudySpaceMatchesView,
    PartnerRequestListCreateView,
    PartnerRequestAcceptView,
    PartnerRequestDeclineView,
    PartnerRequestCancelView,
    StudentNotificationListView,
    StudentNotificationReadView,
)
from .workspace_views import (
    StudySpaceWorkspaceView,
    StudyTaskListCreateView,
    StudyTaskCompletionView,
    StudySpaceMessageListCreateView,
    StudyBetListCreateView,
    StudyBetActionView,
    StudyRoomListCreateView,
    StudyRoomSignalListCreateView,
)

urlpatterns = [
    # Authentication & Session Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/profile/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('auth/profile/complete/', CompleteProfileView.as_view(), name='complete_profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/session/extend/', SessionExtendView.as_view(), name='session_extend'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    # Education Records CRUD
    path('education/', EducationRecordListCreateView.as_view(), name='education_list_create'),
    path('education/<int:pk>/', EducationRecordDetailView.as_view(), name='education_detail'),

    # Study Spaces CRUD
    path('study-spaces/', StudySpaceListCreateView.as_view(), name='study_spaces_list_create'),
    path('study-spaces/<int:pk>/', StudySpaceDetailView.as_view(), name='study_space_detail'),
    path('study-spaces/<int:pk>/matches/', StudySpaceMatchesView.as_view(), name='study_space_matches'),
    path('study-spaces/<int:space_id>/workspace/', StudySpaceWorkspaceView.as_view(), name='study_space_workspace'),
    path('study-spaces/<int:space_id>/tasks/', StudyTaskListCreateView.as_view(), name='study_space_tasks'),
    path('study-tasks/<int:task_id>/completion/', StudyTaskCompletionView.as_view(), name='study_task_completion'),
    path('study-spaces/<int:space_id>/messages/', StudySpaceMessageListCreateView.as_view(), name='study_space_messages'),
    path('study-spaces/<int:space_id>/bets/', StudyBetListCreateView.as_view(), name='study_space_bets'),
    path('study-bets/<int:bet_id>/<str:action>/', StudyBetActionView.as_view(), name='study_bet_action'),
    path('study-spaces/<int:space_id>/video-room/', StudyRoomListCreateView.as_view(), name='study_space_video_room'),
    path('video-rooms/<int:room_id>/signals/', StudyRoomSignalListCreateView.as_view(), name='study_room_signals'),

    # Questionnaire & Partner Matching Endpoints
    path('questionnaire/', QuestionnaireSubmitAndMatchView.as_view(), name='questionnaire_submit_and_match'),
    path('partners/', StudyPartnerListView.as_view(), name='partners_list'),

    # Two-Way Partner Request Endpoints
    path('partner-requests/', PartnerRequestListCreateView.as_view(), name='partner_requests_list_create'),
    path('partner-requests/<int:pk>/accept/', PartnerRequestAcceptView.as_view(), name='partner_request_accept'),
    path('partner-requests/<int:pk>/decline/', PartnerRequestDeclineView.as_view(), name='partner_request_decline'),
    path('partner-requests/<int:pk>/cancel/', PartnerRequestCancelView.as_view(), name='partner_request_cancel'),
    path('notifications/', StudentNotificationListView.as_view(), name='notifications'),
    path('notifications/<int:pk>/read/', StudentNotificationReadView.as_view(), name='notification_read'),
]
