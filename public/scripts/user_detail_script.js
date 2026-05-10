document.addEventListener("DOMContentLoaded", async function () {
    const titolo=document.title;
    const titoli=['Area riservata | Archivio musicale Luca Moretti', 'Area editor | Archivio musicale Luca Moretti'];
    const ruoli=['superadmin', 'admin'];
    //fetch per dettagli su utente
    try{
        const res=await fetch('/api/me');
        const result=await res.json();
        if(res.ok && result.success){
            const ruolo=result.utente.ruolo;
            document.getElementById("titolo").append(result.utente.nome);
            if(ruoli.includes(ruolo) && titoli.includes(titolo)){
                mostraBottoneAdmin();
            }
        }
    }catch(err){
        console.error("Errore nell'endpoint me: ", err);
    };

    function mostraBottoneAdmin(){
        const div=document.querySelector('main').querySelector('div');
        const btn=document.createElement('a');
        btn.href="/admin/area_admin.html";
        btn.textContent="Area admin";
        div.prepend(btn);//inserisco all'inizio
    };
});