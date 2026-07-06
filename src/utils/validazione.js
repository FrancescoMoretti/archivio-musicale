//validazione stringhe
function validaStringa(value){
    if(!valore || !String(value).trim()){
        return null;
    }else{
        return String(value).trim();
    }
};

//validazione url
function validaUrl(value){
    value=validaStringa(value);//restituisce valore trimmato o null
    if(value===null){
        return null;
    }
    try{
        const url=new URL(value);
        if(url.protocol==='http:' || url.protocol==="https:"){
            return value;//url valido
        }else{
            return false;//url non valido
        }
    }catch{
        return false;//url comunque non valido
    }
};

//validazione url social
function validaUrlSocial(value, social){
    value=validaUrl(value);//restituisce valore trimmato, null o false (se non è http o https)
    if(value===null || value===false){
        return value;//null o false
    }
    if(!social){
        throw new Error("Nome del social passato come parametro non valido.");
    }
    const hostname=new URL(value).hostname.toLowerCase().replace(/^www\./, '');//rmuovo eventuale www. all'inizio
    if(hostname===`${social}.com` || hostname.endsWith(`.${social}.com`)){
        return value;
    }else{
        return false;
    }
};

module.exports={validaStringa, validaUrl, validaUrlSocial};