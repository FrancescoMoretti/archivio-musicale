document.addEventListener("DOMContentLoaded", function(){
    document.querySelector('main').querySelector('.grid').style.display="grid";
    
    //fetch di aggiunta utente
    document.getElementById("aggiungi-utente-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        message.textContent="Caricamento in corso...";
        //validazione client-side
        const nome=form.elements["nome"].value.trim();
        const ruolo=form.elements["ruolo"].value.trim();
        const email=form.elements["email"].value.trim();
        const password=form.elements["password"].value.trim();
        if(!nome || !ruolo || !email || !password){
            message.textContent="Tutti i campi devono essere riempiti."
            return;
        }
        //preparazione dati
        const dati={
            nome: nome,
            ruolo: ruolo,
            email: email,
            password: password
        };
        try{
            const res=await fetch("/api/add-utente", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(dati)
            });
            const result=await res.json();
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message || "Errore durante il salvataggio.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
});