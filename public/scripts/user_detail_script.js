document.addEventListener("DOMContentLoaded", async function () {
    const body = document.body.id;
    const bodyId = ['area-riservata', 'area-editor', 'area-personale'];
    const ruoli = ['superadmin', 'admin'];
    let ruolo = null;

    //fetch per dettagli su utente
    try {
        const res = await fetch('/api/me');
        const result = await res.json();
        if (res.ok && result.success) {
            ruolo = result.utente.ruolo;//prendo il ruolo dell'utente
            document.getElementById("titolo").append(result.utente.nome);//scrivo il nome dell'utente nell'h1
            //richiamo funzioni in base al ruolo dell'utente e al tipo di pagina
            mostraBottoneAdmin();//mostro bottone per tornare all'area admin
            addUtenteForm()//gestisco ruoli per creazione utente
        }
    } catch (err) {
        console.error("Errore nell'endpoint me: ", err);
    };

    function mostraBottoneAdmin() {
        if (ruoli.includes(ruolo) && bodyId.includes(body)) {
            const div = document.getElementById('pulsantiera');
            const btn = document.createElement('a');
            btn.href = "/admin/area_admin.html";
            btn.textContent = "Area admin";
            div.prepend(btn);//inserisco all'inizio
        }
    };

    function addUtenteForm(){
        if(body==='area-admin'){
            const selectRuolo=document.getElementById("add-ruolo-utente");
            const editorOption=new Option('Editor', 'editor');//new Optioni('testo visibile', 'valore_da_inviare')
            switch(ruolo){
                case 'superadmin':
                    const adminOption=new Option('Admin', 'admin');
                    selectRuolo.add(adminOption);
                    selectRuolo.add(editorOption);
                break;
                case 'admin':
                    selectRuolo.add(editorOption);
                break;
                default:
                    //nulla
                break;
            }
        }
    };
});