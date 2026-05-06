let schermata = 1;//contatore per la schermata che sto mostrando
const righe = 5;//righe di tabella per ogni pagina
const altezzaCellaImmagine = 70;//cella imagine è alta 70px
let totaleContenuti = 0;

document.addEventListener("DOMContentLoaded", async () => {
    const precBtn = document.getElementById("prec-btn");
    const succBtn = document.getElementById("succ-btn");
    const searchBar = document.getElementById("search-bar");

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

    //barra di ricerca
    searchBar.addEventListener("input", async () => {
        schermata = 1;//torno alla prima pagina
        await caricaContenuti(schermata, righe, searchBar.value);
    });

    //funzione principale che carica contenuti dal server
    async function caricaContenuti(pagina, limite, filtro = "") {
        const tabella = document.getElementById("tabella");
        const offset = (pagina - 1) * limite;
        //costruisco URL con i parametri
        let url = `/api/show-stampe?limit=${limite}&offset=${offset}`;
        if (filtro) {
            url += `&filtro=${encodeURIComponent(filtro)}`;
        }
        try {
            const res = await fetch(url);
            const result = await res.json();
            if (!result.success) {
                tabella.innerHTML = "<tr><td colspan='4'>" + result.message + "</td></tr>";
                totaleContenuti = 0;
                mostraPagina([], 0)//aggiorno visualizzazione
                return;
            }
            //aggiornamento contenuti
            totaleContenuti = result.totali;
            mostraPagina(result.contenuti, result.totali);
        } catch (err) {
            tabella.innerHTML = "<tr><td colspan='4'>Errore di rete</td></tr>";
            totaleContenuti = 0;
            mostraPagina([], 0)
        }
    }

    function mostraPagina(lista_da_mostrare, totale) {
        const tabella = document.getElementById("tabella");
        const tab = document.querySelector('.lista-contenuti table');
        tabella.innerHTML = "";
        lista_da_mostrare.forEach(stampa => {
            const tr = document.createElement("tr");
            const tdCollocazione = document.createElement("td");
            tdCollocazione.textContent = stampa.collocazione;
            const tdAutore = document.createElement("td");
            tdAutore.textContent = stampa.autore;
            const tdTitolo = document.createElement("td");
            tdTitolo.textContent = stampa.titolo;
            //GESTIONE COLONNA IMMAGINE
            const tdImmagine = document.createElement("td");
            if (stampa.url_immagine) {
                const img = document.createElement("img");
                const miniaturaUrl = stampa.url_immagine.replace('/upload/', '/upload/w_100,c_thumb/');//w_100,c_thumb servono per scaricare l'immagine in versione miniatura
                img.src = miniaturaUrl;
                img.alt = `Copertina di ${stampa.titolo}`;
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
                window.location.href = `/stampa.html?collocazione=${encodeURIComponent(stampa.collocazione)}`;
            });
            tabella.appendChild(tr);
        });
        //adatto tabella al contenuto
        tabella.style.height = `${tabella.rows.length*altezzaCellaImmagine}px`;
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
    }
});
