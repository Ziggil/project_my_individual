from django.urls import path  
from . import views  




app_name="blog"

urlpatterns = [
    path('blog/', views.blog, name='blog'),
    path('blog_one/', views.blog_one, name='blog_one')
]


