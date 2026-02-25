

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



# и ко всем следующим страницам примеянй этот декоратор!

# def register(request):
#     return render(request, 'main/register.html')





