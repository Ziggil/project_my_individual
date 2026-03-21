(function(){
  console.log("script quiz working");
  const url = window.location.href;

  const quizBox = document.getElementById('quiz-box');

  $.ajax({
    type: 'GET',
    url: `${url}data`,
    success: function(response){
    //   console.log(response);
      const data = response.data;
      data.forEach(el => {
        for(const[question, answers] of Object.entries(el)){
            console.log(question)
            console.log(answers)
            quizBox.innerHTML+=`
            <div class="statia quizes_center">
                <p class="p_zag">${question}</p>
            </div>
            `
            answers.forEach(answers=>{
              quizBox.innerHTML+=`
                <div class="statia quizes_center">
                  <input type="radio" class="ans" id="${question}-${answers}" name="${question}" value="${answers}">
                  <label for="${question}">${answers}</label>
                </div>
              `
            })
        }
      });
    },
    error: function(error){
      console.log(error);
    }
  });
})();