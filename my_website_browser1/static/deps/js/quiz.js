// Ждём полной отрисовки HTML, потом ищем элементы и запускаем логику
document.addEventListener('DOMContentLoaded', () => {

  console.log("script quiz working");

  // Гарантируем, что базовый URL всегда заканчивается на слэш
  let url = window.location.href;
  if (!url.endsWith('/')) {
    url += '/';
  }

  const quizBox = document.getElementById('quiz-box');
  const scoreBox = document.getElementById('score-box');
  const resultBox = document.getElementById('result-box');

  let questionData = null;
  let responses = null;

  // Загрузка вопросов для страницы теста
  const loadQuestions = () => {
  // Если нет quiz-box на странице — выходим
  if (!quizBox) {
    console.log("quiz-box не найден, пропускаем");
    return;
  }

  // Достаём ID теста из URL. Например /quizes/7/ - '7'
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const quizId = pathParts[pathParts.length - 1];
  console.log("ID теста из URL:", quizId);

  // Запрос на новый DRF-эндпоинт
  $.ajax({
    type: 'GET',
    url: `/api/quizes/${quizId}/questions/`,   //  новый URL
    dataType: 'json',

    success: function(response) {
      const data = response.data;
      if (!data) {
        console.error('Нет data в ответе');
        return;
      }

      // Проходим по каждому вопросу
      data.forEach(el => {
        const question = el.text;        //  текст вопроса
        const answers = el.answers;      //  массив ответов

        // Рисуем вопрос
        quizBox.innerHTML += `
          <div class="statia quizes_center">
            <p class="p_zag question">Вопрос: ${question}</p>
          </div>
        `;

        // Рисуем каждый ответ
        answers.forEach(answer => {
          quizBox.innerHTML += `
            <div class="statia quizes_center">
              <input type="radio" class="ans" id="${question}-${answer.text}" name="${question}" value="${answer.text}">
              <label for="${question}-${answer.text}">${answer.text}</label>
            </div>
          `;
        });
      });
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

      if (!allAnswered) {
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

      $.ajax({
        type: 'POST',
        url: `${url}save/`,
        data: data,
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
          // console.error('Ошибка при отправке данных:', error);
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

    const token = localStorage.getItem('accessToken');

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
          return;
        }
        response.results.forEach(res => {
          const existingResults = document.querySelectorAll(
            `.result-item[data-quiz-name="${res.quiz_name}"]`
          );
          existingResults.forEach(el => el.remove());

          const resultDiv = document.createElement('div');
          resultDiv.className = 'result-item';

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