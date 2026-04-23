// Объявляем весь код внутри IIFE для изоляции
(function() {
  console.log("script quiz working");
  const url = window.location.href;
  const quizBox = document.getElementById('quiz-box');
  const scoreBox=document.getElementById('score-box');
  const resultBox=document.getElementById('result-box');

  let questionData = null; // для хранения данных вопросов
  let responses = null; // для хранения полученных результатов

  // Функция для загрузки вопросов
  const loadQuestions = () => {
    $.ajax({
      type: 'GET',
      url: `${url}data`,
      dataType: 'json',
      success: function(response) {
        console.log('Ответ сервера:', response);

        const data = response.data;
        if (!data) {
          console.error('Нет data в ответе');
          return;
        }

        questionData = data; // сохраняем для дальнейшего доступа

        // Вставляем вопросы в страницу
        data.forEach(el => {
          for (const [question, answers] of Object.entries(el)) {
            // Вопрос
            quizBox.innerHTML += `
              <div class="statia quizes_center">
                <p class="p_zag question">Вопрос: ${question}</p>
              </div>
            `;
            // Варианты ответов
            answers.forEach(answer => {
              quizBox.innerHTML += `
                <div class="statia quizes_center">
                  <input type="radio" class="ans" id="${question}-${answer}" name="${question}" value="${answer}">
                  <label for="${question}-${answer}">${answer}</label>
                </div>
              `;
            });
          }
        });
        console.log('Вопросы вставлены на страницу.');
      },
      error: function(error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    });
  };

  // Запускаем загрузку вопросов
  loadQuestions();

  // Обработчик для кнопки "сохранить"
  document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', e => {
        e.preventDefault();

        // Перед отправкой собираем ответы
        const answersEls = document.querySelectorAll('.ans');
        const data = {};
        const form = document.getElementById('quiz-form');

        // Проверим, что все вопросы отвечены
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

        // Собираем ответы и CSRF
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

        // Добавляем CSRF
        const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]');
        if (csrfToken) {
          data['csrfmiddlewaretoken'] = csrfToken.value;
        }

        // Отправляем
        $.ajax({
          type: 'POST',
          url: `${window.location.href}save/`,
          data: data,
          success: function(response) {
            console.log('Ответ сервера:', response);
            responses = response.results;

            scoreBox.innerHTML=` <div class="zag_home_h3 score">${response.passed, 'Поздравляем!'} Ваш результат равен ${response.score.toFixed(2)}% </div>`

            // Отобразим результаты на странице
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
              resultBox.append(resDiv)
            }
            // скрываем форму
            document.getElementById('quiz-form').classList.add('not-visible');
          },
          error: function(error) {
            console.error('Ошибка при отправке данных:', error);
          }
        });
      });
    }
  });


  //Загрузка результатов тестов для главной страницы
  fetch('/api/user-results/')
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('user-results-container');
      if (!container) return;

      container.innerHTML = ''; // Очистка контейнера

      if (data.results.length === 0) {
        container.innerHTML = '<p>У вас пока нет результатов тестов.</p>';
        return;
      }

      data.results.forEach(res => {
        // Удаление старых результатов этого теста
        const existingResults = document.querySelectorAll(
          `.result-item[data-quiz-name="${res.quiz_name}"]`
        );
        existingResults.forEach(el => el.remove());

        // Вставка нового результата
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';

        // добавляем класс в зависимости от прохождения
        if (res.passed) {
          resultDiv.classList.add('passed');
        } else {
          resultDiv.classList.add('not-passed');
        }

        resultDiv.setAttribute('data-quiz-name', res.quiz_name);

        resultDiv.innerHTML = `
          <h4>${res.quiz_name}</h4>
          <p class="p_color">Процент вашего прохождения: <p class="p_color one"> ${res.score_percent.toFixed(2)}%</p></p>
          <p class="p_color">Требуется для прохождения: <p class="p_color one"> ${res.pass_score}%</p></p>
          <p class="p_color">Статус: <p class="p_color one"> ${res.passed ? 'Пройден' : 'Не пройден'}</p></p>
        `;

        container.appendChild(resultDiv);
      });
    })
    .catch(error => {
      console.error('Ошибка загрузки результатов:', error);
    });

})();


