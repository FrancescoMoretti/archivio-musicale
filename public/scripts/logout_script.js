document.addEventListener("DOMContentLoaded", function(){
    //fetch per logout
    document.getElementById("logout-btn").addEventListener("click", async ()=>{
        try{
            const res=await fetch("/api/logout", {
                method: "POST",
                credentials: "include"
            });
            const result=await res.json();
            if(res.ok && result.success){
                window.location.href='/accedi';
            }else{
                console.error("Errore durante il logout.");
            }
        }catch(err){
            console.error("Errore durante il logout: ", err);
            //anche in caso di fallimento faccio il redirect
            window.location.href='/accedi';
        }
    });
});