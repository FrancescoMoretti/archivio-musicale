const express=require('express');
const router=express.Router();
const path=require('path');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');

const pool=require('../db');
const {autenticaToken, autorizzaRuoli}=require('../middleware/auth');

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
router.post("/api/login", async (req, res)=>{
    const {email, password} = req.body;
    //validazione server-side
    if(!email || !String(email).trim() || !password || !String(password).trim()){
        return res.status(400).json({
            success: false,
            message: "Email o password mancanti."
        });//400: richiesta mal formata
    }
    const query="SELECT id, password, nome, ruolo, psw_cambiata FROM utenti WHERE email=? AND (ruolo='superadmin' OR ruolo='admin' OR ruolo='editor')";//unici ruoli definiti: superadmin, admin, editor
    try{
        const [rows]=await pool.query(query, [email]);
        //se l'utente non esiste
        if(rows.length===0){
            return res.status(401).json({
                success: false,
                message: "Credenziali non valide."
            });
        }
        const user=rows[0];
        //verifica della password
        const match=await bcrypt.compare(password, user.password);
        //se non corrisponde
        if(!match){
            return res.status(401).json({
                success: false,
                message: "Credenziali non valide."
            });
        }
        //se corrisponde
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
            secure: process.env.NODE_ENV === 'production',
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: '/'//rimuovo per tutto il sito
    });
    return res.json({
        success: true,
        message: "Logout effettuato con successo"
    });
});

//endoint per dettagli sugli utenti
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

//endpoint per cambio password
router.post("/api/cambia-password", autenticaToken, async (req, res)=>{
    const {oldPsw, newPsw, confirmPsw}=req.body;
    const userId=req.utente.id;//estratto dal JWT
    //validazione server-side
    if(!oldPsw || !String(oldPsw).trim() || !newPsw || !String(newPsw).trim() || !confirmPsw || !String(confirmPsw).trim()){
        return res.status(400).json({
            success: false,
            message: "Inserisci la vecchia password, la nuova password e ripetere la nuova password."
        });
    }
    if(newPsw!==confirmPsw){
        return res.status(400).json({
            success: false,
            message: "Le nuove password non corrispondono."
        });
    }
    try{
        //recupero vecchia password
        const [rows]=await pool.query("SELECT password FROM utenti WHERE id=?", [userId]);
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Utente non trovato."
            });
        }
        //controllo vecchia password
        const match=await bcrypt.compare(oldPsw, rows[0].password);
        if(!match){
            return res.status(401).json({
                success: false,
                message: "La password attuale è errata."
            });
        }
        if(oldPsw===newPsw){
            return res.status(400).json({
                success: false,
                message: "La nuova password coincide con la password attuale."
            });
        }
        //genero l'hash della nuova password
        const salt=await bcrypt.genSalt(10);
        const hashPsw=await bcrypt.hash(newPsw, salt);
        //salvo l'hash della nuova password
        const [risultato]=await pool.query("UPDATE utenti SET password=?, psw_cambiata=1 WHERE id=?", [hashPsw, userId]);
        if(risultato.affectedRows!==1){
            return res.status(500).json({
                success: false,
                message: "Impossibile aggiornare la password."
            });
        }
        //password aggiornata => consumo il token e richiedo nuovo login
        res.clearCookie('token');
        return res.json({
            success: true,
            message: "Password aggiornata con successo! Sarà richiesto di ripetere login."
        });
    }catch(err){
        console.error("Errore nell'ednpoint cambia-password: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della password."
        });
    }
});

