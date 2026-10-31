# Используем стабильный slim-образ
FROM python:3.13-slim

# Отключаем создание .pyc и включаем вывод логов
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только requirements для кэширования
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект
COPY . .


# Переходим в папку, где лежит manage.py
WORKDIR /app/my_website_browser1

EXPOSE 8000

# Теперь Gunicorn видит my_website_browser/wsgi.py
CMD ["gunicorn", "my_website_browser.wsgi:application", "--bind", "0.0.0.0:8000"]