//funzioni di utility

//funzione per escaping dei dati prima di inserirli con innerHTML
function escapeHTML(value){
    const div=document.createElement('div');
    if(value){
        div.textContent=value;
    }else{
        div.textContent="";
    }
    return div.innerHTML;
};