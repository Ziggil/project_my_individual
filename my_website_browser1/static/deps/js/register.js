// IIFE (Immediately Invoked Function Expression) — изолирует переменные,
// чтобы не засорять глобальную область видимости (window).
(function() {
    console.log("login.js script working");

    // Находим форму и кнопку по id (проверь, что они есть в login.html)
    const form = document.querySelector("#login-form");
    const loginBtn = document.querySelector("#loginBtn");

    // Функция для получения CSRF-токена из cookie.
    // Django кладёт csrftoken в cookie. Без него POST-запрос вернёт 403.
    const getCookie = (name) => {
        let matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

    // Удаляет старые ошибки перед новой попыткой.
    // ВАЖНО: querySelectorAll, а не querySelector (иначе удалит только первую).
    const clearErrors = () => {
        document.querySelectorAll(".error").forEach(el => el.remove());
    };

    // Показывает ошибки, пришедшие от DRF, рядом с соответствующими полями.
    // DRF возвращает объект вида { "username": ["..."] }.
    // Мы ищем input по id, добавляем span с ошибкой после него.
    const showErrors = (errors) => {
        Object.entries(errors).forEach(([field, messages]) => {
            const input = document.querySelector(`#id_${field}`);
            if (input) {
                const span = document.createElement("span");
                span.className = "error";
                span.textContent = messages.join(", ");
                input.insertAdjacentElement("afterend", span);
            }
        });
    };

    // Вешаем обработчик на кнопку логина
    if (loginBtn) {
        loginBtn.addEventListener("click", (e) => {
            // Останавливаем стандартную отправку формы
            e.preventDefault();

            // 1. Чистим старые ошибки
            clearErrors();

            // 2. Собираем данные формы в объект
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            

            // 3. Отправляем AJAX-запрос на DRF-эндпоинт
            $.ajax({
                type: "POST",
                url: "/users/api/login/",
                contentType: "application/json",
                data: JSON.stringify(data),
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                },

                // 4. Успех — сохраняем JWT и редирект на главную
                success: function(response) {
                    // Сохраняем токены в localStorage, чтобы auth.js их подхватил
                    localStorage.setItem("access_token", response.access);
                    localStorage.setItem("refresh_token", response.refresh);
                    window.location.href = "/home/";
                },

                // 5. Ошибка валидации — показываем рядом с полями
                error: function(xhr) {
                    if (xhr.responseJSON) {
                        showErrors(xhr.responseJSON);
                    }
                },
            });
        });
    }

})();