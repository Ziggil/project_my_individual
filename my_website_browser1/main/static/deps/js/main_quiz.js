console.log("script working");
// Находим все кнопки открытия модалки
const modalBtns = [...document.getElementsByClassName('modal-button')];
const modalBody = document.querySelector('#modal-body-confirm');
// Кнопка "Да"
const startBtn = document.getElementById('start-button');
let selectedButton = null; // Переменная для хранения выбранной кнопки

// Обработчики для открытия модалки
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
            <div>Уверены ли вы что хотите начать<br><b>${name}</b>?</div>
            <div>
                <ul class="data_quiz_ul">
                    <li class="data_quiz">сложность: <b>${difficulty}</b></li>
                    <li class="data_quiz">количество вопросов: <b>${numQuestions}</b></li>
                    <li class="data_quiz">баллы для прохождения: <b>${scoreToPass}%</b></li>
                    <li class="data_quiz">время: <b>${time} минут</b></li>
                </ul>
            </div>
        `;
        setupNoButtonHandler(); // внутри функции, где также сбрасываем selectedButton
    });
});

// Обработка кнопки "Нет"
function setupNoButtonHandler() {
    const noBtn = document.querySelector('.btn.btn-danger');
    if (noBtn) {
        noBtn.onclick = () => {
            // Очистка содержимого
            modalBody.innerHTML = '';

            // Сброс выбранной кнопки
            selectedButton = null;
        };
    }
}

// Обработка "Да"
startBtn.addEventListener('click', () => {
    if (selectedButton) {
        const pk = selectedButton.getAttribute('data-pk');
        window.location.href = window.location.href + pk;
    } else {
        alert('Тест не выбран!');
    }
});