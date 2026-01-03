
from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.forms import UserCreationForm  
from django.contrib.auth.models import User  

class LoginUserForm(forms.Form):
    username=forms.CharField(label="Логин", 
                             widget=forms.TextInput(attrs={'class':'form-input'}))
    password=forms.CharField(label="Пароль",
                              widget=forms.PasswordInput(attrs={'class': 'form-input'}))



class RegisterUserForm(forms.ModelForm):
    username=forms.CharField(label="Логин")
    password=forms.CharField(label="Пароль", widget=forms.PasswordInput())
    password2=forms.CharField(label="Повтор пароля", widget=forms.PasswordInput())

    class Meta:
        model=get_user_model()
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2']
        labels={
                'email': 'E-mail',
                'first_name': "Имя",
                'last_name': "Фамилия",
        }