import json
from urllib import request
from django.shortcuts import render

from my_website_browser1 import questions


from .models import Quiz
from django.views.generic import ListView
# Create your views here.
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
 


# @login_required
class QuizListView(ListView):
    model=Quiz
    template_name='quizes/main_quiz.html'



@login_required
def quiz_view(request, pk):
    quiz=Quiz.objects.get(pk=pk)
    return render(request, 'quizes/quiz.html', {'obj':quiz})

def quiz_data_view(request, pk):
    quiz=Quiz.objects.get(pk=pk)
    questions=[]
    for q in quiz.get_questions():
        answers=[]
        for a in q.get_answers():
            answers.append(a.text)
        questions.append({str(q): answers})
    return JsonResponse({
        'data':questions,
        'time': quiz.time,
    })
