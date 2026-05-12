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

    //fetch per lista utenti
    document.getElementById("mostra-utenti-btn").addEventListener("click", async ()=>{
        const tabella=document.querySelector('table');
        tabella.style.display="table";
        const tbody=tabella.querySelector('tbody');
        try{
            const res=await fetch("/api/show-utenti", {
                method: "GET",
                credentials: "include"
            });
            const result=await res.json();
            //gestione reindirizzamenti
            if(res.status===403){
                window.location.href="/403.html";
                return;
            }
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
                        stringaHTML+=`
                            <td>Sistema</td>
                        `;
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
            const res=await fetch("/api/delete-utente", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: idInviato})
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
                message.textContent=result.message || "Errore durante la cancellazione.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
});