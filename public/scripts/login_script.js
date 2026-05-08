document.addEventListener("DOMContentLoaded", function(){
    //fetch di autenticazione
    document.getElementById("login-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        const email=document.getElementById("email").value;
        const password=document.getElementById("password").value;
        //validazione client-side
        if(!email || !password){
            message.textContent="Email o password non inseriti.";
            return;
        }
        try{
            //fetch di login
            const res=await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({email, password})
            });
            const result=await res.json();
            //se il login è avvenuto correttamente
            if(res.ok && result.success){
                //se il ruolo è admin o editor
                if(result.ruolo==='admin' || result.ruolo==='editor'){
                    //area admin
                    window.location.href="/admin/area_admin.html";
                }else{
                    //area utente (non esiste)
                }
            }else{
                //se il login non è avvenuto
                message.textContent=result.message || "Errore durante il login.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });

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
});