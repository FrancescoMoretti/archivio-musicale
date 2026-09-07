//funzioni di utility

//escaping delle stringhe prima di inserirle con innerHTML
//da usare per il frontend (escaping tramite div funziona solo nel browser)
function escapeHTML(value){
    const div=document.createElement('div');
    if(value){
        div.textContent=value;
    }else{
        div.textContent="";
    }
    return div.innerHTML
        .replaceAll('"', '&quot;')
        .replaceAll("'", "&#39;")
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;');
};