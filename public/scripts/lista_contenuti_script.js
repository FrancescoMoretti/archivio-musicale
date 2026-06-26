let schermata=1;//contatore per la schermata che sto mostrando
const righe=5;//righe di tabella per ogni pagina
const altezzaCellaImmagine=4.3;//cella imagine è alta 4.3em
let timeoutRicerca=null;

document.addEventListener("DOMContentLoaded", async ()=>{
    //elementi variabili
    const idBody=document.querySelector('body').id;
    let endpoint=null;
    let paginaContenuto=null;
    switch(idBody){
        case 'lista-edizioni':
            endpoint="/api/edizioni";
            paginaContenuto="/edizione.html";
        break;
        case 'lista-stampe':
            endpoint="/api/stampe";
            paginaContenuto="/stampa.html";
        break;
        default:
            console.error("Errore: pagina non riconosciuta.");
            return;
        break;
    }

    //elementi fissi
    const precBtn=document.getElementById("prec-btn");
    const succBtn=document.getElementById("succ-btn");
    const searchBar=document.getElementById("search-bar");
    const tbody=document.querySelector('tbody');

    //chiamata iniziale
    await caricaContenuti();

    //gestione bottone precedente
    precBtn.addEventListener("click", async () => {//se non sono alla prima pagina posso andare indietro
        if (schermata > 1) {
            schermata--;
            await caricaContenuti();
        }
    });

    //gestione bottone successivo
    succBtn.addEventListener("click", async () => {
        schermata++;
        await caricaContenuti();
    });

    //gestione barra di ricerca
    searchBar.addEventListener("input", async () => {
        clearTimeout(timeoutRicerca);//se l'utente sta ancora scrivendo cancello il timer
        timeoutRicerca=setTimeout(async ()=>{
            schermata=1;//torno alla prima pagina
            await caricaContenuti();
        }, 300);//prima di eseguire aspetto 300ms
    });

    //funzione principale che carica contenuti dal server
    async function caricaContenuti() {
        const offset=(schermata - 1) * righe;
        //costruisco URL con i parametri
        let url=`${endpoint}?limit=${righe}&offset=${offset}`;
        if (searchBar.value) {
            url+=`&filtro=${encodeURIComponent(searchBar.value)}`;
        }
        try {
            const res=await fetch(url);
            const result=await res.json();
            //aggiornamento contenuti
            if(res.ok && result.success){
                mostraPagina(result.contenuti, result.totali);
            }else{
                tbody.innerHTML="<tr><td colspan='3'>"+result.message+"</td></tr>";
                precBtn.style.visibility="hidden";
                succBtn.style.visibility="hidden";
                return;
            }
        } catch (err) {
            tbody.innerHTML="<tr><td colspan='3'>Errore di rete</td></tr>";
            console.error(err);
            precBtn.style.visibility="hidden";
            succBtn.style.visibility="hidden";
        }
    };

    function mostraPagina(lista_da_mostrare, totale) {
        tbody.innerHTML="";
        //se non ci sono elementi da mostrare
        if(lista_da_mostrare.length===0){
            tbody.innerHTML="<tr><td colspan='3'>Nessun contenuto trovato.</td></tr>";
            precBtn.style.visibility="hidden";
            succBtn.style.visibility="hidden";
            tbody.style.height="auto";
            return;
        }
        lista_da_mostrare.forEach(contenuto=>{
            const tr=document.createElement("tr");
            const tdAutore=document.createElement("td");
            tdAutore.textContent=contenuto.autore;
            const tdTitolo=document.createElement("td");
            let titolo=contenuto.titolo;
            if(titolo.length>10){
                titolo=titolo.slice(0, 25)+"...";
            }
            //aggiungo link per SEO
            const linkTitolo=document.createElement("a");
            linkTitolo.href=`${paginaContenuto}?collocazione=${encodeURIComponent(contenuto.collocazione)}`;
            linkTitolo.textContent=titolo;
            tdTitolo.appendChild(linkTitolo);
            //GESTIONE COLONNA IMMAGINE
            const tdImmagine=document.createElement("td");
            if (contenuto.url_immagine) {
                const img=document.createElement("img");
                const miniaturaUrl=contenuto.url_immagine.replace('/upload/', '/upload/w_100,c_thumb/');//w_100,c_thumb servono per scaricare l'immagine in versione miniatura
                img.src=miniaturaUrl;
                img.alt=`Copertina di ${contenuto.titolo}`;
                img.loading="lazy";
                tdImmagine.appendChild(img);
            } else {
                tdImmagine.className="no-img";
                tdImmagine.textContent="No Img";
            }
            tr.appendChild(tdAutore);
            tr.appendChild(tdTitolo);
            tr.appendChild(tdImmagine);
            tr.addEventListener("click", ()=>{
                window.location.href=`${paginaContenuto}?collocazione=${encodeURIComponent(contenuto.collocazione)}`;
            });
            tbody.appendChild(tr);
        });
        //adatto tabella al contenuto
        tbody.style.height=`${tbody.rows.length*altezzaCellaImmagine}em`;
        //aggiorno indice pagina
        document.getElementById("schermata").textContent=`Pagina ${schermata}`;
        //gestione bottoni
        const paginaCorrente=(schermata-1)*righe;
        if (schermata===1) {
            precBtn.style.visibility="hidden";
        } else {
            precBtn.style.visibility="visible";
        }
        if (paginaCorrente+righe>=totale) {
            succBtn.style.visibility="hidden";
        } else {
            succBtn.style.visibility="visible";
        }
    };
});