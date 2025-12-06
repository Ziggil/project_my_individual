from django.http import HttpResponse

from django.shortcuts import render

def index(request):
   #можно добавить список или кортеж, словарь

    return render(request, 'main/index.html')



def about(request):
    return render(request, 'main/about.html')



def regist(request):
    return render(request, 'main/regist.html')




