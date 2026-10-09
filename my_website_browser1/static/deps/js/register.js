// Изолируем переменные в самовызывающейся функции
(function() {
    console.log("register.js запущен");

    // Находим форму и кнопку
    const form = document.querySelector('#register-form');
    const registerBtn = document.querySelector('#registerBtn');

    // Достаёт cookie по имени (нужен для CSRF-токена)
    const getCookie = (name) => {
        let matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

    // Удаляет старые ошибки перед новой попыткой
    const clearErrors = () => {
        document.querySelectorAll('.error').forEach(el => el.remove());
    };

    // Рисует ошибки, пришедшие от DRF, рядом с полями
    const showErrors = (errors) => {
        Object.entries(errors).forEach(([field, messages]) => {
            const input = document.querySelector(`#id_${field}`);
            if (input) {
                const span = document.createElement('span');
                span.className = 'error';
                span.textContent = messages.join(', ');
                input.insertAdjacentElement('afterend', span);
            }
        });
    };

    // Вешаем обработчик на кнопку регистрации
    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Чистим старые ошибки
            clearErrors();

            // 2. Собираем данные формы в объект
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            delete data.csrfmiddlewaretoken;   // CSRF уйдёт в заголовке

            // 3. Отправляем AJAX-запрос на DRF-эндпоинт
            $.ajax({
                type: 'POST',
                url: '/users/api/register/',
                contentType: 'application/json',
                data: JSON.stringify(data),
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                },

                // 4. Успех — редирект на логин
                success: function(response) {
                    window.location.href = '/users/login/';
                },

                // 5. Ошибка валидации — показываем
                error: function(xhr) {
                    if (xhr.responseJSON) {
                        showErrors(xhr.responseJSON);
                    }
                },
            });
        });
    }
})();