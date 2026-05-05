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
        const data = await res.json();
        //contenuto non trovato
        if (!data.success) {
            window.location.href = "/404.html";
            return;
        }
        const contenuto = data.content;//dati della risorsa
        const listaImmagini = data.immagini || [];//array di URL a cloudinary
        //popolazione della scheda dell'articolo
        titolo.textContent=contenuto.titolo;
        let stringaHTML = `
            <ul>
                <li><span>Collocazione</span>: ${contenuto.collocazione}</li>
                <li><span>Autore</span>: ${contenuto.autore}</li>
                <li><span>Data</span>: ${contenuto.data_str || "/"}</li>
        `;
        if(contenuto.stampa){
            stringaHTML+= `
                    <li><span>Stampa</span>: ${contenuto.stampa}</li>
            `;
        }
        stringaHTML+=`                
                <li><span>Dimensioni</span>: ${contenuto.dimensioni || "/"}</li>
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
        console.error("Errore nel caricamento della stampa: ", err);
        //window.location.href="/404.html";
    }
});