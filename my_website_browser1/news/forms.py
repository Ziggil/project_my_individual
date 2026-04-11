# Импортируем модель Articles из текущего пакета моделей
from .models import Articles

# Импортируем необходимые классы для создания форм на основе моделей
from django.forms import ModelForm, TextInput, DateTimeInput, Textarea

# Определяем форму на основе модели Articles
class ArticlesFrom(ModelForm):
    class Meta:
        # Связать форму с моделью Articles
        model = Articles
        # Указать поля, которые будут отображаться в форме
        fields = ['title', 'anons', 'full_text', 'date']

    # Настройка виджетов полей формы (нужна для кастомизации HTML-элементов)
    widget = {  # Обратите внимание: ключи должны соответствовать именам полей
        # Виджет для поля title
        "title": TextInput(attrs={
            'class': 'form-control',       # CSS-класс для стилей Bootstrap
            'placeholder': 'Название статьи'  # Подсказка в пустом поле
        }),

        # Виджет для поля anons
        "anons": TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Анонс статьи'
        }),

        # Виджет для поля date
        "date": DateTimeInput(attrs={
            'class': 'form-control',
            'placeholder': 'Дата публикации'
        }),

        # Виджет для поля full_text
        "full_text": Textarea(attrs={
            'class': 'form-control',
            'placeholder': 'Текст статьи'
        })
    }