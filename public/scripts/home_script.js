document.addEventListener("DOMContentLoaded", async function(){
    //fetch per conteggio dei reperti
    const div=document.getElementById("contatore-div");
    const message=div.querySelector('p');
    try{
        const res=await fetch("/api/conta-reperti");
        const result=await res.json();
        if(res.ok && result.success){
            message.textContent=result.message;
        }else{
            message.textContent=result.message;
        }
    }catch(err){
        console.error(err);
    }
});