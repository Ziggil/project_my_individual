console.log("script working")



const modalBtns=[...document.getElementsByClassName('modal-button')]
const modalBody=document.querySelector('#modal-body-confirm')
const startBtn=document.getElementById('start-button')

const url=window.location.href

modalBtns.forEach(modalBtn=>modalBtn.addEventListener('click',()=>{
    const pk=modalBtn.getAttribute('data-pk')
    const name=modalBtn.getAttribute('data-quiz')
    const numQuestions=modalBtn.getAttribute('data-questions')
    const difficluty=modalBtn.getAttribute('data-difficluty')
    const scoreToPass=modalBtn.getAttribute('data-pass')
    const time=modalBtn.getAttribute('data-time')

    modalBody.innerHTML=

        `
        <div>Уверены ли вы что хотите начать<br><b>${name}</b>?</div>
         <div>
            <ul data_quiz_ul>
                <li class="data_quiz">сложность: <b>${difficluty}</b></li>
                <li  class="data_quiz">количество вопросов: <b>${numQuestions}</b></li>
                <li  class="data_quiz">баллы для прохождения: <b>${scoreToPass}%</b></li>
                <li  class="data_quiz">время: <b>${time}минут</b></li>
            <ul>
         </div>
    `
    startBtn.addEventListener('click', ()=>{
        window.location.href=url+pk
    })
        
}));

