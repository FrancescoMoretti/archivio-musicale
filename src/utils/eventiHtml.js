const {escapeHTML}=require('express-mysql-cloudinary-kit');

//costruisco l'html degli articoli sugli eventi
function costruisciArticoliEventi(eventi, left, mostraCodice){
    let html="";
    eventi.forEach(e=>{
        //titolo
        const titolo=escapeHTML(e.titolo);
        let h3=titolo;//ci vuole per non avere il codice negli alt
        if(mostraCodice && e.codice){
            h3+=`(${escapeHTML(e.codice)})`;
        }
        //data inizio e data fine (se presente)
        let date=escapeHTML(e.data_inizio);
        if(e.data_fine){
            date+=` - ${escapeHTML(e.data_fine)}`;
        }
        //testata (titolo + data)
        const testata=`<div class="testata"><h3>${h3}</h3><p class="date">${date}</p></div>`;
        const testo=`<p class="testo">${escapeHTML(e.descrizione)}</p>`;
        //collegamenti
        let links="";
        if(e.link_evento){
            links+=`<a href="${escapeHTML(e.link_evento)}" target="_blank" rel="noopener">Ulteriori dettagli</a>`;
        }
        if(e.link_facebook){
            links+=`<a href="${escapeHTML(e.link_facebook)}" target="_blank" rel="noopener">Post Facebook</a>`;
        }
        if(e.link_instagram){
            links+=`<a href="${escapeHTML(e.link_instagram)}" target="_blank" rel="noopener">Post Instagram</a>`;
        }
        let collegamenti="";
        if(links){
            collegamenti=`<div class="collegamenti">${links}</div>`;
        }
        //immagini
        const imgs=e.immagini;//estraggo array degli url
        let classe="";
        let corpo=testo;
        if(imgs.length===1){
            classe=` class="one-img-article"`;
            const pc=`<img class="pc-img" src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine">`;
            //allineamento testo/immagine
            if(left){
                corpo=pc+testo;
            }else{
                corpo=testo+pc;
            }
            left=!left;
            corpo+=`<div class="mobile-img"><img src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine"></div>`;
        }else{
            if(imgs.length===2){
                classe=` class="two-img-article"`;
                const pc1=`<img class="pc-img" src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine">`;
                const pc2=`<img class="pc-img" src="${escapeHTML(imgs[1])}" alt="${titolo} seconda immagine">`;
                corpo=pc1+testo+pc2;
                corpo+=`<div class="mobile-img"><img src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine"><img src="${escapeHTML(imgs[1])}" alt="${titolo} seconda immagine"></div>`;
            }
        }
        html+=`<article${classe}>${testata}${corpo}${collegamenti}</article>`;
    });
    return {html, left};
};

module.exports={costruisciArticoliEventi};