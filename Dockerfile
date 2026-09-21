# Используем официальный образ Python
FROM python:3.10.0rc1


# Указываем рабочую директорию внутрь контейнера
WORKDIR /app

# Копируем файлы проекта
COPY my_website_browser1/ /app/

# Устанавливаем зависимости
COPY requirements.txt /app/
RUN pip install -r requirements.txt

# Команда запуска
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]