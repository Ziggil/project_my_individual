
from django.contrib import admin
from django.urls import include, path


from main import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('home/', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('blog/', include('blog.urls', namespace="blog" )),
    path('news/', include('news.urls', namespace="news" )),
    path('users/', include('users.urls', namespace="users" )),


]



























