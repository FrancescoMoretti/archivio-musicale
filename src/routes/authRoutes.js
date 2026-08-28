const express=require('express');
const router=express.Router();
const path=require('path');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');

const pool=require('../db');
const {autenticaToken, autorizzaRuoli, loginLimiter}=require('../middleware/auth');

//rotta segreta per gestire login
router.get("/accedi", (req, res)=>{
    const token = req.cookies.token;//recupero il token
    //se il token c'è
    if(token){
        try{
            //verifico il token
            const payload=jwt.verify(token, process.env.JWT_SECRET);
            //se il token è valido
            //gestisco redirect
            switch(payload.ruolo){
                case 'superadmin':
                    return res.redirect('/admin/area_admin.html');
                break;
                case 'admin':
                    return res.redirect('/admin/area_admin.html');
                break;
                case 'editor':
                    return res.redirect('/private/area_riservata.html');
                break;
                default:
                    //nulla
                break;
            }
        }catch(err){
            //se il token è scaduto o manomesso
            res.clearCookie("token");
        }
    }
    //se non c'è il token o è scaduto servo il file di login
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

//endpoint per login
router.post("/api/login", loginLimiter, async (req, res)=>{
    const {email, password} = req.body;
    //validazione server-side
    if(!email || !String(email).trim() || !password || !String(password).trim()){
        return res.status(400).json({
            success: false,
            message: "Email o password mancanti."
        });//400: richiesta mal formata
    }
    const query="SELECT id, password, nome, ruolo, psw_cambiata, tentativi_falliti, bloccato_fino, blocchi_consecutivi FROM utenti WHERE email=? AND (ruolo='superadmin' OR ruolo='admin' OR ruolo='editor')";//unici ruoli definiti: superadmin, admin, editor
    try{
        const [rows]=await pool.query(query, [email]);
        //se l'utente non esiste
        if(rows.length===0){
            //confronto "fantasma" per non dare indizi sulla mail registrata o no
            await bcrypt.compare(password, "$2b$10$........................................");
            return res.status(401).json({
                success: false,
                message: "Credenziali non valide."
            });
        }
        const user=rows[0];
        //controllo se l'utente è bloccato
        if(user.bloccato_fino && new Date(user.bloccato_fino)>new Date()){
            const minutiResidui=Math.ceil((new Date(user.bloccato_fino)-new Date())/(60*1000));
            return res.status(429).json({
                success: false,
                message: `Profilo temporaneamente bloccato. Riprova tra ${minutiResidui} minuti.`
            });//429: troppe richieste
        }
        //verifica della password
        const match=await bcrypt.compare(password, user.password);
        //se non corrisponde
        if(!match){
            //incremento tentativi falliti
            const tentativi=user.tentativi_falliti+1;
            let bloccoFino=null;
            let blocchi_consecutivi=user.blocchi_consecutivi;
            //se limite oltrepassato blocco temporaneo
            if(tentativi>=3){
                blocchi_consecutivi=user.blocchi_consecutivi+1;
                const minutiBlocco=Math.min(15*Math.pow(4, blocchi_consecutivi-1), 24*60);//15 minuti, 1h, 4h... tetto massimo a 24h
                bloccoFino=new Date(Date.now()+minutiBlocco*60*1000);
            }
            await pool.query("UPDATE utenti SET tentativi_falliti=?, bloccato_fino=?, blocchi_consecutivi=? WHERE id=?", [tentativi, bloccoFino, blocchi_consecutivi, user.id]);
            return res.status(401).json({
                success: false,
                message: "Credenziali non valide."
            });
        }
        //se corrisponde
        //elimino tentativi di login falliti e blocchi consecutivi
        await pool.query("UPDATE utenti SET tentativi_falliti=0, bloccato_fino=NULL, blocchi_consecutivi=0 WHERE id=?", [user.id]);
        //definizione del payload con i campi della tabella
        const payload={
            id: user.id,
            email: email,
            nome: user.nome,
            ruolo: user.ruolo,// 'superadmin' || 'admin' || 'editor'
            pswCambiata: user.psw_cambiata
        };
        //generazione del token
        const token=jwt.sign(payload, process.env.JWT_SECRET, {
            algorithm: "HS256",
            expiresIn: "1h"
        });
        //generazione del cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 3600000,//1 ora (in millisecondi)
            sameSite: "Lax"
        });
        return res.json({
            success: true,
            message: "Login effettuato!",
            ruolo: user.ruolo
        });
    }catch(err){
        console.error("Errore nell'endpoint login: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il login."
        });
    }
});

//endpoint per logout
router.post("/api/logout", (req, res)=>{
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Lax",
        path: '/'//rimuovo per tutto il sito
    });
    return res.json({
        success: true,
        message: "Logout effettuato con successo"
    });
});

//endoint per dettagli sugli utenti (nome, ruolo, pswCambiata)
router.get("/api/me", autenticaToken, (req, res)=>{
    //req.utente viene popolato da autenticaToken
    return res.json({
        success: true,
        utente: {
            nome: req.utente.nome,
            ruolo: req.utente.ruolo,
            pswCambiata: req.utente.pswCambiata
        }
    });
});

module.exports=router;