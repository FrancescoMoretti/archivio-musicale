window.onload=async function() {
    //gestione form con radio button
    const radioBtn=document.querySelectorAll('input[name="tipo-form"]');
    radioBtn.forEach(btn=>{
        btn.addEventListener("change", function(){
            document.getElementById("element1").style.display="none";
            document.getElementById("element2").style.display="none";
            document.getElementById("element3").style.display="none";
            const selected=document.querySelector('input[name="tipo-form"]:checked').value;
            switch(selected){
                case '1':
                    document.getElementById("element1").style.display="block";
                    document.getElementById("element2").style.display="block";
                    document.getElementById("element3").style.display="block";
                    break;
                case '2':
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
        const collocazione=document.getElementById("delete-collocazione").value;
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

    //fetch di ricerca edizioni (MODIFICA)
    document.getElementById("cerca-edizione-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const cercaForm=event.target;
        const modificaForm=document.getElementById("modifica-edizione-form");
        const salvaBtn=document.getElementById("salva-btn");
        const collocazione=document.getElementById("search-collocazione").value;
        const message=document.getElementById("message3");
        message.textContent="Ricerca in corso...";
        message.style.visibility="visible";
        salvaBtn.disabled=true;
        modificaForm.style.display="none";
        modificaForm.reset();
        try{
            const res=await fetch(`/api/get-edizione/${collocazione}`);
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent="Edizione trovata!";
                //popolamento del form di modifica
                document.getElementById("update-collocazione").value=result.dati.collocazione;
                document.getElementById("update-link_rism").value=result.dati.link_rism || "";
                document.getElementById("update-autore").value=result.dati.autore;
                document.getElementById("update-titolo").value=result.dati.titolo;
                document.getElementById("update-data_str").value=result.dati.data_str || "";
                document.getElementById("update-editore").value=result.dati.editore || "";
                document.getElementById("update-descrizione").value=result.dati.descrizione || "";
                document.getElementById("update-note").value=result.dati.note || "";
                salvaBtn.disabled=false;
                modificaForm.style.display="block";
            }else{
                message.textContent=result.message || "Errore durante la ricerca.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di modifica edizioni (MODIFICA)
    document.getElementById("modifica-edizione-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=document.getElementById("message4");
        const salvaBtn=document.getElementById("salva-btn");
        message.textContent="Aggiornamento del contenuto in corso...";
        message.style.visibility="visible";
        const dati={
            collocazione: document.getElementById("update-collocazione").value,
            link_rism: document.getElementById("update-link_rism").value,
            autore: document.getElementById("update-autore").value,
            titolo: document.getElementById("update-titolo").value,
            data_str: document.getElementById("update-data_str").value,
            editore: document.getElementById("update-editore").value,
            descrizione: document.getElementById("update-descrizione").value,
            note: document.getElementById("update-note").value
        };
        try{
            const res=await fetch("/api/update-edizione", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dati)
            });
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
                salvaBtn.disabled=true;
                document.getElementById("message3").style.visibility="hidden";
                document.getElementById("cerca-edizione-form").reset();
            }else{
                message.textContent=result.message || "Errore durante l'aggiornamento";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
};