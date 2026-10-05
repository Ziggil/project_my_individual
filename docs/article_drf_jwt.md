# Как я переводил Django-проект на DRF и JWT: от монолита к чистому API

В прошлой статье я рассказывал, как переезжал с SQLite на PostgreSQL и чуть не поседел. Теперь — следующий этап. Я взялся за самое сложное: переписать бэкенд на чистое REST API с JWT-авторизацией. Это три версии одного большого этапа — `v8.1.0`, `v8.2.0`, `v8.3.0`.

Расскажу по шагам, что было, что стало, и где я облажался.

---

## 📋 Содержание

- [Что было на старте](#что-было-на-старте)
- [v8.1.0 — DRF и JWT база](#v810--drf-и-jwt-база)
- [v8.2.0 — Вопросы теста через DRF](#v820--вопросы-теста-через-drf)
- [v8.3.0 — Сохранение ответов через DRF](#v830--сохранение-ответов-через-drf)
- [Проблемы, с которыми я столкнулся](#проблемы-с-которыми-я-столкнулся)
- [Что работает сейчас](#что-работает-сейчас)
- [Что дальше](#что-дальше)

---

## Что было на старте

Мой проект **CodnitoWeb** — образовательная платформа со статьями и тестами. Работал так:

- Django рендерил HTML-страницы.
- Авторизация через сессии.
- Данные тянулись из шаблонов.
- Никакого API. Никакого JWT.

**Цель:** превратить монолит в REST API. Сохранить старую админку. Перевести фронт на JSON.

---

## v8.1.0 — DRF и JWT база

### Почему JWT, а не сессии

Разберу честно. Сессии работают только для браузеров. JWT — для любого клиента: SPA, мобильные, микросервисы.

**Что такое JWT.** Три base64-строки через точку: `header.payload.signature`. Первые две читаются кем угодно — это не шифрование. Третья — HMAC-подпись. Подделать без секретного ключа невозможно.

**Зачем два токена.** `access` — короткий (5 минут). `refresh` — длинный (1 сутки). Утёк access — через 5 минут бесполезен. Утёк refresh — можно отозвать на сервере.

**Гибрид.** Сессии — для админки Django. JWT — для API. Оба живут в одном проекте.

### Установка и настройка

```bash
pip install djangorestframework djangorestframework-simplejwt
```

В `INSTALLED_APPS`:

```python
'rest_framework',
'rest_framework_simplejwt',
```

Гибридная авторизация:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
}
```

**Что это значит.** DRF пробует JWT первым. Нет — пробует сессию. Порядок важен.

### Эндпоинты JWT

```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

**Кастомный эндпоинт** — обмен сессии на JWT:

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_jwt_from_session(request):
    user = request.user
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })
```

**Зачем.** Пользователь логинится через HTML-форму → Django создаёт сессию. `auth.js` делает скрытый POST на `/api/token/from-session/`. Бэкенд смотрит на сессию и генерирует JWT. Пользователь не замечает.

### Сериализаторы

**Для результатов тестов:**

```python
class UserResultSummarySerializer(serializers.ModelSerializer):
    quiz_name = serializers.CharField(source='quiz.name', read_only=True)
    pass_score = serializers.IntegerField(source='quiz.required_score_pass', read_only=True)
    passed = serializers.SerializerMethodField()
    score_percent = serializers.FloatField(source='score', read_only=True)

    class Meta:
        model = Result
        fields = ['quiz_name', 'score_percent', 'pass_score', 'passed']

    def get_passed(self, obj):
        return obj.score >= obj.quiz.required_score_pass
```

**Что здесь важно:**

- `source='quiz.name'` — лезет через ForeignKey в модель Quiz. В модели `Result` нет поля `quiz_name` — есть `quiz`.
- `SerializerMethodField` — вычисляемое поле. `passed` не в БД.
- `read_only=True` — только чтение.

**Для регистрации:**

```python
class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают!"})
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Такой E-mail уже существует!"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)
```

**Что здесь важно:**

- `write_only=True` — пароль никогда не вернётся в ответе.
- `validate` — комплексная валидация.
- `create_user` — хеширует пароль под капотом.

### View

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_results_summary(request):
    user = request.user
    results = Result.objects.filter(user=user).select_related('quiz')
    serializer = UserResultSummarySerializer(results, many=True)
    return Response({'results': serializer.data})
```

**Что изменилось:**

- `@api_view(['GET'])` — DRF-декоратор.
- `@permission_classes([IsAuthenticated])` — JWT-защита.
- `select_related('quiz')` — оптимизация. Один SQL вместо N+1.
- `Response` — DRF-ответ.

### Фронтенд — `auth.js`

Задача: проверить токен. Если нет или просрочен — запросить новый.

```javascript
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
};
```

**Что здесь:**

- `token.split('.')[1]` — вторая часть JWT (payload).
- `atob` — декод base64.
- `payload.exp < now` — сравнение времени.

**Токен декодируется в браузере.** Потому что payload — base64, не шифр.

### Фронтенд — `quiz.js`

Запрос с токеном:

```javascript
const token = localStorage.getItem('accessToken');

$.ajax({
  type: 'GET',
  url: '/api/user-results/',
  headers: { 'Authorization': 'Bearer ' + token },
  success: function(response) { ... }
});
```

**`Bearer` — стандарт.** Бэкенд отрезает `Bearer`, проверяет токен, кладёт пользователя в `request.user`.

---

## v8.2.0 — Вопросы теста через DRF

Перевёл загрузку вопросов со старого Django-эндпоинта на DRF.

### Сериализаторы — три вложенных

```python
class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['text']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True, source='answer_set')

    class Meta:
        model = Question
        fields = ['text', 'answers']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True, source='question_set')

    class Meta:
        model = Quiz
        fields = ['name', 'topic', 'time', 'questions']
```

**Что такое вложенные.** Сериализатор внутри сериализатора. Позволяет отдать всё дерево одним запросом: `Quiz → questions → answers`.

**`many=True`** — тут список. Без этого DRF упадёт.

**`source='answer_set'`** — Django даёт обратный доступ через `<модель>_set`.

### `@action` во ViewSet

```python
class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        quiz = self.get_object()
        questions = quiz.get_questions()
        serializer = QuestionSerializer(questions, many=True)
        return Response({
            'data': serializer.data,
            'time': quiz.time,
        })
```

**Что такое `@action`.** Декоратор кастомных эндпоинтов. `detail=True` — URL с `pk`. `detail=False` — без.

**Почему `get_questions()`, а не `question_set.all()`.** Метод в модели перемешивает вопросы и обрезает до `number_of_questions`. Студент видит разный набор.

### Роутер

```python
from rest_framework.routers import DefaultRouter
from quizes.views import QuizViewSet

router = DefaultRouter()
router.register(r'api/quizes', QuizViewSet, basename='quiz-api')

urlpatterns = [
    ...
    path('', include(router.urls)),
]
```

**Что даёт.** URL `/api/quizes/`, `/api/quizes/7/`, `/api/quizes/7/questions/` — автоматически.

### Дедупликация результатов

**Проблема.** Каждый проход теста создаёт новую запись `Result`. В БД — дубли. Фронт путается.

**Решение.**

```python
from django.db.models import Max

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_results_summary(request):
    user = request.user
    latest_ids = (
        Result.objects
        .filter(user=user)
        .values('quiz')
        .annotate(latest_id=Max('id'))
        .values_list('latest_id', flat=True)
    )
    results = Result.objects.filter(id__in=latest_ids).select_related('quiz')
    serializer = UserResultSummarySerializer(results, many=True)
    return Response({'results': serializer.data})
```

**Что происходит:**

1. `values('quiz')` — группируем по тесту.
2. `annotate(Max('id'))` — максимальный id в каждой группе.
3. `values_list(flat=True)` — плоский список id.
4. `filter(id__in=...)` — оставляем только эти записи.

**Почему по `id`, а не `created`.** Поля `created` в модели `Result` нет. А `id` автоинкрементный — больший id = свежая запись.

---

## v8.3.0 — Сохранение ответов через DRF

Перевёл сохранение ответов со старой Django-вьюхи `save_quiz_view` на DRF `@action save`.

### Сериализатор для сохранения

```python
class QuizSubmissionSerializer(serializers.Serializer):
    answers = serializers.DictField()

    def validate_answers(self, value):
        for question_text in value:
            if not Question.objects.filter(text=question_text).exists():
                raise serializers.ValidationError(f"Вопрос '{question_text}' не найден")
        return value
```

**Почему `Serializer`, а не `ModelSerializer`.** Мы не создаём запись сразу. Мы валидируем входные данные.

**`DictField`** — принимает словарь `{"вопрос": "ответ"}`.

**`validate_answers`** — своя валидация. Проверяем, что вопросы существуют.

### `@action save`

```python
@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
def save(self, request, pk=None):
    quiz = self.get_object()
    serializer = QuizSubmissionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    answers = serializer.validated_data['answers']

    score = 0
    results = []

    for question_text, selected_answer in answers.items():
        question = Question.objects.filter(text=question_text).first()
        if not question:
            continue

        correct = Answer.objects.filter(question=question, correct=True).first()

        if selected_answer == '' or selected_answer is None:
            results.append({str(question): 'not answered'})
            continue

        if correct and correct.text == selected_answer:
            score += 1
            results.append({
                str(question): {
                    'correct_answer': correct.text,
                    'answered': selected_answer,
                }
            })
        else:
            results.append({
                str(question): {
                    'correct_answer': correct.text if correct else '',
                    'answered': selected_answer,
                }
            })

    score_percent = score * 100 / quiz.number_of_questions
    Result.objects.create(quiz=quiz, user=request.user, score=score_percent)

    return Response({
        'passed': score_percent >= quiz.required_score_pass,
        'score': score_percent,
        'results': results,
    })
```

**Что здесь важно:**

- `permission_classes=[IsAuthenticated]` — только для этого action.
- `serializer.validated_data` — проверенные данные.
- `filter().first()` — безопасно. Если вопроса нет — пропускаем.
- `'not answered'` — исправлена опечатка (было `'not aswered'`).

### `quiz.js` — переписан на JSON

```javascript
const payload = { answers: {} };
questionNames.forEach(name => {
  payload.answers[name] = data[name] || '';
});

$.ajax({
  type: 'POST',
  url: `/api/quizes/${quizId}/save/`,
  contentType: 'application/json',
  data: JSON.stringify(payload),
  headers: {
    'X-CSRFToken': csrfToken ? csrfToken.value : '',
  },
  success: function(response) {
    responses = response.results;
    ...
  }
});
```

**Что изменилось:**

- URL: `${url}save/` → `/api/quizes/${quizId}/save/`.
- Формат: `FormData` → JSON `{"answers": {...}}`.
- CSRF: в заголовке `X-CSRFToken`.

---

## Проблемы, с которыми я столкнулся

### 1. `$ is not defined` — порядок скриптов

**Что было.** Открываю `/home/`. В консоли `Uncaught ReferenceError: $ is not defined`. Вся логика `auth.js` и `quiz.js` падает.

**Причина.** В `base.html` я подключил скрипты так:

```html
<script src="{% static 'deps/js/auth.js' %}"></script>
<script src="{% static 'deps/js/quiz.js' %}"></script>
...
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
```

jQuery — в самом низу. А `auth.js` использует `$.ajax`. Браузер исполняет скрипты сверху вниз. `$` ещё не существует.

**Решение.** jQuery — первым. До всех наших скриптов:

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js"></script>

<script src="{% static 'deps/js/auth.js' %}"></script>
<script src="{% static 'deps/js/main_quiz.js' %}"></script>
<script src="{% static 'deps/js/quiz.js' %}"></script>
```

### 2. Гонка событий `jwt_ready`

**Что было.** `quiz.js` вешал слушателя на `jwt_ready`. Но событие улетало раньше, чем слушатель подписывался. Результаты не грузились.

**Причина.** `auth.js` быстро получал токен и сразу отправлял `dispatchEvent('jwt_ready')`. А `quiz.js` в этот момент ещё не закончил выполнение.

**Решение.** Двойная страховка.

**В `auth.js`:**

```javascript
localStorage.setItem('jwt_ready', 'true');
document.dispatchEvent(new Event('jwt_ready'));
```

**В `quiz.js`:**

```javascript
if (localStorage.getItem('jwt_ready') === 'true') {
  loadUserResults();
}
```

**Почему работает.** Событие одномоментно. Флаг в `localStorage` — состояние. Живёт между перезагрузками.

### 3. Просроченный токен в `localStorage`

**Что было.** `auth.js` видел токен в `localStorage`. Использовал вслепую. Django отвечал 401. Результаты не грузились.

**Причина.** Токен `access` живёт 5 минут. Через 10 — мёртв. Но в памяти лежит.

**Решение.** Функция `isTokenExpired`:

```javascript
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
};
```

Если просрочен — удаляем и запрашиваем новый через `/api/token/from-session/`.

### 4. `IndentationError` в `@action save`

**Что было.** Запускаю `runserver`. Падает:

```
File ".../quizes/views.py", line 65
    correct = Answer.objects.filter(question=question, correct=True).first()
IndentationError: unindent does not match any outer indentation level
```

**Причина.** В блоке `for` я сдвинул строки `question` и `if` на 8 пробелов, а `correct` — на 12. Python не понял, где заканчивается блок.

**Решение.** Выровнял отступы. В VS Code: `Ctrl + Shift + I` (Format Document). Или вручную — до 12 пробелов.

### 5. Дубли результатов

**Что было.** Прошёл тест. Открыл `/home/`. Результат показан неверно — старый, а не новый.

**Причина.** Каждый проход теста создаёт новую запись `Result`. В БД — дубли. Эндпоинт отдавал все. Фронт оставлял не ту.

**Решение.** Дедупликация на бэке:

```python
latest_ids = (
    Result.objects
    .filter(user=user)
    .values('quiz')
    .annotate(latest_id=Max('id'))
    .values_list('latest_id', flat=True)
)
results = Result.objects.filter(id__in=latest_ids).select_related('quiz')
```

**Что происходит:**

1. `values('quiz')` — группируем по тесту.
2. `annotate(Max('id'))` — максимальный id в каждой группе.
3. `filter(id__in=...)` — оставляем только эти записи.

**Почему по `id`, а не `created`.** Поля `created` в модели `Result` нет. А `id` автоинкрементный — больший id = свежая запись.

### 6. `Mako==1.4.1.dev0` в `requirements.txt`

**Что было.** Скачал проект на другой машине. `pip install -r requirements.txt`. Ошибка:

```
ERROR: No matching distribution found for Mako==1.4.1.dev0
```

**Причина.** Я делал `pip freeze > requirements.txt`. В файл попали все пакеты окружения. Включая dev-версию `Mako`, которая не опубликована на PyPI. Плюс мусор: `Cython`, `asarPy`, `meson`.

**Решение.** Почистил файл вручную. Оставил только прямые зависимости:

```
Django==6.1.1
djangorestframework==3.18.1
djangorestframework_simplejwt==5.5.1
psycopg==3.3.6
psycopg-binary==3.3.6
python-dotenv==1.2.3
```

Проверил на чистом окружении. Всё установилось.

### 7. `URL 404` при переходе на страницу теста

**Что было.** Открываю `/quiz/7/` — 404. Хотя страница должна быть.

**Причина.** В `main_quiz.js` я писал:

```javascript
window.location.href = window.location.origin + `/quiz/${pk}/`;
```

А надо — `/quizes/7/`. Потому что приложение называется `quizes`, а не `quiz`.

Плюс в главном `urls.py` было `path('quizes', include(...))` без слэша. Значит, Django склеивал `quizes` и `7/` в `quizes7/`, а не `quizes/7/`.

**Решение.** Две правки:

1. В `main_quiz.js`: `/quiz/` → `/quizes/`.
2. В `urls.py`: `path('quizes', ...)` → `path('quizes/', ...)`.

### 8. Опечатка `'not aswered'`

**Что было.** В старой `save_quiz_view` была строка:

```python
results.append({str(q): 'not aswered'})
```

А `quiz.js` проверял:

```javascript
if (resp == 'not answered') { ... }
```

Разные строки! `quiz.js` не находил неотвеченные вопросы и вёл их в общую ветку.

**Решение.** Исправил в новом `@action save`:

```python
results.append({str(question): 'not answered'})
```

---

## Что работает сейчас

- **Студент** логинится через HTML-форму → сессия.
- **`auth.js`** автоматически получает JWT по сессии.
- **`quiz.js`** запрашивает данные через DRF с `Bearer`-токеном.
- **Токен** просрочен — обновляется.
- **Вопросы** — `/api/quizes/<pk>/questions/`.
- **Сохранение** — `/api/quizes/<pk>/save/`.
- **Результаты** — `/api/user-results/` с дедупликацией.
- **Админка** — на сессиях.

---

## Что дальше

Впереди ещё несколько шагов:

1. **Регистрация** через AJAX — перевести HTML-форму на `$.ajax` POST к `/users/api/register/`.
2. **Логин** через AJAX — отправить JSON на `/api/token/`, убрать зависимость от Django-сессии в `auth.js`.
3. **Refresh токена** в `auth.js` — обновлять `access` через `/api/token/refresh/` вместо повторного получения через сессию.

Это закроет **`v8.6.0`** — последнюю версию внедрения DRF в проект.

**После `v8.6.0`** планирую две вещи:

1. **Рабочий Docker** — упаковать всё в контейнеры: Django, PostgreSQL, Nginx. `docker-compose.yml` в корне. Запуск проекта одной командой.
2. **Релиз `v9.0.0`** — финальная версия этапа. Мажорный релиз: чистое DRF-ядро, работающее в Docker. После этого — переход к Кварталу 2: C# и микросервисы.

**Продолжение следует.** Спасибо, что дочитали.