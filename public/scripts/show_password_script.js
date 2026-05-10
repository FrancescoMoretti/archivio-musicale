document.addEventListener("DOMContentLoaded", function(){
    //gestione delle icone per vedere/nascondere la password
    const password=document.getElementById("password");
    const occhioAperto=document.getElementById("icona-occhio-aperto");
    const occhioChiuso=document.getElementById("icona-occhio-chiuso");
    occhioAperto.addEventListener("click", function(){
        password.type="text";
        occhioAperto.style.display="none";
        occhioChiuso.style.display="block";
    });
    occhioChiuso.addEventListener("click", function(){
        password.type="password";
        occhioChiuso.style.display="none";
        occhioAperto.style.display="block";
    });
    //gestione duplicata (per cambio password ci sono 3 input da poter vedere/nascondere)
    const password2=document.getElementById("password2");
    const occhioAperto2=document.getElementById("icona-occhio-aperto2");
    const occhioChiuso2=document.getElementById("icona-occhio-chiuso2");
    if(password2 && occhioAperto2 && occhioChiuso2){
        occhioAperto2.addEventListener("click", function(){
            password2.type="text";
            occhioAperto2.style.display="none";
            occhioChiuso2.style.display="block";
        });
        occhioChiuso2.addEventListener("click", function(){
            password2.type="password";
            occhioChiuso2.style.display="none";
            occhioAperto2.style.display="block";
        });
    }

    const password3=document.getElementById("password3");
    const occhioAperto3=document.getElementById("icona-occhio-aperto3");
    const occhioChiuso3=document.getElementById("icona-occhio-chiuso3");
    if(password3 && occhioAperto3 && occhioChiuso3){
        occhioAperto3.addEventListener("click", function(){
            password3.type="text";
            occhioAperto3.style.display="none";
            occhioChiuso3.style.display="block";
        });
        occhioChiuso3.addEventListener("click", function(){
            password3.type="password";
            occhioChiuso3.style.display="none";
            occhioAperto3.style.display="block";
        });
    }
});