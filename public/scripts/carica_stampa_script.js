document.addEventListener("DOMContentLoaded", async function caricaStampa() {
    const params = new URLSearchParams(window.location.search);
    const collocazione = params.get("collocazione");
    const titolo=document.getElementById("titolo");
    const scheda = document.getElementById("scheda");
    const immaginiDiv = document.getElementById("immagini");
    //collocazione non specificata o non valida
    if (!collocazione || collocazione.trim()==="") {
        window.location.href = "/404.html";
        return;
    }
    try {
        const res = await fetch(`/api/stampa/${encodeURIComponent(collocazione)}`);
        const result = await res.json();
        //contenuto non trovato
        if (!res.ok || !result.success) {
            window.location.href = "/404.html";
            return;
        }
        const contenuto = result.content;//dati della risorsa
        const listaImmagini = result.immagini || [];//array di URL a cloudinary
        //cambio il titolo della pagina per SEO
        document.title=`${contenuto.titolo} - ${contenuto.autore} | Archivio musicale Luca Moretti`;
        //costruzione meta descrizione
        let metaTesto=`${contenuto.titolo} di ${contenuto.autore}`;
        if(contenuto.data_str){
            metaTesto+=`, ${contenuto.data_str}`;
        }
        if(contenuto.stampa){
            metaTesto+=`. Tecnica: ${contenuto.stampa}`;
        }
        if(contenuto.dimensioni){
            metaTesto+=`. Dimensioni: ${contenuto.dimensioni}.`;
        }
        //pulizia degli spazi e limite a 160 caratteri
        metaTesto=metaTesto.replace(/\s+/g, ' ').trim();
        if(metaTesto.length>160){
            metaTesto=metaTesto.substring(0, 157).trim()+"...";
        }
        //creazione e iniezione del tag <meta name="description"...>
        let metaDescrizione=document.createElement('meta');
        metaDescrizione.name="description";
        metaDescrizione.content=metaTesto;
        document.head.appendChild(metaDescrizione);
        //popolazione della scheda dell'articolo
        titolo.textContent=contenuto.titolo;
        let stringaHTML=`
            <ul>
                <li><span>Autore</span>: ${escapeHTML(contenuto.autore)}</li>
        `;
        if(contenuto.collocazione){
            stringaHTML+=`<li><span>Collocazione</span>: ${escapeHTML(contenuto.collocazione)}</li>`;
        }
        if(contenuto.data_str){
            stringaHTML+=`<li><span>Data</span>: ${escapeHTML(contenuto.data_str)}</li>`;
        }
        if(contenuto.stampa){
            stringaHTML+=`<li><span>Stampa</span>: ${escapeHTML(contenuto.stampa)}</li>`;
        }
        if(contenuto.dimensioni){
            stringaHTML+=`<li><span>Dimensioni</span>: ${escapeHTML(contenuto.dimensioni)}</li>`;
        }
        stringaHTML+=`</ul>`;
        scheda.innerHTML=stringaHTML;
        //gestione delle immagini
        const n_immagini=listaImmagini.length;
        //se ho una sola immagine la metto come immagine
        if (n_immagini===1) {
            immaginiDiv.innerHTML=`<img src="${escapeHTML(listaImmagini[0])}" alt="Immagine di ${escapeHTML(contenuto.titolo)}">`;
        } else if (n_immagini>1){
            immaginiDiv.innerHTML=`
                <div id="slider">
                    <div id="slider-track">
                        ${listaImmagini.map(url=>`<img class="slide" src="${escapeHTML(url)}" alt="Immagine di ${escapeHTML(contenuto.titolo)}">`).join("")}
                    </div>
                </div>
            `;
            inizializzaSlider();
        }
        //mostro la sezione con la scheda
        document.querySelector('main.articolo').style.visibility = "visible";
    } catch (err) {
        //console.error("Errore nel caricamento della stampa: ", err);
    }
});