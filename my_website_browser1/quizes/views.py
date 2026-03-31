import json
from unittest import result
from urllib import request
from django.shortcuts import render

import results
import questions


from .models import Quiz
from django.views.generic import ListView
# Create your views here.
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from questions.models import Answer, Question
from results.models import Result


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

        user=request.user
        quiz=Quiz.objects.get(pk=pk)

        # представляем результат прохождения 

        score=0
        multiplier=100 / quiz.number_of_questions
        results=[]
        correct_answer=None

        for q in questions:
            a_selected=request.POST.get(str(q))
            print('selected', a_selected)

            if a_selected !="":
                question_answers=Answer.objects.filter(question=q)
                for a in question_answers:
                    if a_selected == a.text:
                        if a.correct:
                            score += 1
                            correct_answer=a.text
                    else:
                        if a.correct:
                            correct_answer=a.text

                results.append({str(q):{'correct_answer': correct_answer, 'answered':a_selected }})
            else:
                results.append({str(q): 'not aswered'})
        score_=score * multiplier
        Result.objects.create(quiz=quiz, user=user, score=score_)

        if score_>=quiz.required_score_pass:
            return JsonResponse({'passed': True, 'score': score_, 'results': results})
        else:
            return JsonResponse({'passed': False, 'score': score_, 'results': results})



