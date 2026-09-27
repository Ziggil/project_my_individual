console.log("auth.js START");

(function() {
  console.log("Модуль авторизации auth.js запущен");

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Проверяет, истёк ли JWT-токен по полю exp
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

  const fetchNewTokens = () => {
    const csrf = getCookie('csrftoken');
    console.log("CSRF-кука:", csrf ? "ЕСТЬ" : "НЕТ");

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
        console.log("JWT токены успешно получены и сохранены!");
        document.dispatchEvent(new Event('jwt_ready'));
      },
      error: function(xhr) {
        console.log("ОШИБКА получения токенов. Статус:", xhr.status);
        console.log("Текст ответа:", xhr.responseText);
        // Не ставим флаг — quiz.js не будет пытаться грузить результаты
      }
    });
  };

  const checkAndFetchTokens = () => {
    const existingToken = localStorage.getItem('accessToken');
    console.log("Существующий токен в localStorage:", existingToken ? "ЕСТЬ" : "НЕТ");

    if (existingToken && !isTokenExpired(existingToken)) {
      console.log("Токен валидный, используем его");
      localStorage.setItem('jwt_ready', 'true');
      document.dispatchEvent(new Event('jwt_ready'));
      return;
    }

    if (existingToken) {
      console.log("Токен просрочен, удаляем и запрашиваем новый");
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('jwt_ready');
    }

    fetchNewTokens();
  };

  checkAndFetchTokens();

})();

console.log("auth.js END");