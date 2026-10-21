from django.contrib import admin
from .models import Question, Answer
from django.http import HttpResponseRedirect
from django.urls import reverse

class AnswerInline(admin.TabularInline):
    model = Answer
    # сколько пустых форм показывать по умолчанию
    extra = 4


class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    # поиск по тексту вопроса и по тексту связанных ответов
    search_fields = ['text', 'answer__text']
    #к какому тесту относится вопрос
    list_display = ['id', 'text', 'quiz', 'created']
    list_filter = ['quiz', 'created']
    ordering = ['id']
    
    #Сохраняет выбранный тест для следующего вопроса при создании по цепочке, через id теста из сохранённого обекта
    def response_add(self, request, obj, post_url_continue=None):
        # Проверяем, была ли нажата кнопка "Сохранить и добавить другой"
        if '_addanother' in request.POST:
            # Формируем URL для добавления нового вопроса
            url = reverse("admin:questions_question_add")

            quiz_id = obj.quiz_id
            
            # Перенаправляем с GET-параметром, который Django Admin подхватит
            return HttpResponseRedirect(f"{url}?quiz={quiz_id}")
        
        # Для всех остальных кнопок ("Сохранить", "Сохранить и продолжить") 
        return super().response_add(request, obj, post_url_continue)


class AnswerAdmin(admin.ModelAdmin):
    # поиск по тексту ответа и по тексту вопроса, к которому он относится
    search_fields = ['text', 'question__text']
    list_display = ['id', 'text', 'question', 'correct', 'created']
    list_filter = ['correct', 'created']
    ordering = ['id']


admin.site.register(Question, QuestionAdmin)
admin.site.register(Answer, AnswerAdmin)