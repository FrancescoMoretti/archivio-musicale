document.addEventListener("DOMContentLoaded", function(){
    //fetch di autenticazione
    document.getElementById("login-form").addEventListener("submit", async (event)=>{
        event.preventDefault();
        const form=event.target;
        const message=form.querySelector('p');
        const email=document.getElementById("email").value;
        const password=document.getElementById("password").value;
        //validazione client-side
        if(!email || !password){
            message.textContent="Email o password non inseriti.";
            return;
        }
        try{
            //fetch di login
            const res=await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({email, password})
            });
            const result=await res.json();
            //se il login è avvenuto correttamente
            if(res.ok && result.success){
                switch(result.ruolo){
                    case 'superadmin':
                        window.location.href="/admin/area_admin.html";
                    break;
                    case 'admin':
                        window.location.href="/admin/area_admin.html";
                    break;
                    case 'editor':
                        window.location.href="/private/area_riservata.html";    
                    break;
                    default:
                        //nulla
                    break;
                }
            }else{
                //se il login non è avvenuto
                message.textContent=result.message || "Errore durante il login.";
            }
        }catch(err){
            message.textContent="Errore di rete: impossibile raggiungere il server.";
            console.error(err);
        }
    });
});