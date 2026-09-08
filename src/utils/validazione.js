//validazione stringhe
function validaStringa(value){
    if(!value || !String(value).trim()){
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
            return url.href;//url valido
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

//validazione nuove password
function validaPassword(password, datiUtente=[]){
    if(password.length<10){
        return "La password deve contenere almeno 10 caratteri.";
    }
    if(!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)){
        return "La password deve contenere sia lettere che numeri";
    }
    //evito che la password contenga dati facilmente intuibili
    const passwordMinuscola=password.toLowerCase();
    for(const dato of datiUtente){
        if(dato && passwordMinuscola.includes(String(dato).toLowerCase())){
            return "La password non può contenere la tua email o il tuo nome.";
        }
    }
    //se arrivo qui => tutti i controlli sono stati superati
    return null;//password valida
};

module.exports={validaStringa, validaUrl, validaUrlSocial, validaPassword};