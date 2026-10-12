# CodnitoWeb — Как я переносил Django-проект с SQLite на PostgreSQL под Linux

> **И не сошёл с ума**

---

## 📋 Содержание

- [Вступление](#вступление)
- [Акт I. Конфликт виртуальных окружений](#акт-i-конфликт-виртуальных-окружений)
- [Акт II. Перенос данных и ошибка на 918 байт](#акт-ii-перенос-данных-и-ошибка-на-918-байт)
- [Акт III. Ошибки на фронтенде](#акт-iii-ошибки-на-фронтенде)
- [Акт IV. Утечка .env в Git](#акт-iv-утечка-env-в-git)
- [Акт V. Утечка SECRET_KEY](#акт-v-утечка-secret_key)
- [Акт VI. Ошибка mysqlclient](#акт-vi-ошибка-mysqlclient)
- [Акт VII. Фикстуры для переноса контента](#акт-vii-фикстуры-для-переноса-контента)
- [Финал. Работа с Git](#финал-работа-с-git)
- [💡 Выводы](#-выводы)
- [🛠️ Техническое приложение](#️-техническое-приложение-команды-и-настройки)

---

## Вступление

Привет, Хабр. На связи начинающий бэкенд-разработчик. Это моя первая статья на Хабре, поэтому прошу не судить строго.

**Стек, с которым я работаю:**

- Python
- Основы JavaScript
- Django
- База DRF
- PostgreSQL
- Немного Docker
- Git и GitHub

Недавно я установил **Linux (Zorin OS 18 Lite)** рядом с Windows и решил перенести туда свой пет-проект.

Проект называется **CodnitoWeb** — это образовательная платформа со статьями и тестами, которую я делаю в колледже с первого курса. Недавно я решил расширить проект и первым делом перевести базу данных с **SQLite** на **PostgreSQL**. Об этом и будет статья.

Изначально я пытался сделать это на Windows, но столкнулся с проблемами кодировок, путей и сетевых доступов. Потратил три часа, разобрался, но решил не мучиться и перенёс проект в Linux. Скопировал проект на флешку и запустил Zorin OS.

---

## Акт I. Конфликт виртуальных окружений

Первая проблема возникла с папкой `venv`. Я попытался запустить старый Windows-venv на Linux, и это привело к ошибкам. Внутри `venv` лежат скомпилированные под конкретную ОС бинарные файлы и абсолютные пути, которые не работают на другой системе.

**Вторая ошибка:** я пытался выполнять команды настройки PostgreSQL внутри терминала VS Code, путая его с системным терминалом. Команды не выполнялись.

### ✅ Решение

1. Я оставил старую папку `venv` нетронутой (чтобы проект можно было запускать на Windows), а рядом создал новое окружение `.venv_linux`. Все изменения, сделанные на Linux, можно будет перенести на Windows через `requirements.txt`.

2. PostgreSQL установил через **системный терминал Linux** (`Ctrl + Alt + T`), а Python-библиотеки вроде `psycopg2-binary` — **внутри нового окружения** `.venv_linux`.

---

## Акт II. Перенос данных и ошибка на 918 байт

После установки PostgreSQL нужно было перенести данные из `db.sqlite3` в новую базу. В проекте около **559 объектов**: тесты, вопросы, ответы и статьи.

Django предоставляет для этого команды `dumpdata` и `loaddata`.

### Ошибка №1: Пустой дамп

Я выполнил выгрузку и обнаружил, что файл `datadump.json` весит всего **918 байт**.

> **Причина:** я заранее переключил настройки на PostgreSQL в `settings.py` и забыл вернуть SQLite перед снятием дампа. Django выгрузил пустые системные строки из новой базы.

**✅ Решение:** перед дампом вернул SQLite в блок `DATABASES`, сделал выгрузку (файл стал **380 КБ**), затем переключил настройки обратно на PostgreSQL.

### Ошибка №2: Конфликт системных типов

При загрузке дампа в PostgreSQL терминал выдал ошибки о существующих типах данных. При первой миграции PostgreSQL создала технические записи, которые конфликтовали с импортируемыми данными.

**✅ Решение:** очистил системную таблицу через интерактивную консоль Django:

```python
from django.contrib.contenttypes.models import ContentType

ContentType.objects.all().delete()
```

После этого команда `loaddata` выполнилась успешно:

```
Installed 559 object(s)
```

---

## Акт III. Ошибки на фронтенде

После запуска сервера статьи отображались, а тесты и вопросы — нет. Консоль браузера выдавала:

```
TypeError
SyntaxError: invalid escape sequence
```

**Причина:** при копировании кода из внешнего источника платформа автоматически добавила обратные слэши перед спецсимволами (например, `\$.ajax`). Скрипт не мог выполниться. Дополнительно браузер закешировал старые версии файлов.

### ✅ Решение

1. В файлах `quiz.js` и `main_quiz.js` удалил все бэкслеши перед знаками доллара, вернув синтаксис `$.ajax`.
2. Обернул поиск кнопок в проверку `if (startBtn)` и добавил слушатель `DOMContentLoaded`, чтобы скрипты не выполнялись до отрисовки элементов.
3. Очистил кеш браузера через `Ctrl + Shift + R`. На Linux это важно, потому что браузеры агрессивно кешируют скрипты.

После этого тесты отобразились корректно.

---

## Акт IV. Утечка .env в Git

После успешного переноса я залил новую версию проекта на GitHub. Через несколько дней, скачивая проект на другом компьютере, обнаружил, что в публичный репозиторий попал файл `.env` с реальными логинами, хостами и паролем от PostgreSQL.

### ✅ Решение

1. Сменил пароль пользователя PostgreSQL через `ALTER USER`, чтобы утекшие данные стали бесполезны.
2. Добавил `.env` в `.gitignore`. Но Git продолжал отслеживать файл, так как он уже был закоммичен.
3. Выполнил команду:

```bash
git rm --cached .env
```

Это удалило файл из индекса Git, но сохранило его на диске.

4. Создал файл `.env.example` с шаблоном без реальных паролей:

```env
DB_ENGINE=django.db.backends.postgresql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=web_learning_db
DB_USER=dev_learning_user
DB_PASSWORD=YOUR_PASSWORD_HERE
```

---

## Акт V. Утечка SECRET_KEY

В файле `settings.py` с самого начала проекта был открыто указан `SECRET_KEY`. Этот ключ использовался в старых коммитах на GitHub.

`SECRET_KEY` нужен Django для шифрования сессий, защиты форм от CSRF-атак и подписи cookies. Если злоумышленник узнает ключ, он сможет подделать сессию администратора.

### ✅ Решение

1. Установил библиотеку `python-dotenv`:

```bash
pip install python-dotenv
```

2. Заменил ключ в `settings.py` на чтение из переменной окружения:

```python
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-for-local-dev')
```

3. Сгенерировал новый ключ командой:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

4. Перенёс новый ключ в файл `.env`. Старый ключ больше не используется.

---

## Акт VI. Ошибка mysqlclient

При скачивании проекта с GitHub возникла ошибка:

```
ERROR: Failed to build 'mysqlclient'
```

**Причина:** в `requirements.txt` оставалась зависимость `mysqlclient`, которая не использовалась в проекте.

### ✅ Решение

Вернулся в папку разработки и обновил `requirements.txt`, исключив лишнюю зависимость:

```bash
pip freeze | grep -v "mysqlclient" > requirements.txt
git add requirements.txt .env.example
```

---

## Акт VII. Фикстуры для переноса контента

В базе данных на Linux были созданы статьи, уроки и вопросы для тестов. Нужно было перенести их на Git, но не заливать системные данные (сессии, логи админки, ошибки совместимости).

### ✅ Решение

Использовал точечные фикстуры Django.

Выполнил выгрузку только нужных приложений:

```bash
python manage.py dumpdata news quizes questions --indent 4 > content_fixtures.json
```

Файл `content_fixtures.json` сохранил в папке проекта рядом с `manage.py`. Старый `datadump.json` удалил командой:

```bash
rm datadump.json
```

---

## Финал. Работа с Git

После переноса я пересоздал ветку `h_quiz_v8_postgresql`, настроил связь с удалённым репозиторием, сделал коммит и поставил тег `v8.0.0`.

```bash
git add .
git commit -m "feat: переезд с SQLite на PostgreSQL, перенос 559 объектов данных"
git tag -f -a v8.0.0 -m "Релиз v8.0.0"
git push origin h_quiz_v8_postgresql -f
git push origin v8.0.0 -f
```

Также обновил `README.md` с инструкцией для Windows и Linux.

---

## 💡 Выводы

- **Не запускайте Windows-venv на Linux.** Создавайте новое окружение под конкретную ОС.
- **Перед снятием дампа проверяйте, на какую базу данных указывают настройки.**
- **Не коммитьте `.env` и `SECRET_KEY`.** Если утечка произошла — смените пароли и ключи.
- **Используйте точечные фикстуры**, чтобы не тащить в репозиторий системный мусор.
- **Проверяйте проект после скачивания из репозитория.**

В следующей статье планирую переписать бэкенд на **DRF** с **JWT**-авторизацией и подключить **Docker**.

---

## 🛠️ Техническое приложение: команды и настройки

### Шаг 1. Установка PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo -i -u postgres psql
```

В консоли `psql`:

```sql
CREATE USER dev_learning_user WITH SUPERUSER PASSWORD '12345';
CREATE DATABASE web_learning_db OWNER dev_learning_user;
\q
```

### Шаг 2. Настройка pg_hba.conf

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

> ⚠️ Замените `16` на вашу версию PostgreSQL.

Внизу файла для локальных подключений:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             127.0.0.1/32            md5
```

Сохраните (`Ctrl + O`, `Enter`), выйдите (`Ctrl + X`) и перезапустите службу:

```bash
sudo systemctl restart postgresql
```

### Шаг 3. Настройка окружения

```bash
source .venv_linux/bin/activate
pip install --upgrade pip setuptools
pip freeze | grep -v "mysqlclient" > requirements.txt
```

### Шаг 4. Защита конфигурации

Добавьте в `.gitignore`:

```
.env
```

Удалите `.env` из индекса Git:

```bash
git rm --cached .env
```

Создайте `.env.example` с шаблоном (см. выше).

В `settings.py` настройте чтение переменных:

```python
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-for-local-dev')

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'web_learning_db'),
        'USER': os.getenv('DB_USER', 'dev_learning_user'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
```

### Шаг 5. Миграции и фикстуры

```bash
python manage.py migrate
python manage.py loaddata content_fixtures.json
```

### Шаг 6. Фиксация релиза

```bash
git add .
git commit -m "feat: переезд с SQLite на PostgreSQL, перенос 559 объектов"
git tag -f -a v8.0.0 -m "Релиз v8.0.0"
git push origin h_quiz_v8_postgresql -f
git push origin v8.0.0 -f
```

