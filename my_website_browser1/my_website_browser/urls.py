
from django.contrib import admin
from django.urls import path


from main import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    path('regist/', views.regist, name='regist'),

]
