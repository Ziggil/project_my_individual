
from django.contrib import admin
from django.urls import include, path


from main import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('home/', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('links/', views.links, name='links'),
    path('news/', include('news.urls', namespace="news" )),
    path('users/', include('users.urls', namespace="users" )),
    path('quizes', include('quizes.urls', namespace="quizes" )),
    path('api/user-results/', views.user_results_summary, name='user-results-summary'),


]



























