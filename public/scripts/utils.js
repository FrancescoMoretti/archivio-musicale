//funzioni di utility

//escaping delle stringhe prima di inserirle in HTML
function escapeHTML(str){
    return String(str)
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;')
        .replaceAll(/"/g, '&quot;')
        .replaceAll(/'/g, '&#39;');
};

//Backend: se module esiste => lo esporto
//Frontend: il modulo è undefined => ignora l'esportazione
if(typeof module!=='undefined' && module.exports){
    module.exports={escapeHTML};
}