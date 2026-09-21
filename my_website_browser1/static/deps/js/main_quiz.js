console.log("script working");

document.addEventListener('DOMContentLoaded', () => {
    // Находим все кнопки открытия модалки
    const modalBtns = [...document.getElementsByClassName('modal-button')];
    const modalBody = document.querySelector('#modal-body-confirm');
    // Кнопка "Да"
    const startBtn = document.getElementById('start-button');
    let selectedButton = null; // Переменная для хранения выбранной кнопки

    // Обработчики для открытия модалки
    if (modalBtns.length > 0 && modalBody) {
        modalBtns.forEach(modalBtn => {
            modalBtn.addEventListener('click', () => {
                // Запоминаем выбранную кнопку
                selectedButton = modalBtn;

                const pk = modalBtn.getAttribute('data-pk');
                const name = modalBtn.getAttribute('data-quiz');
                const numQuestions = modalBtn.getAttribute('data-questions');
                const difficulty = modalBtn.getAttribute('data-difficluty');
                const scoreToPass = modalBtn.getAttribute('data-pass');
                const time = modalBtn.getAttribute('data-time');

                // Вставляем в модалку
                modalBody.innerHTML = `
                    <div>Уверен, что хотите начать тест <b>"${name}"</b>?</div>
                    <ul>
                        <li>Количество вопросов: ${numQuestions}</li>
                        <li>Сложность: ${difficulty}</li>
                        <li>Балл для прохождения: ${scoreToPass}%</li>
                        <li>Время: ${time} мин.</li>
                    </ul>
                `;
            });
        });
    }

    // Защита от ошибки: проверяем, существует ли кнопка старта на текущей странице
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (selectedButton) {
                const pk = selectedButton.getAttribute('data-pk');
                window.location.href = window.location.origin + `/quiz/${pk}/`;
            }
        });
    }
});
