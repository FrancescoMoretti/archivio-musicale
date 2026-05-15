document.addEventListener("DOMContentLoaded", async function caricaEdizione() {
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
        const res = await fetch(`/api/edizione/${encodeURIComponent(collocazione)}`);
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
        //popolazione della scheda dell'articolo
        titolo.textContent=contenuto.titolo;
        let stringaHTML = `
            <ul>
                <li><span>Collocazione</span>: ${contenuto.collocazione}</li>
        `;
        if (contenuto.link_rism) {
            stringaHTML += `
                    <li><span><a href="${contenuto.link_rism}" target="_blank">Link RISM</a></span></li>
            `;
        }
        stringaHTML += `
                <li><span>Autore</span>: ${contenuto.autore}</li>
                <li><span>Data</span>: ${contenuto.data_str || "/"}</li>
                <li><span>Editore</span>: ${contenuto.editore || "/"}</li>
                <li><span>Descrizione</span>: ${contenuto.descrizione || "/"}</li>
                <li><span>Note</span>: ${contenuto.note || "/"}</li>
            </ul>
        `;
        scheda.innerHTML = stringaHTML;
        //gestione delle immagini
        const n_immagini = listaImmagini.length;
        //se ho una sola immagine la metto come immagine
        if (n_immagini === 1) {
            immaginiDiv.innerHTML = `<img src="${listaImmagini[0]}" alt="Immagine di ${contenuto.titolo}">`;
        } else if (n_immagini > 1) {
            immaginiDiv.innerHTML = `
                <div id="slider">
                    <div id="slider-track">
                        ${listaImmagini.map(url => `<img class="slide" src="${url}" alt="Immagine di ${contenuto.titolo}">`).join("")}
                    </div>
                </div>
            `;
            inizializzaSlider();
        }
        //mostro la sezione con la scheda
        document.querySelector('main.articolo').style.visibility = "visible";
    } catch (err) {
        console.error("Errore nel caricamento dell'edizione: ", err);
    }
});