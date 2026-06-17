document.addEventListener("DOMContentLoaded", function(){
    //gestione form con radio button
    const radioBtn = document.querySelectorAll('input[name="tipo-form"');
    radioBtn.forEach(btn=>{
        btn.addEventListener("change", function(){
            document.getElementById("utenti-grid").style.display="none";
            document.getElementById("monitoraggio-grid").style.display="none";
            const selected=document.querySelector('input[name="tipo-form"]:checked').value;
            switch(selected){
                case '1':
                    document.getElementById("utenti-grid").style.display="grid";
                break;
                case '2':
                    document.getElementById("monitoraggio-grid").style.display="grid";
                break;
            }
        });
    });
    
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
        const password=form.elements["password"].value;
        if(!nome || !ruolo || !email || !password || !String(password).trim()){
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
            const res=await fetch("/api/utente", {
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
            }else{
                message.textContent=result.message || "Errore durante il salvataggio.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });

    //fetch per lista utenti
    document.getElementById("mostra-utenti-btn").addEventListener("click", async ()=>{
        const tabella=document.getElementById("utenti-grid").querySelector('table');
        tabella.style.display="table";
        const tbody=tabella.querySelector('tbody');
        try{
            const res=await fetch("/api/utenti", {
                method: "GET",
                credentials: "include"
            });
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            //aggiornamento contenuti
            if(res.ok && result.success){
                tbody.innerHTML="";//pulisco tabella
                result.utenti.forEach(utente => {
                    const riga=document.createElement('tr');//creo riga
                    const dataLocale=new Date(utente.created_at).toLocaleDateString('it-IT');//formattazione della data
                    let stringaHTML=`
                        <td>${utente.id}</td>
                        <td>${utente.email}</td>
                        <td>${utente.nome}</td>
                        <td>${utente.ruolo}</td>
                        <td>${dataLocale}</td>
                    `;
                    if(utente.email_creatore){
                        stringaHTML+=`
                            <td>${utente.email_creatore}</td>
                        `;
                    }else{
                        if(utente.ruolo==='superadmin'){
                            stringaHTML+=`
                                <td>Sistema</td>
                            `;
                        }else{
                            stringaHTML+=`
                                <td>Utente eliminato</td>
                            `;
                        }
                    }
                    riga.innerHTML=stringaHTML;
                    tbody.appendChild(riga);
                });
            }else{
                tbody.innerHTML = "<tr><td colspan='6'>" + result.message + "</td></tr>";
                return;
            }
        }catch(err){
            tbody.innerHTML = "<tr><td colspan='6'>Errore di rete: impossibile raggiungere il server.</td></tr>";
            console.error(err);
        }
    });

    //fetch per cancellazione utente
    document.getElementById("cancella-utente-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        //validazione client-side
        const id=document.getElementById("delete-id-utente").value.trim();
        if(!id || isNaN(id) || id<=0){
            message.textContent="Errore: Identificativo non valido."
            return;
        }
        //conferma
        if(!confirm(`Sei sicuro di voler eliminare l'utente ${id}?`)){
            return;
        }
        message.textContent="Cancellazione in corso";
        const idInviato=parseInt(id, 10);
        try{
            const res=await fetch(`/api/utente/${encodeURIComponent(idInviato)}`, {
                method: "DELETE",
                credentials: "include",
                headers: {"Content-Type": "application/json"}
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

    //fetch per monitoraggio contenuti
    document.getElementById("monitoraggio-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const tabella=document.getElementById("monitoraggio-grid").querySelector('table');
        tabella.style.display="table";
        const tbody=tabella.querySelector("tbody");
        const filtro=document.getElementById("search-bar").value;
        //validazione client-side
        if(!filtro || !filtro.trim()){
            tbody.innerHTML="<tr><td colspan='7'>Cerca un contenuto o un utente.</td></tr>";
            return;
        }
        
        try{
            //metto il filtro nei parametri dell'url
            const res=await fetch(`/api/monitor-contenuti?filtro=${encodeURIComponent(filtro)}`, {
                method: "GET",
                credentials: "include",
            });
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
            const result=await res.json();
            //aggiorno contenuti
            if(res.ok && result.success){
                tbody.innerHTML="";//pulisco tabella
                result.contenuti.forEach(contenuto=>{
                    const riga=document.createElement('tr');//creo riga
                    const dataCreazione=new Date(contenuto.created_at).toLocaleDateString('it-IT');//formattazione della data
                    let stringaHTML=`
                        <td>${contenuto.collocazione}</td>
                        <td>${contenuto.titolo}</td>
                        <td>${contenuto.autore}</td>
                        <td>${dataCreazione}</td>
                    `;
                    //utente creatore
                    if(contenuto.created_by){
                        stringaHTML+=`<td>${contenuto.created_by}</td>`;
                    }else{
                        stringaHTML+=`<td>Utente eliminato</td>`;
                    }
                    //data e utente di modifica
                    if(contenuto.updated_at!==contenuto.created_at){
                        //se è stato modificato dopo la creazione
                        const dataModifica=new Date(contenuto.updated_at).toLocaleDateString('it-IT');//formattazione della data
                        stringaHTML+=`<td>${dataModifica}</td>`;
                        if(contenuto.updated_by){
                            //se esiste l'utente che ha fatto la modifica
                            stringaHTML+=`<td>${contenuto.updated_by}</td>`;
                        }else{
                            //se non esiste più l'utente che ha fatto la modifica
                            stringaHTML+=`<td>Utente eliminato</td>`;
                        }
                    }else{
                        //se non è mai stato modificato dopo la creazione
                        stringaHTML+=`
                            <td>/</td>
                            <td>/</td>
                        `;
                    }
                    riga.innerHTML=stringaHTML;
                    tbody.appendChild(riga);
                });
            }else{
                tbody.innerHTML="<tr><td colspan='7'>"+result.message+"</td></tr>";
                return;
            }
        }catch(err){
            tbody.innerHTML="<tr><td colspan='7'>Errore di rete: impossibile raggiungere il server.</td></tr>";
            console.error(err);
        }
    });
});