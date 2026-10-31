from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
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
)

urlpatterns = [
    # Authentication & Session Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
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

    # Partners Discovery
    path('partners/', StudyPartnerListView.as_view(), name='partners_list'),
]
