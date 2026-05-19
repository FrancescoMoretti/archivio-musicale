document.addEventListener("DOMContentLoaded", function () {
    //gestione form con radio button
    const radioBtn = document.querySelectorAll('input[name="tipo-form"]');
    radioBtn.forEach(btn => {
        btn.addEventListener("change", function () {
            document.getElementById("edizione-grid").style.display = "none";
            document.getElementById("stampa-grid").style.display = "none";
            document.getElementById("evento-grid").style.display = "none";
            const selected = document.querySelector('input[name="tipo-form"]:checked').value;
            switch (selected) {
                case '1':
                    document.getElementById("edizione-grid").style.display="grid";
                break;
                case '2':
                    document.getElementById("stampa-grid").style.display="grid";
                break;
                case '3':
                    document.getElementById("evento-grid").style.display="grid";
                break;
            }
        });
    });

    //fetch di aggiunta edizioni (INSERIMENTO)
    document.getElementById("aggiungi-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const message = form.querySelector('p');
        //validazione client-side
        const collocazione = form.elements["collocazione"].value.trim();
        const autore = form.elements["autore"].value.trim();
        const titolo = form.elements["titolo"].value.trim();
        if (!collocazione || !autore || !titolo) {
            message.textContent = "Errore: Collocazione, autore e titolo sono obbligatori.";
            return;
        }
        message.textContent = "Caricamento in corso...";
        //preparazione dati
        const formData = new FormData(form);
        try {
            const res = await fetch("/api/add-edizione", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent = result.message;
                form.reset();
            } else {
                message.textContent = result.message || "Errore durante il salvataggio.";
            }
        } catch (err) {
            message.textContent = "Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di cancellazione edizioni (ELIMINAZIONE)
    document.getElementById("cancella-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const message = form.querySelector('p');
        //validazione client-side
        const collocazione = document.getElementById("delete-collocazione-edizione").value.trim();
        if (!collocazione) {
            message.textContent = "Errore: Collocazione non inserita."
            return;
        }
        //conferma
        if (!confirm(`Sei sicuro di voler eliminare l'Edizione/Manoscritto ${collocazione}?`)) {
            return;
        }
        message.textContent = "Cancellazione in corso...";
        try {
            const res = await fetch("/api/delete-edizione", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collocazione })
            });
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent = result.message;
                form.reset();
            } else {
                message.textContent = result.message || "Errore durante la cancellazione.";
            }
        } catch (err) {
            message.textContent = "Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di ricerca edizioni (MODIFICA)
    document.getElementById("cerca-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const cercaForm = event.target;
        const message = cercaForm.querySelector('p');
        //validazione client-side
        const collocazione = document.getElementById("search-collocazione-edizione").value.trim();
        if(!collocazione){
            message.textContent="Errore: Collocazione non inserita."
            return;
        }
        const modificaForm = document.getElementById("modifica-edizione-form");
        const message2 = modificaForm.querySelector('p');
        const salvaBtn = modificaForm.querySelector('input[type="submit"]');
        message2.textContent="";
        message.textContent = "Ricerca in corso...";
        salvaBtn.disabled = true;
        modificaForm.style.display = "none";
        modificaForm.reset();
        try {
            const res = await fetch(`/api/get-edizione/${encodeURIComponent(collocazione)}`);
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent = "Contenuto trovato!";
                //popolamento del form di modifica
                document.getElementById("update-collocazione-edizione").value = result.dati.collocazione;
                document.getElementById("update-link_rism-edizione").value = result.dati.link_rism || "";
                document.getElementById("update-autore-edizione").value = result.dati.autore;
                document.getElementById("update-titolo-edizione").value = result.dati.titolo;
                document.getElementById("update-data_str-edizione").value = result.dati.data_str || "";
                document.getElementById("update-editore-edizione").value = result.dati.editore || "";
                document.getElementById("update-descrizione-edizione").value = result.dati.descrizione || "";
                document.getElementById("update-note-edizione").value = result.dati.note || "";
                salvaBtn.disabled = false;
                modificaForm.style.display = "block";
            } else {
                message.textContent = result.message || "Errore durante la ricerca.";
            }
        } catch (err) {
            message.textContent = "Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di modifica edizioni (MODIFICA)
    document.getElementById("modifica-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const message = form.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("update-collocazione-edizione").value.trim();
        const autore=document.getElementById("update-autore-edizione").value.trim();
        const titolo=document.getElementById("update-titolo-edizione").value.trim();
        if(!autore || !titolo){
            message.textContent="Errore: Autore e titolo sono campi obbligatori.";
            return;
        }
        const salvaBtn = form.querySelector('input[type="submit"]');
        message.textContent = "Aggiornamento del contenuto in corso...";
        const dati = {
            collocazione: collocazione,
            link_rism: document.getElementById("update-link_rism-edizione").value.trim(),
            autore: autore,
            titolo: titolo,
            data_str: document.getElementById("update-data_str-edizione").value.trim(),
            editore: document.getElementById("update-editore-edizione").value.trim(),
            descrizione: document.getElementById("update-descrizione-edizione").value.trim(),
            note: document.getElementById("update-note-edizione").value.trim()
        };
        try {
            const res = await fetch("/api/update-edizione", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dati)
            });
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent = result.message;
                form.reset();
                salvaBtn.disabled = true;
                const cercaForm=document.getElementById("cerca-edizione-form");
                cercaForm.querySelector('p').textContent="";
                cercaForm.reset();
            } else {
                message.textContent = result.message || "Errore durante l'aggiornamento.";
            }
        } catch (err) {
            message.textContent = "Errore di rete: impossibile raggiungere il server."
            console.error("Errore: ", err);
        }
    });

    //fetch di aggiunta stampe (INSERIMENTO)
    document.getElementById("aggiungi-stampa-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const message = form.querySelector('p');
        message.textContent = "Caricamento in corso...";
        //validazione client-side
        const collocazione = form.elements["collocazione"].value.trim();
        const autore = form.elements["autore"].value.trim();
        const titolo = form.elements["titolo"].value.trim();
        if (!collocazione || !autore || !titolo) {
            message.textContent = "Errore: Collocazione, autore e titolo sono obbligatori.";
            return;
        }
        //preparazione dati
        const formData = new FormData(form);
        try {
            const res = await fetch("/api/add-stampa", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent = result.message;
                form.reset();
            } else {
                message.textContent = result.message || "Errore durante il salvataggio.";
            }
        } catch (err) {
            message.textContent = "Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di cancellazione stampe (ELMINAZIONE)
    document.getElementById("cancella-stampa-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const collocazione=document.getElementById("delete-collocazione-stampa").value;
        const message=form.querySelector('p');
        //validazione client-side
        if(!collocazione){
            message.textContent="Errore: Collocazione non inserita."
            return;
        }
        //conferma
        if(!confirm(`Sei sicuro di voler eliminre la Stampa/Foto ${collocazione}?`)){
            return;
        }
        message.textContent = "Cancellazione in corso...";
        try{
            const res=await fetch("/api/delete-stampa", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({collocazione})
            });
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message || "Errore durante la cancellazione.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });

    //fetch di ricerca stampe (MODIFICA)
    document.getElementById("cerca-stampa-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const cercaForm=event.target;
        const message = cercaForm.querySelector('p');
        //validazione client-side
        const collocazione = document.getElementById("search-collocazione-stampa").value.trim();
        if(!collocazione){
            message.textContent="Errore: Collocazione non inserita";
            return;
        }
        const modificaForm=document.getElementById("modifica-stampa-form");
        const message2 = modificaForm.querySelector('p');
        const salvaBtn=modificaForm.querySelector('input[type="submit"]');
        message2.textContent="";
        message.textContent = "Ricerca in corso...";
        salvaBtn.disabled = true;
        modificaForm.style.display = "none";
        modificaForm.reset();
        try{
            const res= await fetch(`/api/get-stampa/${encodeURIComponent(collocazione)}`);
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent="Contenuto trovato!";
                //popolamento del form di modifica
                document.getElementById("update-collocazione-stampa").value=result.dati.collocazione;
                document.getElementById("update-autore-stampa").value=result.dati.autore;
                document.getElementById("update-titolo-stampa").value=result.dati.titolo;
                document.getElementById("update-data_str-stampa").value=result.dati.data_str || "";
                document.getElementById("update-stampa-stampa").value=result.dati.stampa || "";
                document.getElementById("update-dimensioni-stampa").value=result.dati.dimensioni || "";
                salvaBtn.disabled=false;
                modificaForm.style.display="block";
            }else{
                message.textContent=result.message || "Errore durante la ricerca.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
        }
    });

    //fetch di modifica stampe (MODIFICA)
    document.getElementById("modifica-stampa-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("update-collocazione-stampa").value.trim();
        const autore=document.getElementById("update-autore-stampa").value.trim();
        const titolo=document.getElementById("update-titolo-stampa").value.trim();
        if(!autore || !titolo){
            message.textContent="Errore: Autore e titolo sono campi obbligatori.";
            return;
        }
        const salvaBtn=form.querySelector('input[type="submit"]');
        message.textContent="Aggiornamento del contenuto in corso...";
        const dati={
            collocazione: collocazione,
            autore: autore,
            titolo: titolo,
            data_str: document.getElementById("update-data_str-stampa").value.trim(),
            stampa: document.getElementById("update-stampa-stampa").value.trim(),
            dimensioni: document.getElementById("update-dimensioni-stampa").value.trim()
        };
        try{
            const res=await fetch("/api/update-stampa", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(dati)
            });
            //gestione reindirizzamenti
            if (res.status === 403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
                salvaBtn.disabled=true;
                const cercaForm=document.getElementById("cerca-stampa-form");
                cercaForm.querySelector('p').textContent="";
                cercaForm.reset();
            }else{
                message.textContent=result.message || "Errore durante l'aggiornamento.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });

    //fetch di aggiunta eventi (INSERIMENTO)
    document.getElementById("aggiungi-evento-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        message.textContent="Caricamento in corso...";
        //validazione client-side
        const codice=form.elements["codice"].value.trim();
        const titolo=form.elements["titolo"].value.trim();
        const data_inizio=form.elements["data_inizio"].value.trim();
        const descrizione=form.elements["descrizione"].value.trim();
        if(!codice || !titolo || !data_inizio || !descrizione){
            message.textContent="Errore: Codice, titolo, data iniziale e descrizione sono obbligatori.";
            return;
        }
        //preparazione dati
        const formData= new FormData(form);
        try{
            const res=await fetch("/api/add-evento", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message || "Errore durante il salvataggio.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
        }
    });

    //data_inizio<data_fine
    document.getElementById("add-data_inizio-evento").addEventListener("change", (event)=>{
        const dataInizio=event.target.value;
        const inputDataFine=document.getElementById("add-data_fine-evento");
        inputDataFine.min=dataInizio;//setto l'attributo min per la data di fine alla data di inizio
        if(inputDataFine.value && inputDataFine.value<dataInizio){
            inputDataFine.value="";
        }
    });

    //stile input type="date"
    document.querySelectorAll('form input[type="date"]').forEach(input=>{
        input.addEventListener("change", ()=>{
            if(input.value){
                input.classList.add('has-value');
            }else{
                input.classList.remove('has-value');
            }
        });
    });
});