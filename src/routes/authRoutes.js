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