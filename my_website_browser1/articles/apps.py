from django.apps import AppConfig

class ArticlesConfig(AppConfig): # Было NewsConfig
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'articles' # Было 'news'