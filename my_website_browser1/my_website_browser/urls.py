from django.contrib import admin
from django.urls import include, path
from main import views

# Импортируем готовые вьюхи для JWT токенов
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.views import get_jwt_from_session

from rest_framework.routers import DefaultRouter
from quizes.views import QuizViewSet

# Роутер для DRF
router = DefaultRouter()
router.register(r'api/quizes', QuizViewSet, basename='quiz-api')

urlpatterns = [
    # Стандартная админка (она подхватит наш index.html с таблицей)
    path('admin/', admin.site.urls),
    
    path('', views.index, name='index'),
    path('home/', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('links/', views.links, name='links'),
    path('articles/', include('articles.urls')),
    path('users/', include('users.urls', namespace="users")),
    path('quizes/', include('quizes.urls', namespace="quizes")),
    
    path('api/user-results/', views.user_results_summary, name='user-results-summary'),

    # Эндпоинты для JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/from-session/', get_jwt_from_session, name='token_from_session'),

    # Подключаем роутер DRF
    path('', include(router.urls)),
]