from django.urls import path
from .import views

#''-чтобы пользователей мог прото перейти на главную страницу news. Т.к path('news',include('news.urls'))  в файле backend_django\urls.py-
#означает что у нас переход будет просиходить по адресу .../news а если мы здесь укажем вместо '' 'news',
#то это будет означать то что переход будет происходить по адресу .../news/news

app_name = 'news'
urlpatterns=[
    path('',views.news_home,name='news_home'),
    path('create',views.create,name="create"),


    #<int:pk>-отслеживаем динамический параметр, никаких пробелов ненужно ставить,а иначе будут ошибки
    path('<int:pk>',views.NewsDetailView.as_view(),name='news-detail'),
    path('<int:pk>/update',views.NewsUpdateView.as_view(),name='news-update'),
    path('<int:pk>/delete',views.NewsDeleteView.as_view(),name='news-delete')
]
