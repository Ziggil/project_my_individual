from django.urls import path  
from . import views  




app_name="blog"

urlpatterns = [
    path('blog/', views.blog, name='blog'),
    path('blog_one/', views.blog_one, name='blog_one'),
    path('blog_two/', views.blog_two, name='blog_two'),
    path('blog_three/', views.blog_three, name='blog_three'),
    path('blog_four/', views.blog_four, name='blog_four')
]


