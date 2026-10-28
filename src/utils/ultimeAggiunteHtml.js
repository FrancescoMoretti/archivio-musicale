const {escapeHTML}=require('express-mysql-cloudinary-kit');

//costruisco card per ultime aggiunte
function costruisciUltimeAggiunte(aggiunte){
    let html="";
    if(aggiunte.length>0){
        aggiunte.forEach(a=>{
            const href=`/${a.tipo}.html?collocazione=${encodeURIComponent(a.collocazione)}`;
            let src='/immagini/logo_archivio_rettangolare.webp';//immagine di default in caso un'opera non abbia immagini
            if(a.url){
                src=a.url.replace('/upload', '/upload/w_450,h_300,c_fill/');//miniatura 3:2 (come aspect ratio via css)
            }
            let testo=a.titolo;
            if(testo.length>30){
                testo=testo.substring(0, 30)+"...";
            }
            html+=`
                <div class="element">
                    <img src="${escapeHTML(src)}" alt="Copertina di ${escapeHTML(a.titolo)}">
                    <a class="link" href="${escapeHTML(href)}">${escapeHTML(testo)}</a>
                </div>`;
        });
    }
    return html;
};

module.exports={costruisciUltimeAggiunte};