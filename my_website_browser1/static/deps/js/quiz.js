// Ждём полной отрисовки HTML, потом ищем элементы и запускаем логику
document.addEventListener('DOMContentLoaded', () => {

  console.log("script quiz working");

  // Гарантируем, что базовый URL всегда заканчивается на слэш
  let url = window.location.href;
  if (!url.endsWith('/')) {
    url += '/';
  }

  // Достаём ID теста из URL. Например /quizes/7/ - '7'
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const quizId = pathParts[pathParts.length - 1];
  console.log("ID теста из URL:", quizId);

  const quizBox = document.getElementById('quiz-box');
  const scoreBox = document.getElementById('score-box');
  const resultBox = document.getElementById('result-box');
  const timerDisplay = document.getElementById('timer-display'); // Контейнер для таймера

  let questionData = null;
  let responses = null;
  let timerInterval = null; // Для хранения ID интервала
  let isTimeOut = false;    // [ДОБАВЛЕНО] Флаг, что время вышло


  // Используется для перемешивания порядка ответов внутри вопроса.
  const shuffleArray = (array) => {
    const result = array.slice(); // копия, чтобы не менять оригинал
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]; // swap
    }
    return result;
  };

  // --- ФУНКЦИЯ ТАЙМЕРА ---
  const startQuizTimer = (totalQuestions) => {
    console.log("Функция таймера работает")
    if (!timerDisplay) return;

    // 1 минута на 1 вопрос
    let timeLeft = totalQuestions * 60; 

    // Очищаем старый таймер, если он был (на случай перезапуска)
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `Осталось времени: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        // Если время вышло
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "Время вышло!";
            isTimeOut = true; // [ДОБАВЛЕНО] Устанавливаем флаг
            alert("Время вышло! Тест будет отправлен автоматически.");
            
            // Вызываем функцию сохранения (эмуляция клика по кнопке)
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.click(); 
            }
        }
    }, 1000);
  };

  // Загрузка вопросов для страницы теста
  const loadQuestions = () => {
    // Если нет quiz-box на странице — выходим
    if (!quizBox) {
      console.log("quiz-box не найден, пропускаем");
      return;
    }

    // Запрос на новый DRF-эндпоинт
    $.ajax({
      type: 'GET',
      url: `/api/quizes/${quizId}/questions/`,
      dataType: 'json',

      success: function(response) {
        const data = response.data;
        if (!data) {
          console.error('Нет data в ответе');
          return;
        }

        // Собираю весь HTML в одну переменную, чтобы избежать багов с innerHTML +=
        let htmlContent = '';

        // Проходим по каждому вопросу
        data.forEach(el => {
          const question = el.text;
          // Перемешиваем ответы внутри вопроса.
          const answers = shuffleArray(el.answers);

          // Рисуем вопрос
          htmlContent += `
            <div class="quizes_center quiz-question-card">
              <p class="p_zag question">Вопрос: ${question}</p>
            </div>
          `;

          // Оборачиваю ответы в общий контейнер для правильного отображения
          htmlContent += `<div class="answers-container">`;

          // Рисуем каждый ответ
          answers.forEach(answer => {
            htmlContent += `
              <div class="quizes_center quiz-answer-card">
                <input type="radio" class="ans" id="${question}-${answer.text}" name="${question}" value="${answer.text}">
                <label for="${question}-${answer.text}">${answer.text}</label>
              </div>
            `;
          });

          // Закрываем контейнер ответов
          htmlContent += `</div>`;
        });

        // Вставляю весь собранный HTML один раз
        quizBox.innerHTML = htmlContent;

        // Запускаем таймер после отрисовки вопросов
        startQuizTimer(data.length);
      },

      error: function(error) {
        console.error('Ошибка загрузки вопросов:', error);
      }
    });
  };

  loadQuestions();

  // Обработчик для кнопки "Сохранить"
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', e => {
      e.preventDefault();

      // Останавливаем таймер при отправке
      if (timerInterval) clearInterval(timerInterval);

      const answersEls = document.querySelectorAll('.ans');
      const data = {};
      const form = document.getElementById('quiz-form');

      const questionNames = [...new Set(Array.from(answersEls).map(q => q.name))];

      let allAnswered = true;
      questionNames.forEach(name => {
        if (!form.querySelector(`input[name="${name}"]:checked`)) {
          allAnswered = false;
        }
      });

      //  Если время вышло, мы пропускаем проверку на все ответы
      if (!allAnswered && !isTimeOut) {
        alert('Пожалуйста, ответьте на все вопросы!');
        return;
      }

      const formData = new FormData(form);
      for (const [key, value] of formData.entries()) {
        if (data[key]) {
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]];
          }
          data[key].push(value);
        } else {
          data[key] = value;
        }
      }

      const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]');
      if (csrfToken) {
        data['csrfmiddlewaretoken'] = csrfToken.value;
      }

      // Формат для DRF: {"answers": {"вопрос": "ответ"}}
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

          if (scoreBox) {
            scoreBox.innerHTML = ` <div class="zag_home_h3 score">${response.passed ? 'Поздравляем!' : 'Попробуйте еще раз!'} Ваш результат равен ${response.score.toFixed(2)}% </div>`;
          }

          const resDiv = document.createElement('div');
          for (const res of responses) {
            for (const [question, resp] of Object.entries(res)) {
              const questionDiv = document.createElement('div');
              questionDiv.className = 'statia quizes_center';

              if (resp == 'not answered') {
                questionDiv.innerHTML = `<p class="p_zag">${question}: - not answered</p>`;
                questionDiv.classList.add('bd-danger');
              } else {
                const answer = resp['answered'];
                const correct = resp['correct_answer'];

                if (answer == correct) {
                  questionDiv.classList.add('bd-success');
                  questionDiv.innerHTML = `<p class="p_zag">Вопрос: ${question} | ваш ответ ${answer} </p>`;
                } else {
                  questionDiv.classList.add('bd-danger');
                  questionDiv.innerHTML = `<p class="p_zag">Вопрос: ${question} | ваш ответ ${answer} | правильный ответ: ${correct}</p>`;
                }
              }
              document.body.appendChild(questionDiv);
            }
            if (resultBox) {
              resultBox.append(resDiv);
            }
          }

          const quizForm = document.getElementById('quiz-form');
          if (quizForm) {
            quizForm.classList.add('not-visible');
          }
        },
        error: function(error) {
          console.error('Ошибка при отправке данных:', error);
        }
      });
    });
  }

  // Загрузка результатов тестов для главной страницы через JWT
  const loadUserResults = () => {
    const container = document.getElementById('user-results-container');
    if (!container) {
      console.log("user-results-container не найден на этой странице, пропускаем");
      return;
    }

    const token = window.getValidToken();

    $.ajax({
      type: 'GET',
      url: '/api/user-results/',
      dataType: 'json',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: function(response) {
        container.innerHTML = '';

        if (!response.results || response.results.length === 0) {
          container.innerHTML = '<p>У вас пока нет результатов тестов.</p>';
          const toggleTestsBtn = document.getElementById('toggle-tests-btn');
          if (toggleTestsBtn) toggleTestsBtn.style.display = 'none';
          return;
        }

        response.results.forEach((res, index) => { 
          const existingResults = document.querySelectorAll(
            `.result-item[data-quiz-name="${res.quiz_name}"]`
          );
          existingResults.forEach(el => el.remove());

          const resultDiv = document.createElement('div');
          resultDiv.className = 'result-item';

          if (index >= 3) {
            resultDiv.classList.add('hidden-result');
            resultDiv.style.display = 'none';
          }

          if (res.passed) {
            resultDiv.classList.add('passed');
          } else {
            resultDiv.classList.add('not-passed');
          }
          resultDiv.setAttribute('data-quiz-name', res.quiz_name);
          resultDiv.innerHTML = `
            <h4>${res.quiz_name}</h4>
            <p class="p_color">Процент вашего прохождения: </p><p class="p_color one"> ${res.score_percent.toFixed(2)}%</p>
            <p class="p_color">Требуется для прохождения: </p><p class="p_color one"> ${res.pass_score}%</p>
            <p class="p_color">Статус: </p><p class="p_color one"> ${res.passed ? 'Пройден' : 'Не пройден'}</p>
          `;
          container.appendChild(resultDiv);
        });

        const toggleTestsBtn = document.getElementById('toggle-tests-btn');
        if (toggleTestsBtn) {
          if (response.results.length > 3) {
            toggleTestsBtn.style.display = 'inline-block';
            
            const newBtn = toggleTestsBtn.cloneNode(true);
            toggleTestsBtn.parentNode.replaceChild(newBtn, toggleTestsBtn);
            
            let testsExpanded = false;
            newBtn.addEventListener('click', () => {
              testsExpanded = !testsExpanded;
              const hiddenItems = container.querySelectorAll('.hidden-result');
              hiddenItems.forEach(item => {
                item.style.display = testsExpanded ? 'block' : 'none';
              });
              newBtn.textContent = testsExpanded ? 'Скрыть лишние тесты' : 'Показать все тесты';
            });
          } else {
            toggleTestsBtn.style.display = 'none';
          }
        }
      },
      error: function(error) {
        console.error('Ошибка загрузки результатов. Возможно, токен отсутствует:', error);
        if (container) {
          container.innerHTML = '<p>Не удалось загрузить результаты. Войдите заново.</p>';
        }
      }
    });
  };

  // Подписка на событие от auth.js
  document.addEventListener('jwt_ready', () => {
    console.log("quiz.js получил сигнал готовности токенов, загружаем результаты...");
    loadUserResults();
  });

  // Проверяем: если auth.js уже отработал ДО этого места — грузим сразу
  if (localStorage.getItem('jwt_ready') === 'true') {
    console.log("quiz.js: jwt_ready уже был, грузим результаты сразу");
    loadUserResults();
  }

});