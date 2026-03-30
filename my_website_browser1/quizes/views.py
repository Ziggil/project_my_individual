import json
from urllib import request
from django.shortcuts import render

import questions


from .models import Quiz
from django.views.generic import ListView
# Create your views here.
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from questions.models import Question


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

def save_quiz_view(request, pk):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        questions=[]
        data = request.POST
        data_ = dict(data.lists())
        print(type(data))
        print(type(data_))
        data_.pop('csrfmiddlewaretoken')

        for k in data_.keys():
            print('key:', k)
            question=Question.objects.get(text=k)
            questions.append(question)
        print(questions)

        return JsonResponse({'text': 'works'})
    else:
        # обычный (не AJAX) запрос
        return JsonResponse({'text': 'not ajax'}, status=400)

