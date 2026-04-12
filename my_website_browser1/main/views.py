

from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def index(request):
   #можно добавить список или кортеж, словарь

    return render(request, 'main/index.html')


def about(request):
    return render(request, 'main/about.html')

@login_required
def home(request):
    return render(request, 'main/home.html')

@login_required
def base(request):
    return render(request, 'main/base.html')


@login_required
def links(request):
    return render(request, 'main/links.html')


from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from results.models import Result  # замените на рею модели результатов
from quizes.models import Quiz   # если нужна информация о тесте

@login_required
def user_results_summary(request):
    user = request.user
    results = Result.objects.filter(user=user).select_related('quiz')

    data = []
    for res in results:
        data.append({
            'quiz_name': res.quiz.name,
            'score_percent': res.score,  # предполагается, что это процент
            'pass_score': res.quiz.required_score_pass,
            'passed': res.score >= res.quiz.required_score_pass,
        })

    return JsonResponse({'results': data})




# и ко всем следующим страницам примеянй этот декоратор!

# def register(request):
#     return render(request, 'main/register.html')





