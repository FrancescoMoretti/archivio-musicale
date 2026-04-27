window.onload=async function() {
    //gestione form con radio button
    const radioBtn=document.querySelectorAll('input[name="tipo-form"]');
    radioBtn.forEach(btn=>{
        btn.addEventListener("change", function(){
            document.getElementById("aggiungi-edizioni-form").style.display="none";
            const selected=document.querySelector('input[name="tipo-form"]:checked').value;
            switch(selected){
                case '1':
                    document.getElementById("aggiungi-edizioni-form").style.display="block";
                    break;
            }
        });
    });

    //fetch di aggiunta edizioni
    document.getElementById("edizione-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=document.getElementById("message1");
        message.style.visibility="visible";
        message.textContent="Caricamento in corso...";
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
            if(res.ok){
                message.textContent=result.message;
                form.reset();
            }else{
                message.textContent=result.message||"Errore durante il salvataggio";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server."
        }
    });
};