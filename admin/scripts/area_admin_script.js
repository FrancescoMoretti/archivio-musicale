window.onload=async function() {
    //gestione form con radio button
    const radioBtn=document.querySelectorAll('input[name="tipo-form"]');
    radioBtn.forEach(btn=>{
        btn.addEventListener("change", function(){
            document.getElementById("element1").style.display="none";
            document.getElementById("element2").style.display="none";
            const selected=document.querySelector('input[name="tipo-form"]:checked').value;
            switch(selected){
                case '1':
                    document.getElementById("element1").style.display="block";
                    document.getElementById("element2").style.display="block";
                    break;
            }
        });
    });

    //fetch di aggiunta edizioni
    document.getElementById("aggiungi-edizione-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=document.getElementById("message1");
        message.textContent="Caricamento in corso...";
        message.style.visibility="visible";
        //validazione client-side
        const collocazione=form.elements["collocazione"].value.trim();
        const autore=form.elements["autore"].value.trim();
        const titolo=form.elements["titolo"].value.trim();
        if(!collocazione||!autore||!titolo){
            message.textContent="Errore: Collocazione, autore e titolo sono obbligatori.";
            return;
        }
        if(parseInt(collocazione)<=0){
            message.textContent="Errore: La collocazione deve essere un numero positivo.";
            return;
        }
        //preparazione dati
        const formData=new FormData(form);
        try{
            const res=await fetch("/api/add-edizione", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            const result=await res.json();
            //gestione reindirizzamenti
            if(res.status===401){
                window.location.href="/login.html";
                return;
            }
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message||"Errore durante il salvataggio.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di cancellazione edizioni
    document.getElementById("cancella-edizione-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const collocazione=document.getElementById("collocazione").value;
        const message=document.getElementById("message2");
        message.textContent="Cancellazione in corso...";
        message.style.visibility="visible";
        //validazione client-side
        if(!collocazione){
            message.textContent="Errore: Numero di collocazione non inserito."
            return;
        }
        if(parseInt(collocazione)<=0){
            message.textContent="Errore: la collocazione deve essere un numero positivo.";
            return;
        }
        //conferma
        if(!confirm(`Sei sicuro di voler eliminare l'edizione/manoscritto ${collocazione}?`)){
            return;
        }
        try{
            const res=await fetch("/api/delete-edizione",{
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({collocazione})
            });
            const result = await res.json();
            //gestione reindirizzamenti
            if(res.status===401){
                window.location.href="/login.html";
                return;
            }
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message||"Errore durante la cancellazione.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
        }
    });
};