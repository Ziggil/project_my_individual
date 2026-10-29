from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from results.models import Result
from quizes.models import Quiz
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from results.serializers import UserResultSummarySerializer
from django.db.models import Max
from articles.models import ArticleReadProgress


def index(request):
    # Главная страница (лендинг)
    return render(request, 'main/index.html')


def about(request):
    return render(request, 'main/about.html')


@login_required
def base(request):
    return render(request, 'main/base.html')


@login_required
def links(request):
    return render(request, 'main/links.html')


@login_required
def home(request):
    # Получаем все прочитанные статьи текущего пользователя и сортируем (новые сверху)
    read_articles = ArticleReadProgress.objects.filter(user=request.user).select_related('article').order_by('-read_at')

    
    # Передаем в контекст шаблона
    return render(request, 'main/home.html', {'read_articles': read_articles})




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_results_summary(request):
    user = request.user
    
    # Находим id последнего результата для каждого теста
    latest_ids = (
        Result.objects
        .filter(user=user)
        .values('quiz')
        .annotate(latest_id=Max('id'))
        .values_list('latest_id', flat=True)
    )
    
    # Оставляем только эти записи и сортируем по убыванию ID (новые сверху)
    results = Result.objects.filter(id__in=latest_ids).select_related('quiz').order_by('-id')
    serializer = UserResultSummarySerializer(results, many=True)
    return Response({'results': serializer.data})