
from django.contrib import admin
from django.urls import include, path


from main import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('home/', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('base/', views.base, name='base'),
    # path('register/', views.register, name='register'),
    path('users/', include('users.urls', namespace="users" )),


]



























