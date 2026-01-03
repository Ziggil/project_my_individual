
from django.contrib import admin
from django.urls import include, path


from main import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    # path('register/', views.register, name='register'),
    path('users/', include('users.urls', namespace="users" )),


]



























