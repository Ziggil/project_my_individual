(function() {
    console.log("login.js script working");

    const form =document.querySelector("#login-form");
    const loginBtn=document.querySelector('#loginBtn')

    const getCookie=(name)=>{
        let matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]): undefined;
    };

    const clearErrors=()=>{
        document.querySelector('.error').forEach(el=>el.remove());
    };

    
})