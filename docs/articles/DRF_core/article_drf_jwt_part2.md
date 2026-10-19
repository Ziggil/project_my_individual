# Как я переводил Django-проект на DRF и JWT. Часть 2: AJAX, JWT и работа над ошибками

В первой части я рассказал, как перевёл проект с SQLite на PostgreSQL и начал переписывать бэкенд на DRF. Остановился на том, что API для тестов и результатов уже работает, но авторизация всё ещё частично держится на сессиях Django.

Теперь — вторая часть. Здесь я закрываю **`v8.4.0`**, **`v8.5.0`** и **`v8.6.0`**. Это регистрация через AJAX, логин через AJAX, вывод ошибок и refresh токена.

---

## 📋 Содержание

- [Что было на старте второй части](#что-было-на-старте-второй-части)
- [v8.4.0 — Регистрация через AJAX](#v840--регистрация-через-ajax)
- [v8.5.0 — Логин через AJAX и JWT](#v850--логин-через-ajax-и-jwt)
- [v8.6.0 — Refresh токена](#v860--refresh-токена)
- [Проблемы, с которыми я столкнулся](#проблемы-с-которыми-я-столкнулся)
- [Что работает сейчас](#что-работает-сейчас)
- [Что дальше](#что-дальше)

---

## Что было на старте второй части

На тот момент:

- DRF-эндпоинты для тестов и результатов работали.
- JWT выдавался, но через сессию (`/api/token/from-session/`).
- Логин и регистрация — обычные HTML-формы с перезагрузкой страницы.
- Ошибки валидации показывались стандартными средствами Django.

**Задача:** убрать перезагрузки, перевести формы на AJAX, сделать так, чтобы токен обновлялся сам.

---

## v8.4.0 — Регистрация через AJAX

### Бэкенд: сериализатор и view

Регистрация уже была, но через HTML-форму. Нужно было сделать API-эндпоинт.

**Сериализатор:**

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

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

**View:**

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Пользователь успешно зарегистрирован!"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**URL:**

```python
path('api/register/', views.api_register, name='api-register'),
```

**Что важно:**

- `write_only=True` — пароль никогда не вернётся в ответе.
- `validate` — комплексная валидация.
- `create_user` — хеширует пароль под капотом.
- 400 с ошибками — DRF-стандарт для валидации.

**Результат:** регистрация работает через JSON. Ошибки — в ответе.

---

## v8.5.0 — Логин через AJAX и JWT

### Бэкенд: сериализатор и view

**Сериализатор:**

```python
from django.contrib.auth import authenticate

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError("Неверный логин или пароль")
        attrs['user'] = user
        return attrs
```

**View:**

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**URL:**

```python
path('api/login/', views.api_login, name='api-login'),
```

**Что важно:**

- `Serializer`, а не `ModelSerializer` — нет модели для логина.
- `validate` — проверка через `authenticate`.
- `login(request, user)` — создаёт сессию Django.
- Возвращает JWT-токены в JSON.

**Результат:** логин работает через JSON. JWT выдаётся в ответе.

---

## v8.6.0 — Refresh токена

### Проблема

`access` токен живёт 5 минут. Если пользователь сидит на сайте и кликает — запросы падают с 401. Надо обновлять `access` через `refresh`.

### Решение: `auth.js`

Добавил функцию `refreshAccessToken`:

```javascript
const refreshAccessToken = () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        return;
    }

    $.ajax({
        type: 'POST',
        url: '/api/token/refresh/',
        contentType: 'application/json',
        data: JSON.stringify({ refresh: refreshToken }),

        success: function(response) {
            localStorage.setItem('accessToken', response.access);
            console.log("AccessToken обновлён через refresh");
        },

        error: function(xhr) {
            if (xhr.status === 401) {
                localStorage.clear();
                window.location.href = '/users/login/';
            }
        }
    });
};
```

И функцию `getValidToken`:

```javascript
const getValidToken = () => {
    const existingToken = localStorage.getItem('accessToken');

    if (existingToken && !isTokenExpired(existingToken)) {
        return existingToken;
    }

    if (existingToken) {
        refreshAccessToken();
        return existingToken;
    }

    return null;
};
```

**Что происходит:**

1. Если токен валиден — возвращаем его.
2. Если просрочен — запускаем `refreshAccessToken` в фоне и возвращаем старый. Запрос упадёт 401, но следующий — пройдёт.
3. Если токена нет — `null`.

**Важно:** функции вынесены в `window`, чтобы `quiz.js` мог их использовать:

```javascript
window.refreshAccessToken = refreshAccessToken;
window.getValidToken = getValidToken;
```

### Проверка

Изменил в `settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(seconds=10),  # для теста
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}
```

Логин → ждём 15 секунд → токен просрочен → делаем запрос → `auth.js` обновляет токен через `/api/token/refresh/` → следующий запрос проходит 200.

**После теста** вернул `ACCESS_TOKEN_LIFETIME` на 5 минут.

---

## Проблемы, с которыми я столкнулся

### 1. Ошибка `sata` вместо `data`

**Что было.** В `api_login` я написал:

```python
serializer = UserLoginSerializer(sata=request.data)
```

**Что случилось.** `TypeError: Field.__init__() got an unexpected keyword argument 'sata'`. Django упал с 500.

**Решение.** Исправил `sata` на `data`.

**Урок.** Одна буква — и падает всё.

### 2. CSRF токен не совпадал

**Что было.** При отправке логина через AJAX Django возвращал 403:

```
CSRF token from POST incorrect.
```

**Причина.** В `login.js` я удалял `csrfmiddlewaretoken` из данных и передавал его только в заголовке. Но токен в заголовке должен совпадать с токеном в cookie.

**Решение.** Убрал `delete data.csrfmiddlewaretoken`. Теперь токен уходит и в теле, и в заголовке. Так надёжнее.

### 3. Ошибка `non_field_errors` не отображалась

**Что было.** При неверном пароле Django возвращал ошибку, но она не показывалась.

**Причина.** `showErrors` искал поле `#id_non_field_errors`, а такого поля нет.

**Решение.** Добавил обработку `non_field_errors` — показывать ошибку под формой:

```javascript
if (field === 'non_field_errors') {
    input = form;
}
```

### 4. Refresh токена не работал

**Что было.** `getValidToken` возвращал `undefined` при просроченном токене.

**Причина.** В ветке `if (existingToken)` не было `return`. Функция завершалась, не возвращая ничего.

**Решение.** Добавил `return existingToken;` — возвращаем старый токен, пока `refreshAccessToken` обновляет его в фоне.

### 5. `localStorage.save` не существует

**Что было.** В `refreshAccessToken` я написал:

```javascript
localStorage.save("accessToken")
```

**Что случилось.** `TypeError: localStorage.save is not a function`.

**Решение.** `localStorage.setItem('accessToken', response.access)` — правильный метод.

### 6. `.venv_linux_work` попал в коммит

**Что было.** После `git add .` в коммит попала вся папка `.venv_linux_work` — тысячи файлов библиотек.

**Причина.** В `.gitignore` не было записи для `.venv_linux_work`.

**Решение.** Добавил в `.gitignore` и убрал из индекса:

```bash
git rm -r --cached .venv_linux_work
echo ".venv_linux_work/" >> .gitignore
```

**Урок.** Всегда проверяй `git status` перед `git add .`.

### 7. GitHub блокировал пуш из-за email

**Что было.** При `git push` GitHub возвращал ошибку:

```
GH007: Your push would publish a private email address.
```

**Причина.** В настройках GitHub включена приватность email. Коммит подписан личной почтой.

**Решение.** Использовал `noreply` email GitHub:

```bash
git config --global user.email "ID+Ziggil@users.noreply.github.com"
git commit --amend --reset-author --no-edit
git push origin h_quiz_v8_postgresql_drf
```

---

## Что работает сейчас

- **Логин через AJAX** — без перезагрузки. JWT в `localStorage`.
- **Регистрация через AJAX** — без перезагрузки. Ошибки под полями.
- **Refresh токена** — автоматически, когда `access` истёк.
- **Ошибки DRF** — показываются под формой.
- **Все эндпоинты** — работают.
- **Админка** — на сессиях.

---

## Что дальше

Впереди — **`v9.0.0`**:

1. **Docker** — упаковать Django, PostgreSQL, Nginx в контейнеры. `docker-compose.yml` в корне.
2. **Чистое DRF-ядро** — убрать зависимость от сессий Django в API.
3. **Релиз** — финальная версия этапа DRF.

После `v9.0.0` — переход к Кварталу 2: C#, .NET Core, микросервисы, FastAPI.

**Продолжение следует.** В следующей статье — Docker, CI/CD и деплой на VPS. Спасибо, что дочитали.