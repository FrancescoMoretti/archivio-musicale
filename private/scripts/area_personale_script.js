document.addEventListener("DOMContentLoaded", function(){
    //fetch di cambio password
    document.getElementById("cambia-password-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        const oldPsw=document.getElementById('password').value;
        const newPsw=document.getElementById('password2').value;
        const confirmPsw=document.getElementById('password3').value;
        //validazione client-side
        if(!oldPsw || !newPsw || !confirmPsw){
            message.textContent="Inserisci la vecchia password, la nuova password e ripetere la nuova password.";
            return;
        }
        if(newPsw!==confirmPsw){
            message.textContent="Le nuove password non corrispondono."
            return;
        }
        try{
            const res=await fetch('/api/cambia-password', {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": 'application/json'},
                body: JSON.stringify({oldPsw, newPsw, confirmPsw})
            });
            const result=await res.json();
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href = "/403.html";
                return;
            }
            if(res.ok && result.success){
                alert(result.message);//avviso che vene richiesto di rifare il login
                window.location.href="/accedi";
            }else{
                message.textContent=result.message || "Errore durante l'aggiornamento della password.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
});