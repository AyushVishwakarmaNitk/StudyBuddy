from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, CurrentUserView, UpdateProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('profile/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

