import json  # импорт модуля json 
from django.shortcuts import render  # для рендера шаблонов
import results  # импорт модуля results (в коде не используется напрямую как модуль)
import questions  # импорт модуля questions (в коде не используется напрямую)
from .models import Quiz  # импорт модели Quiz из текущего app
from django.views.generic import ListView  # для list-вью
from django.contrib.auth.decorators import login_required  # декоратор для защиты представления
from django.http import JsonResponse  # для возврата JSON-ответов
from questions.models import Answer, Question  # модели Answer и Question (связанные с вопросами викторины)
from results.models import Result  # модель Result для сохранения результатов

# 1) спискок викторин: отображает все викторины в шаблоне
class QuizListView(ListView):
    model = Quiz 
    template_name = 'quizes/main_quiz.html'  

# 2) для отображения конкретной викторины
@login_required  # требует вход в учётную запись
def quiz_view(request, pk):
    # Получаем викторину по pk; без обработки исключения
    quiz = Quiz.objects.get(pk=pk)
    # Рендерим шаблон и передаём объект викторины в контексте под ключом 'obj'
    return render(request, 'quizes/quiz.html', {'obj': quiz})

# 3) для получения данных викторины в формате JSON (для фронтенда)
def quiz_data_view(request, pk):
    # Получаем викторину по pk; 
    quiz = Quiz.objects.get(pk=pk)
    questions_list = []  

    #метод get_questions(), возвращающий queryset вопросов
    for q in quiz.get_questions():
        answers_text = [] 
      
        for a in q.get_answers():
            answers_text.append(a.text)
        # Добавляем пару: текст вопроса -> список вариантов ответов
        questions_list.append({str(q): answers_text})

    # Возвращаем структуру данных и время на выполнение викторины
    return JsonResponse({
        'data': questions_list,
        'time': quiz.time,
    })

# 4) для сохранения результатов прохождения викторины через AJAX
def save_quiz_view(request, pk):
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        asked_questions = []  # здесь будем хранить объекты Question, соответствующие отправленным ответам

        data = request.POST  
        data_list = dict(data.lists())  
       
        print(type(data))
        print(type(data_list))

        # Удаляем CSRF токен из данных, если он попался в словаре
        data_list.pop('csrfmiddlewaretoken', None)

        # Формируем список вопросов по ключам из данных (используется текст вопроса как ключ)
        for key in data_list.keys():
            print('key:', key)
            
            question = Question.objects.get(text=key)
            asked_questions.append(question)
        print(asked_questions)

        user = request.user  # пользователь, который прошёл тест
        quiz = Quiz.objects.get(pk=pk)  # соответствующая викторина

        # представляем результат прохождения

        score = 0  
        multiplier = 100 / quiz.number_of_questions 
        results = []  
        correct_answer = None  

        # Проходим по каждому вопросу и сравниваем ответ пользователя
        for q in asked_questions:
            a_selected = request.POST.get(str(q)) 
            print('selected', a_selected)

            # когда полльзователь выбрал ответ
            if a_selected != "": 
                question_answers = Answer.objects.filter(question=q)  
                for a in question_answers:
                    if a_selected == a.text:
                        if a.correct:
                            score += 1
                            correct_answer = a.text  # запоминаем правильный ответ
                    else:
                        if a.correct:
                            correct_answer = a.text  # запоминаем правильный ответ, если это он

                # добавляем результат по текущему вопросу
                results.append({str(q): {'correct_answer': correct_answer, 'answered': a_selected}})
            else:
                # если ответ не дан
                results.append({str(q): 'not aswered'})

        score_ = score * multiplier  # переводим счет в процент
        # сохраняем результат в БД
        Result.objects.create(quiz=quiz, user=user, score=score_)

        # проверяем прохождение теста по порогу
        if score_ >= quiz.required_score_pass:
            return JsonResponse({'passed': True, 'score': score_, 'results': results})
        else:
            return JsonResponse({'passed': False, 'score': score_, 'results': results})