from django.contrib import admin
from .models import Question, Answer


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 1  # сколько пустых форм показывать по умолчанию


class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    # поиск по тексту вопроса и по тексту связанных ответов
    search_fields = ['text', 'answer__text']
    #к какому тесту относится вопрос
    list_display = ['id', 'text', 'quiz', 'created']
    list_filter = ['quiz', 'created']
    ordering = ['id']


class AnswerAdmin(admin.ModelAdmin):
    # поиск по тексту ответа и по тексту вопроса, к которому он относится
    search_fields = ['text', 'question__text']
    list_display = ['id', 'text', 'question', 'correct', 'created']
    list_filter = ['correct', 'created']
    ordering = ['id']


admin.site.register(Question, QuestionAdmin)
admin.site.register(Answer, AnswerAdmin)