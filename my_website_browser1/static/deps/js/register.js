// IIFE (Immediately Invoked Function Expression) — изолирует переменные,
// чтобы не засорять глобальную область видимости (window).
(function() {
    debugLog("register.js");

    // Находим форму и кнопку по id
    const form = document.querySelector("#register-form");
    const registerBtn = document.querySelector("#registerBtn");

    // Функция для получения CSRF-токена из cookie.
    const getCookie = (name) => {
        let matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

    // Удаляет старые ошибки перед новой попыткой.
    const clearErrors = () => {
        document.querySelectorAll(".error").forEach(el => el.remove());
    };

    // Показывает ошибки, пришедшие от DRF.
    // DRF возвращает объект вида { "username": ["..."] }.
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

    // Вешаем обработчик на кнопку
    if (registerBtn) {
        registerBtn.addEventListener("click", (e) => {
            // Останавливаем стандартную отправку формы (если бы она была)
            e.preventDefault();

            // 1. Чистим старые ошибки
            clearErrors();

            // 2. Собираем данные формы в объект
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // 3. Отправляем AJAX-запрос на DRF-эндпоинт регистрации
            $.ajax({
                type: "POST",
                url: "/users/api/register/",
                contentType: "application/json",
                data: JSON.stringify(data),
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                },

                // 4. Успех — редирект на страницу логина
                success: function(response) {
                    debugLog("Успешная регистрация", "ПОЛЬЗОВАТЕЛЬ СОЗДАН");
                    // Перенаправляем на страницу входа
                    window.location.href = "/users/login/";
                },

                // 5. Ошибка валидации — показываем рядом с полями
                error: function(xhr) {
                    console.error("Ошибка регистрации:", xhr.responseJSON);
                    if (xhr.responseJSON) {
                        showErrors(xhr.responseJSON);
                    } else {
                        // Если ошибка не от DRF (например, сеть), показываем общий alert
                        alert("Произошла ошибка при регистрации. Попробуйте позже.");
                    }
                },
            });
        });
    }

})();