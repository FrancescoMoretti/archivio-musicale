document.addEventListener("DOMContentLoaded", async function caricaEdizione() {
    const params=new URLSearchParams(window.location.search);
    const collocazione=params.get("collocazione");
    const scheda=document.getElementById("scheda");
    const immaginiDiv=document.getElementById("immagini");
    //collocazione non specificata o non valida
    if(!collocazione || collocazione.trim()===""){
        window.location.href="/404.html";
        return;
    }
    try{
        const res=await fetch(`/api/edizione/${encodeURIComponent(collocazione)}`);
        const result=await res.json();
        //contenuto non trovato
        if (!res.ok || !result.success) {
            window.location.href="/404.html";
            return;
        }
        const contenuto=result.content;//dati della risorsa
        const listaImmagini=result.immagini || [];//array di URL a cloudinary
        //cambio il titolo della pagina per SEO
        document.title=`${contenuto.titolo} - ${contenuto.autore} | Archivio musicale Luca Moretti`;
        //popolazione della scheda dell'articolo
        let stringaHTML=`
            <ul>
                <li class="titolo">${escapeHTML(contenuto.titolo)}</li>`;
        if(contenuto.collocazione){
            stringaHTML+=`<li><span>Collocazione</span>: ${escapeHTML(contenuto.collocazione)}</li>`;
        }
        if(contenuto.link_rism && (contenuto.link_rism.startsWith("http://") || contenuto.link_rism.startsWith("https://"))){
            stringaHTML+=`<li><span><a href="${escapeHTML(contenuto.link_rism)}" target="_blank" rel="noopener noreferrer">Link RISM</a></span></li>`;
        }
        stringaHTML+=`<li><span>Autore</span>: ${escapeHTML(contenuto.autore)}</li>`
        if(contenuto.data_str){
            stringaHTML+=`<li><span>Data</span>: ${escapeHTML(contenuto.data_str)}</li>`;
        }
        if(contenuto.editore){
            stringaHTML+=`<li><span>Editore</span>: ${escapeHTML(contenuto.editore)}</li>`;
        }
        if(contenuto.descrizione){
            stringaHTML+=`<li><span>Descrizione</span>: ${escapeHTML(contenuto.descrizione)}</li>`;
        }
        if(contenuto.note){
            stringaHTML+=`<li><span>Note</span>: ${escapeHTML(contenuto.note)}</li>`;
        }
        stringaHTML+=`</ul>`;
        scheda.innerHTML = stringaHTML;
        //gestione delle immagini
        const n_immagini = listaImmagini.length;
        //se ho una sola immagine la metto come immagine
        if (n_immagini === 1) {
            immaginiDiv.innerHTML = `<img src="${escapeHTML(listaImmagini[0])}" alt="Immagine di ${escapeHTML(contenuto.titolo)}">`;
        } else if (n_immagini > 1) {
            immaginiDiv.innerHTML = `
                <div id="slider">
                    <div id="slider-track">
                        ${listaImmagini.map(url => `<img class="slide" src="${escapeHTML(url)}" alt="Immagine di ${escapeHTML(contenuto.titolo)}">`).join("")}
                    </div>
                </div>
            `;
            inizializzaSlider();
        }
        //mostro la sezione con la scheda
        document.querySelector('main.articolo').style.visibility = "visible";
    }catch(err){
        //console.error("Errore nel caricamento dell'edizione: ", err);
    }
});