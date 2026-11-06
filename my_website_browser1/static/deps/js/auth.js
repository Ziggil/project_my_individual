// Лог 1. Если видишь его — файл загрузился
debugLog("auth.js");

(function() {
  debugLog("Модуль авторизации auth.js", "ЗАПУЩЕН");

  // Функция: достаёт куку по имени
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Функция: проверяет, просрочен ли токен
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

  // Функция: просит новые токены через сессию (если токена нет вообще)
  const fetchNewTokens = () => {
    const csrf = getCookie('csrftoken');

    $.ajax({
      type: 'POST',
      url: '/api/token/from-session/',
      contentType: 'application/json',
      dataType: 'json',
      headers: {
        "X-CSRFToken": csrf
      },
      success: function(response) {
        localStorage.setItem('accessToken', response.access);
        localStorage.setItem('refreshToken', response.refresh);
        localStorage.setItem('jwt_ready', 'true');
        debugLog("JWT токены", "ПОЛУЧЕНО; СОХРАНЕНО");
        document.dispatchEvent(new Event('jwt_ready'));
      },
      error: function(xhr) {
        console.error("ОШИБКА получения токенов. Статус:", xhr.status);
      }
    });
  };

  // Главная функция при загрузке страницы
  const checkAndFetchTokens = () => {
    const existingToken = localStorage.getItem('accessToken');

    // Токен есть и рабочий — используем
    if (existingToken && !isTokenExpired(existingToken)) {
      debugLog("Токен", "УСПЕШНО/ВАЛИДНЫЙ");
      localStorage.setItem('jwt_ready', 'true');
      document.dispatchEvent(new Event('jwt_ready'));
      return;
    }

    // Токен есть, но просрочен — удаляем и просим новый
    if (existingToken) {
      debugLog("Токен", "ПРОВАЛЕНО/ПРОСРОЧЕН");
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('jwt_ready');
    }

    // Токена нет — просим
    fetchNewTokens();
  };

  // Функция для обновления accessToken через refreshToken
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
        debugLog("AccessToken", "ОБНОВЛЁН ЧЕРЕЗ REFRESH");
      },

      error: function(xhr) {
      
        if (xhr.status === 401) {
          localStorage.clear();
          window.location.href = '/users/login/';
        }
      }
    });
  };

  // Получить валидный токен (синхронно, без ожидания AJAX)
  const getValidToken = () => {
    const existingToken = localStorage.getItem('accessToken');

    // Токен есть и рабочий — вернуть его
    if (existingToken && !isTokenExpired(existingToken)) {
      return existingToken;
    }

    // Токен есть, но просрочен — запускаем обновление в фоне
    if (existingToken) {
      refreshAccessToken(); 
      return existingToken; 
    }

    // Токена нет — вернуть null
    return null;
  };

  // Выставляем функции наружу (чтобы quiz.js мог их вызвать)
  window.refreshAccessToken = refreshAccessToken;
  window.getValidToken = getValidToken;

  // Запускаем проверку при загрузке страницы
  checkAndFetchTokens();

})();

debugLog("auth.js", "УСПЕШНО");