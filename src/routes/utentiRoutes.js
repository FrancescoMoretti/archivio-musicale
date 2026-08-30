const express=require('express');
const router=express.Router();
const bcrypt=require('bcryptjs');

const pool=require('../db');
const {autenticaToken, autorizzaRuoli}=require('../middleware/auth');
const {hashPassword}=require('../utils/hash');
const {validaPassword}=require('../utils/validazione');

//endpoint per creazione utenti
router.post("/api/utente", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
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
    const ruoliAmmessi=['admin', 'editor'];
    if(!ruoliAmmessi.includes(ruolo)){
        return res.status(400).json({
            success: false,
            message: "Ruolo non valido."
        });
    }
    //admin può creare solo editor
    if(userRuolo==="admin" && ruolo!=="editor"){
        return res.status(403).json({
            success: false,
            message: "Permessi insufficienti, puoi solo nominare editor."
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
        const hashPsw=await hashPassword(password);
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
        console.error("Errore nell'endpoint POST utente: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'inserimento dell'utente."
        });
    }
});

//endpoint per lista degli utenti
router.get("/api/utenti", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    let query=`SELECT u.id, u.email, u.nome, u.ruolo, u.created_at, c.email AS email_creatore, IFNULL(u.tentativi_falliti, '0'), IFNULL(u.bloccato_fino, '/'), IFNULL(u.blocchi_consecutivi, '0') FROM utenti u LEFT JOIN utenti c ON u.created_by=c.id`;
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
        console.error("Errore nell'endpoint GET utenti: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero degli utenti."
        });
    }
});

//endpoint per cancellazione utenti
router.delete("/api/utente/:id", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    const {id}=req.params;//id dell'utente da eliminare
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
    if(parseInt(id, 10)===userId){//faccio parsing perché id è passato come stringa
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
        console.error("Errore nell'endpoint DELETE utente: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione dell'utente."
        });
    }
});

//endpoint per cambio password
router.patch("/api/utente/password", autenticaToken, async (req, res)=>{
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
        //validazione della nuova password
        const erroreValidazione=validaPassword(newPsw, [req.utente.email, req.utente.nome]);
        if(erroreValidazione){
            return res.status(400).json({
                success: false,
                message: erroreValidazione
            });
        }
        //genero l'hash della nuova password
        const hashPsw=await hashPassword(newPsw);
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
        console.error("Errore nell'endpoint PATCH password: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della password."
        });
    }
});

module.exports=router;