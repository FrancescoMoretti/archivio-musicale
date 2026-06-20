const jwt=require('jsonwebtoken');

//middleware di verifica del token JWT
const autenticaToken=(req, res, next)=>{
    //evito che le pagine protette possano essere raggiunte con "<-" senza il controllo del token
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    //no-store: non salvo copia della pagina nella memoria temporanea
    //no-cache & must-revalidate: obbligo il browser a fare una richiesta al server per verificare la validità dle token
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    //Pragma & Expires: servono per retrocompatibilità con browser vecchi
    const token=req.cookies.token;//recupero il token
    //se il token non c'è => mando alla pagina di login
    if(!token){
        //se era chiamata a endpoint
        if(req.path.startsWith("/api/")){
            return res.status(401).json({
                success: false,
                message: "Token mancante, effettua il login..."
            });//401: non autorizzato
        }
        //se era accesso a pagina HTML
        return res.status(302).redirect('/accedi');//302: redirect
    }
    try{
        //token presente => verifica
        const payload=jwt.verify(token, process.env.JWT_SECRET);
        //token valido
        req.utente=payload;//salvo i dati del token nella richiesta
        next();//procedo al prossimo passaggio
    }catch(err){
        //token non valido
        res.clearCookie('token');//consumo il token
        //se il token è scaduto
        if(err.name==="TokenExpiredError"){
            //se era chiamata a endpoint
            if(req.path.startsWith("/api/")){
                return res.status(401).json({
                    success: false,
                    message: "Token scaduto, effettua di nuovo il login..."
                });//401: non autorizzato
            }
            //se era accesso a pagina HTML
            return res.status(302).redirect('/accedi');//302: redirect
        }
        //se il token è stato manomesso
        if(err.name==="JsonWebTokenError"){
            //se era chiamata a endpoint
            if(req.path.startsWith("/api/")){
                return res.status(403).json({
                    success: false,
                    message: "Token non valido."
                });//403: forbidden
            }
            //se era accesso a pagina HTML
            return res.status(403).redirect('/403.html');//403: forbidden
        }
        //altri errori
        return res.status(302).redirect('/accedi');
    }
};

//middleware di verifica del ruolo nel token JWT
const autorizzaRuoli=(...ruoliAmmessi)=>{
    return (req, res, next)=>{
        if(!req.utente){
            return res.status(401).redirect('/accedi');
        }
        if(!ruoliAmmessi.includes(req.utente.ruolo)){
            //se era chiamata a endpoint
            if(req.path.startsWith("/api/")){
                return res.status(403).json({
                    success: false,
                    message: "Stai tentando di accedere a funzioni per cui non hai i permessi."
                });
            }
            //se era accesso a pagina HTML
            return res.status(403).redirect('/403.html');
        }
        //se va tutto bene
        next();
    };
};

//middleware di verifica "morbida"
const autenticaTokenMorbido=(...ruoliAmmessi)=>{
    return (req, res, next)=>{
        const token=req.cookies.token;
        req.addetto=false;//di default suppongo utente non addetto(!editor, !admin, !superadmin)
        //se il token non c'è => mando avanti
        if(!token){
            return next();
        }
        try{
            //token presente => verifica
            const payload=jwt.verify(token, process.env.JWT_SECRET);
            if(ruoliAmmessi.includes(payload.ruolo)){
                req.addetto=true;
            }
            next();
        }catch(err){
            //se il token è stato manomesso
            if(err.name==="JsonWebTokenError"){
                res.clearCookie('token');//consumo il token
                return res.status(403).redirect('/403.html');//403: forbidden
            }
            next();
        }
    }
};

module.exports={autenticaToken, autorizzaRuoli, autenticaTokenMorbido};