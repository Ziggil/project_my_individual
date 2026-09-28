// Лог 1. Если видишь его — файл загрузился
console.log("auth.js START");


// Обёртка. Прячем переменные внутрь, чтобы не мешали другим скриптам
(function() {

  // Лог 2. Модуль начал работу
  console.log("Модуль авторизации auth.js запущен");

  // Функция: достаёт куку по имени. Нужна для CSRF-токена
  const getCookie = (name) => {

    // Приклеиваем "; " в начало, чтобы искать точно по имени
    const value = `; ${document.cookie}`;

    // Режем строку по шаблону "; имя="
    const parts = value.split(`; ${name}=`);

    // Если кука найдена — берём её значение
    if (parts.length === 2) return parts.pop().split(';').shift();

    // Куки нет — null
    return null;
  };

  // Функция: проверяет, просрочен ли токен
  const isTokenExpired = (token) => {

    // Токена нет — считаем просроченным
    if (!token) return true;

    try {
      // Достаём данные из токена (вторая часть между точками)
      // atob расшифровывает base64, JSON.parse делает объект
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Текущее время в секундах
      const now = Math.floor(Date.now() / 1000);

      // Если срок истёк — true, иначе false
      return payload.exp < now;

    } catch (e) {
      // Токен битый — считаем просроченным
      return true;
    }
  };

  // Функция: просит у сервера новые токены
  const fetchNewTokens = () => {

    // Достаём CSRF-куку — без неё сервер откажет
    const csrf = getCookie('csrftoken');

    // Лог: есть ли кука
    console.log("CSRF-кука:", csrf ? "ЕСТЬ" : "НЕТ");

    // Отправляем POST-запрос на сервер
    $.ajax({
      type: 'POST',
      url: '/api/token/from-session/',
      contentType: 'application/json',
      dataType: 'json',

      // Кладём CSRF в заголовок — иначе 403
      headers: {
        "X-CSRFToken": csrf
      },

      // Если всё ок
      success: function(response) {

        // Сохраняем токены в память браузера
        localStorage.setItem('accessToken', response.access);
        localStorage.setItem('refreshToken', response.refresh);

        // Ставим флаг «готово»
        localStorage.setItem('jwt_ready', 'true');

        // Лог
        console.log("JWT токены успешно получены и сохранены!");

        // Говорим quiz.js: «можно грузить»
        document.dispatchEvent(new Event('jwt_ready'));
      },

      // Если ошибка
      error: function(xhr) {
        // Логируем код и текст
        console.log("ОШИБКА получения токенов. Статус:", xhr.status);
        console.log("Текст ответа:", xhr.responseText);

        // Флаг НЕ ставим — quiz.js не будет грузить
      }
    });
  };

  // Главная функция: решает, что делать с токеном
  const checkAndFetchTokens = () => {

    // Смотрим, есть ли токен
    const existingToken = localStorage.getItem('accessToken');

    // Лог: есть или нет
    console.log("Существующий токен в localStorage:", existingToken ? "ЕСТЬ" : "НЕТ");

    // Случай 1: токен есть и он рабочий
    if (existingToken && !isTokenExpired(existingToken)) {

      console.log("Токен валидный, используем его");

      // Ставим флаг
      localStorage.setItem('jwt_ready', 'true');

      // Говорим quiz.js грузить
      document.dispatchEvent(new Event('jwt_ready'));

      // Выходим — новый токен не нужен
      return;
    }

    // Случай 2: токен есть, но просрочен
    if (existingToken) {

      console.log("Токен просрочен, удаляем и запрашиваем новый");

      // Чистим всё старое
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('jwt_ready');
    }

    // Случай 3: токена нет — просим новый
    fetchNewTokens();
  };

  // Запускаем
  checkAndFetchTokens();

})();


// Лог 3. Если видишь — файл дошёл до конца
console.log("auth.js END");