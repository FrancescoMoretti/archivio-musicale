document.addEventListener("DOMContentLoaded", async function caricaEdizione() {
    const params = new URLSearchParams(window.location.search);
    const collocazione = params.get("collocazione");
    const scheda = document.getElementById("scheda");
    const immaginiDiv = document.getElementById("immagini");
    //collocazione non specificata o non valida
    if (!collocazione || isNaN(collocazione) || collocazione <= 0) {
        window.location.href = "/404.html";
        return;
    }
    try {
        const res = await fetch(`/api/edizione/${encodeURIComponent(collocazione)}`);
        const data = await res.json();
        //contenuto non trovato
        if (!data.success) {
            window.location.href = "/404.html";
            return;
        }
        const c = data.content;//dati della risorsa
        const listaImmagini = data.immagini || [];//array di URL a cloudinary
        //popolazione della scheda dell'articolo
        let stringaHTML = `
            <ul>
                <li><span>Collocazione</span>: ${c.collocazione}</li>
        `;
        if (c.link_rism) {
            stringaHTML += `
                    <li><span><a href="${c.link_rism}" target="_blank">Link RISM</a></span></li>
            `;
        }
        stringaHTML += `
                <li><span>Autore</span>: ${c.autore}</li>
                <li><span>Titolo</span>: ${c.titolo}</li>
                <li><span>Data</span>: ${c.data_str || "/"}</li>
                <li><span>Editore</span>: ${c.editore || "/"}</li>
                <li><span>Descrizione</span>: ${c.descrizione || "/"}</li>
                <li><span>Note</span>: ${c.note || "/"}</li>
            </ul>
        `;
        scheda.innerHTML = stringaHTML;
        //gestione delle immagini
        const n_immagini = listaImmagini.length;
        //se ho una sola immagine la metto come immagine
        if (n_immagini === 1) {
            immaginiDiv.innerHTML = `<img src="${listaImmagini[0]}" alt="Immagine di ${c.titolo}">`;
        } else if (n_immagini > 1) {
            immaginiDiv.innerHTML = `
                <div id="slider">
                    <div id="slider-track">
                        ${listaImmagini.map(url => `<img class="slide" src="${url}" alt="Immagine di ${c.titolo}">`).join("")}
                    </div>
                </div>
            `;
            inizializzaSlider();
        }
        //mostro la sezione con la scheda
        document.querySelector('section.articolo').style.visibility = "visible";
    } catch (err) {
        console.error("Errore nel caricamento dell'edizione: ", err);
        //window.location.href="/404.html";
    }
});