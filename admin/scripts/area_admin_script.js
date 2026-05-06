window.onload = async function () {
    //gestione form con radio button
    const radioBtn = document.querySelectorAll('input[name="tipo-form"]');
    radioBtn.forEach(btn => {
        btn.addEventListener("change", function () {
            document.getElementById("edizione-grid").style.display = "none";
            document.getElementById("stampa-grid").style.display = "none";
            const selected = document.querySelector('input[name="tipo-form"]:checked').value;
            switch (selected) {
                case '1':
                    document.getElementById("edizione-grid").style.display="grid";
                    break;
                case '2':
                    document.getElementById("stampa-grid").style.display="grid";
                    break;
            }
        });
    });

    //fetch di aggiunta edizioni (INSERIMENTO)
    document.getElementById("aggiungi-edizione-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const message = form.querySelector('p');
        message.textContent = "Caricamento in corso...";
        message.style.visibility = "visible";
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
            const res = await fetch("/api/add-edizione", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            const result = await res.json();
            //gestione reindirizzamenti
            if (res.status === 401) {
                window.location.href = "/login.html";
                return;
            }
            if (res.status === 403) {
                window.location.href = "/403.html";
                return;
            }
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
        const collocazione = document.getElementById("delete-collocazione-edizione").value;
        const message = form.querySelector('p');
        //validazione client-side
        if (!collocazione) {
            message.textContent = "Errore: Collocazione non inserita."
            message.style.visibility = "visible";
            return;
        }
        //conferma
        if (!confirm(`Sei sicuro di voler eliminare l'Edizione/Manoscritto ${collocazione}?`)) {
            return;
        }
        message.textContent = "Cancellazione in corso...";
        message.style.visibility = "visible";
        try {
            const res = await fetch("/api/delete-edizione", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collocazione })
            });
            const result = await res.json();
            //gestione reindirizzamenti
            if (res.status === 401) {
                window.location.href = "/login.html";
                return;
            }
            if (res.status === 403) {
                window.location.href = "/403.html";
                return;
            }
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
        const modificaForm = document.getElementById("modifica-edizione-form");
        const salvaBtn = modificaForm.querySelector('input[type="submit"]');
        const collocazione = document.getElementById("search-collocazione-edizione").value;
        const message = cercaForm.querySelector('p');
        const message2 = modificaForm.querySelector('p');
        message2.style.visibility="hidden";
        message.textContent = "Ricerca in corso...";
        message.style.visibility = "visible";
        salvaBtn.disabled = true;
        modificaForm.style.display = "none";
        modificaForm.reset();
        try {
            const res = await fetch(`/api/get-edizione/${encodeURIComponent(collocazione)}`);
            const result = await res.json();
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
        const salvaBtn = form.querySelector('input[type="submit"]');
        message.textContent = "Aggiornamento del contenuto in corso...";
        message.style.visibility = "visible";
        const dati = {
            collocazione: document.getElementById("update-collocazione-edizione").value,
            link_rism: document.getElementById("update-link_rism-edizione").value,
            autore: document.getElementById("update-autore-edizione").value,
            titolo: document.getElementById("update-titolo-edizione").value,
            data_str: document.getElementById("update-data_str-edizione").value,
            editore: document.getElementById("update-editore-edizione").value,
            descrizione: document.getElementById("update-descrizione-edizione").value,
            note: document.getElementById("update-note-edizione").value
        };
        try {
            const res = await fetch("/api/update-edizione", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dati)
            });
            const result = await res.json();
            if (res.ok && result.success) {
                message.textContent = result.message;
                form.reset();
                salvaBtn.disabled = true;
                const cercaForm=document.getElementById("cerca-edizione-form");
                cercaForm.querySelector('p').style.visibility="hidden";
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
        message.style.visibility = "visible";
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
            const result = await res.json();
            //gestione reindirizzamenti
            if (res.status === 401) {
                window.location.href = "/login.html";
                return;
            }
            if (res.status === 403) {
                window.location.href = "/403.html";
                return;
            }
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
            message.style.visibility="visible";
            return;
        }
        //conferma
        if(!confirm(`Sei sicuro di voler eliminre la Stampa/Foto ${collocazione}?`)){
            return;
        }
        message.textContent = "Cancellazione in corso...";
        message.style.visibility = "visible";
        try{
            const res=await fetch("/api/delete-stampa", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({collocazione})
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
        const modificaForm=document.getElementById("modifica-stampa-form");
        const salvaBtn=modificaForm.querySelector('input[type="submit"]');
        const collocazione = document.getElementById("search-collocazione-stampa").value;
        const message = cercaForm.querySelector('p');
        const message2 = modificaForm.querySelector('p');
        message2.style.visibility="hidden";
        message.textContent = "Ricerca in corso...";
        message.style.visibility = "visible";
        salvaBtn.disabled = true;
        modificaForm.style.display = "none";
        modificaForm.reset();
        try{
            const res= await fetch(`/api/get-stampa/${encodeURIComponent(collocazione)}`);
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
    document.getElementById("modifica-stampa-form").addEventListener("submit", async(event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        const salvaBtn=form.querySelector('input[type="submit"]');
        message.textContent="Aggiornamento del contenuto in corso...";
        message.style.visibility="visible";
        const dati={
            collocazione: document.getElementById("update-collocazione-stampa").value,
            autore: document.getElementById("update-autore-stampa").value,
            titolo: document.getElementById("update-titolo-stampa").value,
            data_str: document.getElementById("update-data_str-stampa").value,
            stampa: document.getElementById("update-stampa-stampa").value,
            dimensioni: document.getElementById("update-dimensioni-stampa").value
        };
        try{
            const res=await fetch("/api/update-stampa", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(dati)
            });
            const result=await res.json();
            if(res.ok && result.success){
                message.textContent=result.message;
                form.reset();
                salvaBtn.disabled=true;
                const cercaForm=document.getElementById("cerca-stampa-form");
                cercaForm.querySelector('p').style.visibility="hidden";
                cercaForm.reset();
            }else{
                message.textContent=result.message || "Errore durante l'aggiornamento.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
};