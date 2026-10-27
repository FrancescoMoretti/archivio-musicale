//fallback per conteggio reperti lato frontend

document.addEventListener("DOMContentLoaded", async function(){
    //fetch per conteggio dei reperti
    const div=document.getElementById("contatore-div");
    const message=div.querySelector('p');
    //se ho fatto il conteggio con rendering server-side => ora non lo rifaccio
    if(message.textContent.trim()!==""){
        return;
    }
    try{
        const res=await fetch("/api/conta-reperti");
        const result=await res.json();
        if(res.ok && result.success){
            message.textContent=result.message;
        }else{
            message.textContent=result.message;
        }
    }catch(err){
        //console.error(err);
    }
});