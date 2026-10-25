from django.contrib import admin
from .models import Articles
from django.contrib import admin
from .models import Articles, ArticleReadProgress

admin.site.register(Articles)
# Register your models here.


@admin.register(ArticleReadProgress)
class ArticleReadProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'article', 'read_at')
    list_filter = ('read_at', 'article')
    search_fields = ('user__username', 'article__title')
    ordering = ('-read_at',)