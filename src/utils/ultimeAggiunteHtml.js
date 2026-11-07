const {escapeHTML}=require('express-mysql-cloudinary-kit');

//costruisco card per ultime aggiunte
function costruisciUltimeAggiunte(aggiunte){
    let html="";
    if(aggiunte.length>0){
        aggiunte.forEach(a=>{
            const href=`/${a.tipo}.html?collocazione=${encodeURIComponent(a.collocazione)}`;
            let src='/immagini/logo_archivio_rettangolare.jpeg';//immagine di default in caso un'opera non abbia immagini
            if(a.url){
                src=a.url.replace('/upload/', '/upload/w_450,h_300,c_fill,g_north/');//miniatura 3:2 (come aspect ratio via css); c_fill: riempe e mantiene le proporzioni; g_north: mostro a partire dalla cima;
            }
            let testo=a.titolo;
            if(testo.length>25){
                testo=testo.substring(0, 25)+"...";
            }
            html+=`
                <div class="element">
                    <a href="${escapeHTML(href)}"><img src="${escapeHTML(src)}" alt="Copertina di ${escapeHTML(a.titolo)}"></a>
                    <a class="link" href="${escapeHTML(href)}">${escapeHTML(testo)}</a>
                </div>`;
        });
    }
    return html;
};

module.exports={costruisciUltimeAggiunte};