//endpoint per creazione utenti
router.post("/api/add-utente", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    const {email, password, nome, ruolo} = req.body;//dati del nuovo utente, presi dalla richiesta
    const userRuolo=req.utente.ruolo;//ruolo di chi invia la richiesta, preso dal token
    const userId=req.utente.id;//id di chi invia la richiesta, preso dal token
    //validazione server-side
    if(!email || !String(email).trim() || !password || !String(password).trim() || !nome || !String(nome).trim() || !ruolo || !String(ruolo).trim()){
        return res.status(400).json({
            success: false,
            message: "Tutti i campi devono essere riempiti."
        });
    }
    //controllo ruolo
    //admin può creare solo editor
    if(userRuolo==="admin" && ruolo!=="editor"){
        return res.status(403).json({
            success: false,
            message: "Permessi insufficienti, puoi solo nominare editor."
        });
    }
    //non possono essere creati altri superadmin
    if(ruolo==='superadmin'){
        return res.status(403).json({
            success: false,
            message: "Impossibile creare altri superadmin."
        });
    }
    try{
        //controllo se la mail esiste già
        const [esistente]=await pool.query("SELECT id FROM utenti WHERE email=?", [email]);
        if(esistente.length>0){
            return res.status(400).json({
                success: false,
                message: "Email già associata a un utente esistente."
            });
        }
        //hash della password
        const salt=await bcrypt.genSalt(10);
        const hashPsw=await bcrypt.hash(password, salt);
        //inserisco l'utente nel db
        const [risultato]=await pool.query("INSERT INTO utenti (email, password, nome, ruolo, created_by) VALUES (?, ?, ?, ?, ?)", [email, hashPsw, nome, ruolo, userId]);
        if(risultato.affectedRows!==1){
            return res.status(500).json({
                success: false,
                message: "Impossibile aggiungere l'utente."
            });
        }
        return res.status(201).json({
            success: true,
            message: `Utente ${nome} creato con successo come ${ruolo}!`
        });
    }catch(err){
        console.error("Errore nell'endpoint add-utente: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'inserimento dell'utente."
        });
    }
});

//endpoint per lista degli utenti
router.get("/api/show-utenti", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    let query=`SELECT u.id, u.email, u.nome, u.ruolo, u.created_at, c.email AS email_creatore FROM utenti u LEFT JOIN utenti c ON u.created_by=c.id`;
    try{
        const [rows]=await pool.query(query);
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Nessun utente trovato."
            });
        }
        return res.json({
            success: true,
            utenti: rows,
        });
    }catch(err){
        console.error("Errore nell'endpoint show-utenti: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero degli utenti."
        });
    }
});

//endpoint per cancellazione utenti
router.post("/api/delete-utente", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    const {id}=req.body;//id dell'utente da eliminare
    const userRuolo=req.utente.ruolo;//ruolo dell'utente che sta facendo la richiesta
    const userId=req.utente.id;//id dell'utente che sta facendo la richiesta
    const ruoliSuperadmin=['admin', 'editor'];//ruoli eliminabili da superadmin
    const ruoliAdmin=['editor'];//ruoli eliminabili da admin
    let cancellazionePermessa=false;
    //validazione server-side
    if(!id || !String(id).trim()){
        return res.status(400).json({
            success: false,
            message: "Identificativo non valido."
        });
    }
    if(id===userId){
        return res.status(400).json({
            success: false,
            message: "Non puoi eliminare te stesso."
        });
    }
    try{
        //recupero il ruolo dell'utente che si vuole eliminare
        const [rows]=await pool.query("SELECT ruolo FROM utenti WHERE id=?", [id]);
        //non ho recuperato il ruolo
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Utente non trovato."
            });
        }
        //ho recuperato il ruolo
        const ruolo=rows[0].ruolo;//ruolo dell'utente da eliminare
        switch(userRuolo){
            case 'superadmin':
                if(ruoliSuperadmin.includes(ruolo)){
                    cancellazionePermessa=true;
                }
            break;
            case 'admin':
                if(ruoliAdmin.includes(ruolo)){
                    cancellazionePermessa=true;
                }
            break;
            default:
                //nulla
            break;
        }
        if(cancellazionePermessa){
            //cancello l'utente
            const [risultato]=await pool.query("DELETE FROM utenti WHERE id=?", [id]);
            //cancellazione non avvenuta
            if(risultato.affectedRows===0){
                return res.status(500).json({
                    success: false,
                    message: "Impossibile eliminare l'utente."
                });
            }
            //cancellazione avvenuta
            return res.json({
                success: true,
                message: "Utente eliminato con successo!"
            });
        }else{
            return res.status(400).json({
                success: false,
                message: "Non hai i permessi per cancellare questo utente."
            });
        }
    }catch(err){
        console.error("Errore nell'endpoint delete-utente: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione dell'utente."
        });
    }
});

module.exports=router;