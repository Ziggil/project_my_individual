from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from .forms import LoginUserForm, RegisterUserForm

def login_user(request):
    if request.method=='POST':
        form=LoginUserForm(request.POST)
        if form.is_valid():
            cd=form.cleaned_data
            user=authenticate(request, username=cd['username'],
                              password=cd['password'])
            if user and user.is_active:
                login(request, user)
                return HttpResponseRedirect(reverse('index'))
    else:
        form=LoginUserForm()

    return render(request, 'users/login.html', {'form': form})

def logout_user(request):
    logout(request)
    return HttpResponseRedirect('users:login')



def register(request):
    form=RegisterUserForm()
    return render(request,  'users/register.html', {'form':form})