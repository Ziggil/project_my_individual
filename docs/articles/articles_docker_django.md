# Как я подключал Docker к Django-проекту: от ошибок до рабочего контейнера

В этой статье расскажу, как я подключал Docker к своему проекту CodnitoWeb. Где облажался, как настраивал статику и почему фикстура не грузилась.

## Зачем вообще Docker

У меня уже было: Django, DRF, PostgreSQL, JWT. Но каждый перенос на другой компьютер — это боль. Заново ставить базу, создавать пользователя, настраивать права, ставить зависимости. Docker решает это раз и навсегда. Ты один раз пишешь `Dockerfile` и `docker-compose.yml`, а потом одной командой поднимаешь проект на любой машине. 

До этого я пытался подключить Docker к старой версии своего проекта, но не смог. И вот решил наконец попробовать подключить его снова, но уже к новой версии проекта, которая гораздо больше и сложнее предыдущей. Это помогло мне лучше разобраться в Docker.

## Установка Docker

> **Важно:** Docker ставится в систему, а не в VS Code. VS Code может иметь расширение для удобства, но сам движок — это системная программа.

Ставил так:

```bash
sudo apt update
sudo apt install docker.io docker-compose
```

Чтобы не писать `sudo` каждый раз, добавил себя в группу:

```bash
sudo usermod -aG docker $USER
```

После этого нужно перезагрузиться.

## Dockerfile

Как говорил ранее, у меня был старый `Dockerfile`, но он не работал. Проблемы: устаревший образ `python:3.10.0rc1`, неправильные пути, запуск через `runserver` вместо `gunicorn`.

Новый `Dockerfile` выглядит так:

```dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app/my_website_browser1

EXPOSE 8000

CMD ["gunicorn", "my_website_browser.wsgi:application", "--bind", "0.0.0.0:8000"]
```

Обрати внимание на `WORKDIR /app/my_website_browser1`. Это важно, потому что `manage.py` и `wsgi.py` лежат именно там.

## docker-compose.yml

Самое важное — связать Django и PostgreSQL. Я использовал `healthcheck` и `depends_on`, чтобы Django не падал раньше, чем база запустится.

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-web_learning_db}
      POSTGRES_USER: ${DB_USER:-dev_learning_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-12345}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${DB_USER:-dev_learning_user} -d $${DB_NAME:-web_learning_db}"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    environment:
      DB_NAME: ${DB_NAME:-web_learning_db}
      DB_USER: ${DB_USER:-dev_learning_user}
      DB_PASSWORD: ${DB_PASSWORD:-12345}
      DB_HOST: db
      DB_PORT: 5432
    volumes:
      - .:/app

volumes:
  postgres_data:
```

## .dockerignore

Обязательно добавил `.dockerignore`, чтобы не тащить в образ мусор:

```text
.venv_linux_work/
__pycache__/
*.pyc
.git/
.env
db.sqlite3
```

## Первый запуск и ошибки

Запустил:

```bash
docker-compose up --build
```

### Ошибка 1: Mako==1.4.3.dev0 не найдена
В `requirements.txt` оказались dev-версии библиотек, которых нет на PyPI. Почистил файл, оставил только нужное: `Django`, `DRF`, `JWT`, `psycopg2`, `gunicorn`, `whitenoise`.

### Ошибка 2: relation "auth_user" does not exist
Сайт запустился, но база пустая. Выполнил миграции внутри контейнера:

```bash
docker-compose exec web python manage.py migrate
```

### Ошибка 3: Key (user_id)=(4) is not present in table "auth_user"
При загрузке фикстуры `content_fixtures.json` она ссылалась на пользователей, которых в новой базе нет. Очистил фикстуру от `results` и `articles.articlereadprogress` (это данные пользователей):

```bash
python manage.py dumpdata articles.Articles quizes questions --indent 4 > content_fixtures.json
```

## Статика и WhiteNoise

Сайт загрузился, но CSS и JS не работали. Gunicorn не умеет отдавать статику. Поставил WhiteNoise.

В `requirements.txt` добавил `whitenoise==6.8.2`. В `settings.py` включил:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # добавил
    ...
]

STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

После этого CSS и JS заработали.

## Итог

Проект запустился в Docker. Теперь для старта нужно всего две команды:

```bash
docker-compose up -d
docker-compose exec web python manage.py migrate
```

Сайт доступен на http://localhost:8000/.

**Что я понял:** Docker реально решает проблему «работает только у меня». Без `healthcheck` Django падает раньше базы. Gunicorn и статика — это боль, но WhiteNoise спасает. Главное — не бояться ошибок и читать логи.

Docker — это не страшно, хотя может быть и сложным. В следующей статье расскажу, как буду связывать этот проект с C# (ASP.NET Core) через Docker.
