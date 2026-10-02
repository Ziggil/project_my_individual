
#Импортируем приложения, модули, модели и декораторы, для работы с вопросами, ответами и тестами, а так же с типом данных
import json  
from django.shortcuts import render  
import results  
import questions  
from .models import Quiz  
from django.views.generic import ListView  
from django.contrib.auth.decorators import login_required  
from django.http import JsonResponse  
from questions.models import Answer, Question  
from results.models import Result  


# импорты для DR
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import QuizSerializer, QuestionSerializer, QuizSubmissionSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [AllowAny]

    # Эндпоинт 1: получить вопросы теста (GET /api/quizes/<pk>/questions/)
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        quiz = self.get_object()  # достаём тест по pk из URL
        questions = quiz.get_questions()  # метод модели: перемешивает и обрезает
        serializer = QuestionSerializer(questions, many=True)  # many=True — список
        return Response({
            'data': serializer.data,
            'time': quiz.time,
        })

    # Эндпоинт 2: сохранить ответы студента (POST /api/quizes/<pk>/save/)
    # permission_classes только для этого action — IsAuthenticated
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save(self, request, pk=None):
        quiz = self.get_object()  # достаём тест по pk

        # Валидируем входные данные через сериализатор
        serializer = QuizSubmissionSerializer(data=request.data)

        if not serializer.is_valid():
            # Возвращаем 400 с ошибками сериализатора
            return Response(serializer.errors, status=400)

        # Достаём проверенные ответы студента: {"вопрос": "ответ"}
        answers = serializer.validated_data['answers']

        score = 0  # счётчик правильных ответов
        results = []  # структура для фронта: разбор каждого вопроса

        # Проходим по каждому вопросу и ответу студента
        for question_text, selected_answer in answers.items():
            # Находим вопрос в БД по тексту
            question = Question.objects.filter(text=question_text).first()
            if not question:
                    continue

            # Находим правильный ответ на этот вопрос
            correct = Answer.objects.filter(question=question, correct=True).first()

            # Если студент не ответил — особый случай
            if selected_answer == '' or selected_answer is None:
                results.append({str(question): 'not answered'})
                continue  # переходим к следующему вопросу

            # Студент ответил. Сравниваем с правильным
            if correct and correct.text == selected_answer:
                score += 1  # +1 к счёту
                results.append({
                    str(question): {
                        'correct_answer': correct.text,
                        'answered': selected_answer,
                    }
                })
            else:
                # Ответ неверный — добавляем разбор
                results.append({
                    str(question): {
                        'correct_answer': correct.text if correct else '',
                        'answered': selected_answer,
                    }
                })

        # Считаем процент: правильные * 100 / общее число вопросов
        score_percent = score * 100 / quiz.number_of_questions

        # Создаём запись Result в БД для текущего пользователя
        Result.objects.create(quiz=quiz, user=request.user, score=score_percent)

        # Возвращаем JSON: прошёл / не прошёл, процент, разбор
        return Response({
            'passed': score_percent >= quiz.required_score_pass,
            'score': score_percent,
            'results': results,
        })

# 1) спискок викторин: отображает все викторины в шаблоне
class QuizListView(ListView):

    model = Quiz 
    template_name = 'quizes/main_quiz.html'  

# 2) для отображения конкретной викторины с её вопросами и ответами
@login_required  
def quiz_view(request, pk):

    quiz = Quiz.objects.get(pk=pk)
    return render(request, 'quizes/quiz.html', {'quiz': quiz})
    # return render(request, 'quizes/quiz.html', {'obj': quiz})

# 3) для получения данных викторины в формате JSON (для фронтенда)
def quiz_data_view(request, pk):

    quiz = Quiz.objects.get(pk=pk)
    questions_list = []  
    for q in quiz.get_questions():
        answers_text = [] 
        for a in q.get_answers():
            answers_text.append(a.text)
        questions_list.append({str(q): answers_text})
    return JsonResponse({
        'data': questions_list,
        'time': quiz.time,
    })

# 4) для сохранения результатов прохождения конкретной викторины пользователем, анализа ответов пользователя и отображение результатов прохождения
def save_quiz_view(request, pk):
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        asked_questions = [] 
        data = request.POST  
        data_list = dict(data.lists())  
        print(type(data))
        print(type(data_list))
        data_list.pop('csrfmiddlewaretoken', None)

        for key in data_list.keys():
            print('key:', key)
            question = Question.objects.get(text=key)
            asked_questions.append(question)
        print(asked_questions)

        user = request.user  
        quiz = Quiz.objects.get(pk=pk)  

        score = 0  
        multiplier = 100 / quiz.number_of_questions 
        results = []  
        correct_answer = None  

        for q in asked_questions:
            a_selected = request.POST.get(str(q)) 
            print('selected', a_selected)

            if a_selected != "": 
                question_answers = Answer.objects.filter(question=q)  
                for a in question_answers:
                    if a_selected == a.text:
                        if a.correct:
                            score += 1
                            correct_answer = a.text 
                    else:
                        if a.correct:
                            correct_answer = a.text 
               
                results.append({str(q): {'correct_answer': correct_answer, 'answered': a_selected}})
            else:
              
                results.append({str(q): 'not aswered'})

        score_ = score * multiplier  
        Result.objects.create(quiz=quiz, user=user, score=score_)
        
        if score_ >= quiz.required_score_pass:
            return JsonResponse({'passed': True, 'score': score_, 'results': results})
        else:
            return JsonResponse({'passed': False, 'score': score_, 'results': results})