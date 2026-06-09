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
            console.error(err);
        }
    });

    //fetch di cancellazione edizioni (ELIMINAZIONE)
    document.getElementById("cancella-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("delete-collocazione-edizione").value.trim();
        if (!collocazione){
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
            console.error(err);
        }
    });

    //fetch di ricerca edizioni (MODIFICA)
    document.getElementById("cerca-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const cercaForm=event.target;
        const message=cercaForm.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("search-collocazione-edizione").value.trim();
        if(!collocazione){
            message.textContent="Errore: Collocazione non inserita."
            return;
        }
        const modificaForm=document.getElementById("modifica-edizione-form");
        const message2=modificaForm.querySelector('p');
        const salvaBtn=modificaForm.querySelector('input[type="submit"]');
        message2.textContent="";
        message.textContent="Ricerca in corso...";
        salvaBtn.disabled=true;
        modificaForm.style.display="none";
        modificaForm.reset();
        try {
            const res=await fetch(`/api/get-edizione/${encodeURIComponent(collocazione)}`);
            //gestione reindirizzamenti
            if (res.status===403) {
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if (res.ok && result.success) {
                message.textContent="Contenuto trovato!";
                //popolamento del form di modifica
                document.getElementById("update-collocazione-edizione").value=result.dati.collocazione;
                document.getElementById("update-link_rism-edizione").value=result.dati.link_rism || "";
                document.getElementById("update-autore-edizione").value=result.dati.autore;
                document.getElementById("update-titolo-edizione").value=result.dati.titolo;
                document.getElementById("update-data_str-edizione").value=result.dati.data_str || "";
                document.getElementById("update-editore-edizione").value=result.dati.editore || "";
                document.getElementById("update-descrizione-edizione").value=result.dati.descrizione || "";
                document.getElementById("update-note-edizione").value=result.dati.note || "";
                salvaBtn.disabled = false;
                modificaForm.style.display="block";
            } else {
                message.textContent=result.message || "Errore durante la ricerca.";
            }
        } catch (err) {
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch di modifica edizioni (MODIFICA)
    document.getElementById("modifica-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
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
            console.error(err);
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
            console.error(err);
        }
    });

    //fetch di cancellazione stampe (ELMINAZIONE)
    document.getElementById("cancella-stampa-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("delete-collocazione-stampa").value.trim();
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
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch di ricerca stampe (MODIFICA)
    document.getElementById("cerca-stampa-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const cercaForm=event.target;
        const message=cercaForm.querySelector('p');
        //validazione client-side
        const collocazione=document.getElementById("search-collocazione-stampa").value.trim();
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
            console.error(err);
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
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch di aggiunta eventi (INSERIMENTO)
    document.getElementById("aggiungi-evento-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const codice=form.elements["codice"].value.trim();
        const titolo=form.elements["titolo"].value.trim();
        const dataInizio=form.elements["data_inizio"].value.trim();
        const descrizione=form.elements["descrizione"].value.trim();
        if(!codice || !titolo || !dataInizio || !descrizione){
            message.textContent="Errore: Codice, titolo, data iniziale e descrizione sono obbligatori.";
            return;
        }
        const immagini=form.elements["immagini"].files;
        if(immagini.length>2){
            message.textContent="Errore: Puoi caricare al massimo 2 immagini per evento.";
            return;
        }
        message.textContent="Caricamento in corso...";
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
            console.error(err);
        }
    });

    //fetch di cancellazione eventi (ELIMINAZIONE)
    document.getElementById("cancella-evento-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const codice=document.getElementById("delete-codice-evento").value.trim();
        if(!codice){
            message.textContent="Errore: Codice non inserito."
            return;
        }
        //conferma
        if(!confirm(`Sei sicuro di voler eliminare l'evento ${codice}?`)){
            return;
        }
        message.textContent="Cancellazione in corso...";
        try{
            const res=await fetch("/api/delete-evento", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({codice})
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
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch di ricerca eventi (MODIFICA)
    document.getElementById("cerca-evento-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const codice=document.getElementById("search-codice-evento").value.trim();
        if(!codice){
            message.textContent="Errore: Codice non inserito.";
            return;
        }
        const modificaForm=document.getElementById("modifica-evento-form");
        const message2=modificaForm.querySelector('p');
        const salvaBtn=modificaForm.querySelector('input[type="submit"]');
        message2.textContent="";
        message.textContent="Ricerca in corso...";
        salvaBtn.disabled=true;
        modificaForm.style.display="none";
        modificaForm.reset();
        try{
            const res=await fetch(`/api/get-evento/${encodeURIComponent(codice)}`);
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent="Evento trovato!";
                //popolamento del form di modifica
                document.getElementById("update-codice-evento").value=result.dati.codice;
                document.getElementById("update-link_evento-evento").value=result.dati.link_evento || "";
                document.getElementById("update-link_fb-evento").value=result.dati.link_facebook || "";
                document.getElementById("update-link_ig-evento").value=result.dati.link_instagram || "";
                document.getElementById("update-titolo-evento").value=result.dati.titolo;
                document.getElementById("update-data_inizio-evento").value=result.dati.data_inizio.split('T')[0];
                document.getElementById("update-data_inizio-evento").classList.add('has-value');
                if(result.dati.data_fine){
                    document.getElementById("update-data_fine-evento").value=result.dati.data_fine.split('T')[0];
                    document.getElementById("update-data_fine-evento").classList.add('has-value');
                }else{
                    document.getElementById("update-data_fine-evento").value="";
                }
                document.getElementById("update-data_fine-evento").min=result.dati.data_inizio.split('T')[0];//imposto data minima come la data di inizio
                document.getElementById("update-descrizione-evento").value=result.dati.descrizione;
                salvaBtn.disabled=false;
                modificaForm.style.display="block";
            }else{
                message.textContent=result.message || "Errore durante la ricerca.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch di modifica eventi (MODIFICA)
    document.getElementById("modifica-evento-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form .querySelector('p');
        //validazione client-side
        const codice=document.getElementById("update-codice-evento").value.trim();
        const titolo=document.getElementById("update-titolo-evento").value.trim();
        const dataInizio=document.getElementById("update-data_inizio-evento").value.trim();
        const descrizione=document.getElementById("update-descrizione-evento").value.trim();
        if(!titolo || !dataInizio || !descrizione){
            message.textContent="Errore: Titolo, data iniziale e descrizione sono campi obbligatori."
            return;
        }
        const salvaBtn=form.querySelector('input[type="submit"]');
        message.textContent="Aggiornamento del contenuto in corso...";
        const dati={
            codice: codice,
            link_evento: document.getElementById("update-link_evento-evento").value.trim(),
            link_facebook: document.getElementById("update-link_fb-evento").value.trim(),
            link_instagram: document.getElementById("update-link_ig-evento").value.trim(),
            titolo: titolo,
            data_inizio: dataInizio,
            data_fine: document.getElementById("update-data_fine-evento").value.trim(),
            descrizione: descrizione
        };
        try{
            const res=await fetch("/api/update-evento", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(dati)
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
                salvaBtn.disabled=true;
                const cercaForm=document.getElementById("cerca-evento-form");
                cercaForm.querySelector('p').textContent="";
                cercaForm.reset();
            }else{
                message.textContent=result.message || "Errore durante l'aggiornamento.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //data_inizio<data_fine
    function integritaDate(event){
        const inputInizio=event.target;//input type="date"
        const dataInizio=inputInizio.value;
        //risalgo al prefisso dell'id input
        let prefisso="";
        if(inputInizio.id.startsWith("add-")){
            prefisso="add";
        }else if(inputInizio.id.startsWith("update-")){
            prefisso="update"
        }
        const inputFine=document.getElementById(`${prefisso}-data_fine-evento`);
        inputFine.min=dataInizio;
        //se data inizio diventa antecedente alla data finale=>svuoto la data finale
        if(inputFine.value && inputFine.value<dataInizio){
            inputFine.value="";
            inputFine.classList.remove("has-value");
        }
    };

    ["add-data_inizio-evento", "update-data_inizio-evento"].forEach(id=>{
        document.getElementById(id).addEventListener("change", integritaDate);
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