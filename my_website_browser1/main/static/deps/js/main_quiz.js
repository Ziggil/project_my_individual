console.log("hello world")

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
        `<div>Уверены ли вы что хотите начать?"<b>${name}</b>"?</div>
         <div>
            <ul>
                <li>сложность:<b>${difficluty}</b></li>
                <li>количество вопросов:<b>${numQuestions}</b></li>
                <li>баллы для прохождения:<b>${scoreToPass}%</b></li>
                <li>время:<b>${time}минут</b></li>
            <ul>
         </div>
    `
    startBtn.addEventListener('click', ()=>{
        window.location.href=url+pk
    })
        
}));