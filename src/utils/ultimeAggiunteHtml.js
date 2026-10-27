const {escapeHTML}=require('express-mysql-cloudinary-kit');

//costruisco card per ultime aggiunte
function costruisciUltimeAggiunte(aggiunte){
    let html="";
    if(aggiunte.length>0){
        aggiunte.forEach(a=>{
            const href=`/${escapeHTML(a.tipo)}.html?collocazione=${escapeHTML(a.collocazione)}`;
            let src='/immagini/logo_archivio_rettangolare.webp';
            if(a.url){
                src=`${escapeHTML(a.url)}`;
            }
            let testo=a.titolo;
            if(testo.length>20){
                testo=testo.substring(0, 30)+"...";
            }
            html+=`
                <div class="element">
                    <a href="${href}">
                        <img src="${src}" alt="Copertina di ${escapeHTML(a.titolo)}">
                    </a>
                    <a class="link" href="${href}">${escapeHTML(testo)}</a>
                </div>`;
        });
    }
    return html;
};

module.exports={costruisciUltimeAggiunte};