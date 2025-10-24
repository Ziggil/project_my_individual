from django.http import HttpResponse
from django.shortcuts import render

def index(request):
    context={
        'title':'Home',
        'content':'Сайт обучения WEB!',
        'list':[22,26,29],
        'user_auted':False
    }

    return render(request, 'main/index.html', context)



def about(request):
    return HttpResponse("Главная страница")