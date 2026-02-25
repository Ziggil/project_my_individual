
from django.contrib.auth import authenticate, login, logout
from django.core.signals import request_finished
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from .forms import LoginUserForm, RegisterUserForm

from django.contrib.auth.views import LogoutView

from django.shortcuts import redirect
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required






def login_user(request):
    if request.method=='POST':
        form=LoginUserForm(request.POST)
        if form.is_valid():
            cd=form.cleaned_data
            user=authenticate(request, username=cd['username'],
                              password=cd['password'])
            if user and user.is_active:
                login(request, user)
                return HttpResponseRedirect(reverse('home'))
            else:
                pass
                    
    else:
        form=LoginUserForm()



    return render(request, 'users/login.html', {'form': form})




def logout_user(request):
    logout(request)
    return render(request,'users/logout.html')



def register(request):
    if request.method=="POST":
        form=RegisterUserForm(request.POST)
        if form.is_valid():
            user=form.save(commit=False) #пока не заносим в бд данные 
            user.set_password(form.cleaned_data['password']) #шифрование пароля и занисени его password forms
            user.save() #сохроняем в бд пароль
            return render(request, 'main/index.html')
    else: 
        form=RegisterUserForm()
    return render(request,  'users/register.html', {'form':form})

def profile(request):
    return render(request,'users/profile.html')