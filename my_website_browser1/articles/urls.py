from django.urls import path
from .import views

#''-чтобы пользователей мог прото перейти на главную страницу news. Т.к path('news',include('news.urls'))  в файле backend_django\urls.py-
#означает что у нас переход будет просиходить по адресу .../news а если мы здесь укажем вместо '' 'news',
#то это будет означать то что переход будет происходить по адресу .../news/news

app_name = 'articles'
urlpatterns=[
    path('',views.articles_home,name='articles_home'),
    path('create',views.create,name="create"),


    #<int:pk>-отслеживаем динамический параметр, никаких пробелов ненужно ставить,а иначе будут ошибки
    path('<int:pk>',views.ArticlesDetailView.as_view(),name='articles-detail'),
    path('<int:pk>/update',views.ArticlesUpdateView.as_view(),name='articles-update'),
    path('<int:pk>/delete',views.ArticlesDeleteView.as_view(),name='articles-delete'),
    
    path('<int:pk>/mark-read', views.mark_article_read, name='mark-read'),
]
