const {escapeHTML}=require('express-mysql-cloudinary-kit');

//costruisco l'html degli articoli sugli eventi
function costruisciArticoliEventi(eventi, mostraCodice){
    let html="";
    let left=true;//per alternare foto singole allineate a sinistra e a destra
    const tab="    ";//4 spazi <=> 1 tab
    const r3=tab+tab+tab;//indentazione con 3 tab
    const r4=r3+tab;//indentazione con 4 tab
    const r5=r4+tab;//indentazione con 5 tab
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
        const testata=`\n${r4}<div class="testata">\n${r5}<h3>${h3}</h3><p class="date">${date}</p>\n${r4}</div>`;
        const testo=`\n${r4}<p class="testo">${escapeHTML(e.descrizione)}</p>`;
        //collegamenti
        let links="";
        if(e.link_evento){
            links+=`\n${r5}<a href="${escapeHTML(e.link_evento)}" target="_blank" rel="noopener">Ulteriori dettagli</a>`;
        }
        if(e.link_facebook){
            links+=`\n${r5}<a href="${escapeHTML(e.link_facebook)}" target="_blank" rel="noopener">Post Facebook</a>`;
        }
        if(e.link_instagram){
            links+=`\n${r5}<a href="${escapeHTML(e.link_instagram)}" target="_blank" rel="noopener">Post Instagram</a>`;
        }
        let collegamenti="";
        if(links){
            collegamenti=`\n${r4}<div class="collegamenti">${links}\n${r4}</div>`;
        }
        //immagini
        const imgs=e.immagini;//estraggo array degli url
        let classe="";
        let corpo=testo;
        if(imgs.length===1){
            classe=` class="one-img-article"`;
            const pc=`\n${tab}${tab}${tab}<img class="pc-img" src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine">`;
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
                const pc1=`\n${r4}<img class="pc-img" src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine">`;
                const pc2=`\n${r4}<img class="pc-img" src="${escapeHTML(imgs[1])}" alt="${titolo} seconda immagine">`;
                corpo=pc1+testo+pc2;
                corpo+=`\n${r4}<div class="mobile-img">\n${r5}<img src="${escapeHTML(imgs[0])}" alt="${titolo} prima immagine">\n${r5}<img src="${escapeHTML(imgs[1])}" alt="${titolo} seconda immagine">\n${r4}</div>`;
            }
        }
        html+=`\n${r3}<article${classe}>${testata}${corpo}${collegamenti}\n${r3}</article>`;
    });
    return html;
};

module.exports={costruisciArticoliEventi};