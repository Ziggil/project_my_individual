from django.shortcuts import render
from .models import Quiz
from django.views.generic import ListView
# Create your views here.
from django.contrib.auth.decorators import login_required

 


# @login_required
class QuizListView(ListView):
    model=Quiz
    template_name='quizes/main_quiz.html'



@login_required
def quiz_view(request, pk):
    quiz=Quiz.objects.get(pk=pk)
    return render(request, 'quizes/quiz.html', {'obj':quiz})