from django.contrib import admin
from .models import Question, Answer
# Register your models here.

class AnswerIline(admin.TabularInline):
    models=Answer

class QuestionAdmin(admin.ModelAdmin):
    inlines=[AnswerIline]

admin.site.register(Question, QuestionAdmin)
admin.site.register(Answer)

