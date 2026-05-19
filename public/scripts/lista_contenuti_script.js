let schermata = 1;//contatore per la schermata che sto mostrando
const righe = 5;//righe di tabella per ogni pagina
const altezzaCellaImmagine = 70;//cella imagine è alta 70px
let totaleContenuti = 0;
let timeoutRicerca=null;

document.addEventListener("DOMContentLoaded", async ()=>{
    //elementi variabili
    const idBody=document.querySelector('body').id;
    let endpoint=null;
    let paginaContenuto=null;
    switch(idBody){
        case 'lista-edizioni':
            endpoint="/api/show-edizioni";
            paginaContenuto="/edizione.html";
        break;
        case 'lista-stampe':
            endpoint="/api/show-stampe";
            paginaContenuto="/stampa.html";
        break;
        default:
            console.error("Errore: pagina non riconosciuta.");
            return;
        break;
    }

    //elementi fissi
    const precBtn = document.getElementById("prec-btn");
    const succBtn = document.getElementById("succ-btn");
    const searchBar = document.getElementById("search-bar");
    const tbody=document.querySelector('tbody');

    //chiamata iniziale
    await caricaContenuti(schermata, righe, searchBar.value);

    //gestione bottone precedente
    precBtn.addEventListener("click", async () => {//se non sono alla prima pagina posso andare indietro
        if (schermata > 1) {
            schermata--;
            await caricaContenuti(schermata, righe, searchBar.value);
        }
    });

    //gestione bottone successivo
    succBtn.addEventListener("click", async () => {
        schermata++;
        await caricaContenuti(schermata, righe, searchBar.value);
    });

    //gestione barra di ricerca
    searchBar.addEventListener("input", async () => {
        clearTimeout(timeoutRicerca);//se l'utente sta ancora scrivendo cancello il timer
        timeoutRicerca=setTimeout(async ()=>{
            schermata = 1;//torno alla prima pagina
            await caricaContenuti(schermata, righe, searchBar.value);
        }, 300);//prima di eseguire aspetto 300ms
    });

    //funzione principale che carica contenuti dal server
    async function caricaContenuti(pagina, limite, filtro = "") {
        const offset = (pagina - 1) * limite;
        //costruisco URL con i parametri
        let url = `${endpoint}?limit=${limite}&offset=${offset}`;
        if (filtro) {
            url += `&filtro=${encodeURIComponent(filtro)}`;
        }
        try {
            const res = await fetch(url);
            const result = await res.json();
            //aggiornamento contenuti
            if(res.ok && result.success){
                totaleContenuti = result.totali;
                mostraPagina(result.contenuti, result.totali);
            }else{
                tbody.innerHTML = "<tr><td colspan='4'>" + result.message + "</td></tr>";
                totaleContenuti = 0;
                //mostraPagina([], 0)//aggiorno visualizzazione
                precBtn.style.visibility="hidden";
                succBtn.style.visibility="hidden";
                return;
            }
        } catch (err) {
            tbody.innerHTML = "<tr><td colspan='4'>Errore di rete</td></tr>";
            totaleContenuti = 0;
            //mostraPagina([], 0)
            precBtn.style.visibility="hidden";
            succBtn.style.visibility="hidden";
        }
    };

    function mostraPagina(lista_da_mostrare, totale) {
        tbody.innerHTML = "";
        lista_da_mostrare.forEach(contenuto => {
            const tr = document.createElement("tr");
            const tdCollocazione = document.createElement("td");
            tdCollocazione.textContent = contenuto.collocazione;
            const tdAutore = document.createElement("td");
            tdAutore.textContent = contenuto.autore;
            const tdTitolo = document.createElement("td");
            //aggiungo link per SEO
            const linkTitolo=document.createElement("a");
            linkTitolo.href=`${paginaContenuto}?collocazione=${encodeURIComponent(contenuto.collocazione)}`;
            linkTitolo.textContent=contenuto.titolo;
            tdTitolo.appendChild(linkTitolo);
            //GESTIONE COLONNA IMMAGINE
            const tdImmagine = document.createElement("td");
            if (contenuto.url_immagine) {
                const img = document.createElement("img");
                const miniaturaUrl = contenuto.url_immagine.replace('/upload/', '/upload/w_100,c_thumb/');//w_100,c_thumb servono per scaricare l'immagine in versione miniatura
                img.src = miniaturaUrl;
                img.alt = `Copertina di ${contenuto.titolo}`;
                img.loading = "lazy";
                tdImmagine.appendChild(img);
            } else {
                tdImmagine.className="no-img";
                tdImmagine.textContent = "No Img";
            }
            tr.appendChild(tdCollocazione);
            tr.appendChild(tdAutore);
            tr.appendChild(tdTitolo);
            tr.appendChild(tdImmagine);
            tr.addEventListener("click", () => {
                window.location.href = `${paginaContenuto}?collocazione=${encodeURIComponent(contenuto.collocazione)}`;
            });
            tbody.appendChild(tr);
        });
        //adatto tabella al contenuto
        tbody.style.height = `${tbody.rows.length*altezzaCellaImmagine}px`;
        //aggiorno indice pagina
        document.getElementById("schermata").textContent = `Pagina ${schermata}`;
        //gestione bottoni
        const paginaCorrente = (schermata - 1) * righe;
        if (schermata === 1) {
            precBtn.style.visibility = "hidden";
        } else {
            precBtn.style.visibility = "visible";
        }
        if (paginaCorrente + righe >= totale) {
            succBtn.style.visibility = "hidden";
        } else {
            succBtn.style.visibility = "visible";
        }
    };
});