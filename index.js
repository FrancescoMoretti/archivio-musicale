require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const pool = require('./src/db');
const { upload, cloudinary } = require('./src/cloudinaryConfig');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//funzione di upload su cloudinary
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `archivio_musicale/${folder}` },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

//middleware di verifica del token JWT
const autenticaToken = (req, res, next)=>{
    const token=req.cookies.token;//recupero il token
    //se il token non c'è => mando alla pagina di login
    if(!token){
        //se era chiamata a endpoint
        if(req.path.startsWith('/api/')){
            return res.status(401).json({
                success: false,
                message: "Token mancante, effettua il login..."
            });//401: non autorizzato
        }
        return res.status(302).redirect('/accedi');//302: redirect
    }
    try{
        //token presente => verifica
        const payload=jwt.verify(token, process.env.JWT_SECRET);
        //token valido
        req.utente=payload;//salvo i dati (id, nome, ruolo) nella richiesta
        next();//procedo al prossimo passaggio
    }catch(err){
        //token non valido
        res.clearCookie('token');//consumo il token
        //se il token è scaduto
        if(err.name==="TokenExpiredError"){
            //se era chiamata a endpoint
            if(req.path.startsWith('/api/')){
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
            if(req.path.startsWith('/api/')){
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

//middleware di verifica dei ruoli nel token
const autorizzaRuoli=(...ruoliAmmessi)=>{
    return (req, res, next)=>{
        if(!req.utente){
            return res.status(401).redirect('/accedi');
        }
        if(!ruoliAmmessi.includes(req.utente.ruolo)){
            //se era chiamata a endpoint
            if(req.path.startsWith('/api/')){
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

//rotta segreta per gestire login
app.get('/accedi', (req, res)=>{
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
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

//endpoint per login
app.post('/api/login', async (req, res)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({
            success: false,
            message: "Email o password mancanti."
        });//400: richiesta mal formata
    }
    const query="SELECT id, password, nome, ruolo FROM utenti WHERE email=? AND (ruolo='superadmin' OR ruolo='admin' OR ruolo='editor')";//unici ruoli definiti: superadmin, admin, editor
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
            ruolo: user.ruolo// 'superadmin' || 'admin' || 'editor'
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
        res.json({
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

//endoint per dettagli sugli utenti
app.get('/api/me', autenticaToken, (req, res)=>{
    //req.utente viene popolato da autenticaToken
    res.json({
        success: true,
        utente: {
            nome: req.utente.nome,
            ruolo: req.utente.ruolo
        }
    });
});


app.use('/admin', autenticaToken, autorizzaRuoli('admin', 'superadmin'), express.static('admin'));
app.use('/private', autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), express.static('private'));
app.use(express.static('public'));// Serve i file statici dalla cartella public

//endpoint per inserimento edizione
app.post("/api/add-edizione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res) => {
    const { collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note } = req.body;
    const files = req.files;//immagini
    if (!collocazione || !titolo || !autore) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });//400: richiesta mal formata
    }
    //preparazione query
    const queryEdizione = `INSERT INTO edizioni (collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine = `INSERT INTO immagini_edizioni (edizione_id, url_immagine, ordine) VALUES (?, ?, ?)`;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(queryEdizione, [collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note]);
        const edizioneId = result.insertId;//id dell'edizione inserita
        //caricamento immagini su cloudinary
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageUrl = await uploadToCloudinary(file.buffer, "edizioni");
                await connection.execute(queryImmagine, [edizioneId, imageUrl, i + 1]);
            }
        }
        await connection.commit();
        res.json({ success: true, message: "Contenuto salvato con successo!" });
    } catch (err) {
        await connection.rollback();
        console.error("Errore nell'endpoint add-edizione: ", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false,
                message: "Errore: collocazione è già esistente." });
        }
        res.status(500).json({ 
            success: false,
            message: "Errore interno durante il salvataggio." });
    } finally {
        connection.release();
    }
});

//endpoint per cancellazione edizione
app.post("/api/delete-edizione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.body;
    if(!collocazione){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });
    }
    try{
        const [immagini]=await pool.query(`SELECT i.url_immagine FROM immagini_edizioni i JOIN edizioni e ON i.edizione_id=e.id WHERE e.collocazione=?`, [collocazione]);
        if(immagini.length>0){
            const publicIds=immagini.map(img=>{
                //estraggo il public_id dall'url dell'immagine ('.../v12345/campione.jpg'=>'campione')
                const nomeFile=img.url_immagine.split('/').pop().split('.')[0];
                return `archivio_musicale/edizioni/${nomeFile}`;
            });
            //cancello le immagini da cloudinary
            await cloudinary.api.delete_resources(publicIds);
        }
        //cancello il contenuto dal DB
        const [result]=await pool.query("DELETE FROM edizioni WHERE collocazione=?", [collocazione]);
        //le immagini si cancellano a cascata
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Edizione non presente nel database."
            });
        }else{
            return res.json({
                success: true,
                message: "Edizione eliminata con successo!"
            });
        }
    }catch(err){
        console.error("Errore nell'endpoint delete-edizione: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per lista edizioni
app.get("/api/show-edizioni", async (req, res) => {
    const { limit, offset, filtro } = req.query;
    const limite = parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio = parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //query per contare le righe che avrà la tabella
    let queryTotali = "SELECT COUNT(*) AS totali FROM edizioni e";
    //query per estrarre contenuti e url dell'immagine, uso left join per estrarre anche edizioni senza immagini
    let queryContenuti = `SELECT e.id, e.collocazione, e.titolo, e.autore, i.url_immagine FROM edizioni e LEFT JOIN immagini_edizioni i ON e.id=i.edizione_id AND i.ordine=1`;
    let paramsContenuti = [];
    let paramsTotali = [];
    let whereClause = "";//clausola where
    //gestione filtro
    if (filtro) {
        whereClause = " WHERE e.autore LIKE ? OR e.titolo LIKE ?";//spazio all'inizio
        const filtroLike = `%${filtro}%`;
        paramsTotali.push(filtroLike, filtroLike);
        paramsContenuti.push(filtroLike, filtroLike);
    }
    queryTotali += whereClause;
    queryContenuti += whereClause;
    //gestione ordinamento
    queryContenuti += " ORDER BY e.collocazione ASC LIMIT ? OFFSET ?";//spazio all'inizio
    paramsContenuti.push(limite, inizio);
    try {
        const [risultatoTotale] = await pool.query(queryTotali, paramsTotali);
        const totali = risultatoTotale[0].totali;
        const [righe] = await pool.query(queryContenuti, paramsContenuti);
        res.json({
            success: true,
            contenuti: righe,
            totali: totali
        });
    } catch (err) {
        console.error("Errore nell'endpoint show-edizioni: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero delle edizioni."
        });
    }
});

//endpoint per lettura edizione
app.get("/api/edizione/:collocazione", async (req, res) => {
    const collocazione = req.params.collocazione;
    const queryContenuti = "SELECT * FROM edizioni WHERE collocazione=?";
    const queryImmagini = "SELECT url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY ordine ASC";
    try {
        const [edizioneRisultato] = await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if (edizioneRisultato.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Edizione/Manoscritto non trovato."
            });
        }
        const content = edizioneRisultato[0];
        //recupero le immagini della risorsa
        const [immaginiRisultato] = await pool.query(queryImmagini, [content.id]);
        const listaUrlImmagini = immaginiRisultato.map(riga => riga.url_immagine);
        res.json({
            success: true,
            content: content,
            immagini: listaUrlImmagini,
            n_immagini: listaUrlImmagini.length
        });
    } catch (err) {
        console.error("Errore nell'endpoint edizione: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero della risorsa."
        });
    }
});

//endpoint per recupero dati edizione (MODIFICA)
app.get("/api/get-edizione/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const { collocazione }=req.params;
    try{
        const [rows]=await pool.query("SELECT * FROM edizioni WHERE collocazione=?", [collocazione]);
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Edizione/Manoscritto non trovato."
            });
        }
        res.json({
            success: true,
            dati: rows[0]
        });
    }catch(err){
        console.error("Errore nell'endpoint get-edizione: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento edizione (MODIFICA)
app.post("/api/update-edizione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note}=req.body;
    if (!titolo || !autore) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    const query="UPDATE edizioni SET link_rism=?, autore=?, titolo=?, data_str=?, editore=?, descrizione=?, note=? WHERE collocazione=?";
    try{
        const [result]=await pool.query(query, [link_rism, autore, titolo, data_str, editore, descrizione, note, collocazione]);
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Contenuto non trovato."
            });
        }
        res.json({
            success: true,
            message: "Contenuto aggiornato con successo!"
        });
    }catch(err){
        console.error("Errore nell'endpoint update-edizione: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante l'aggiornamento della risorsa."
        });
    }
});

//endpoint per inserimento stampa
app.post("/api/add-stampa", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    const {collocazione, autore, titolo, data_str, stampa, dimensioni}=req.body;
    const files=req.files;//immagini
    if(!collocazione || !autore || !titolo){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatri mancanti (collocazione, autore, titolo)."
        });
    }
    //preparazione query
    const queryStampa=`INSERT INTO stampe(collocazione, autore, titolo, data_str, stampa, dimensioni) VALUES (?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_stampe(stampa_id, url_immagine, ordine) VALUES (?, ?, ?)`;
    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [result]=await connection.execute(queryStampa, [collocazione, autore, titolo, data_str, stampa, dimensioni]);
        const stampaId = result.insertId;//id della stampa inserita
        //caricamento delle immagini su cloudinary
        if(files && files.length>0){
            for(let i=0; i<files.length; i++){
                const file=files[i];
                const imageUrl=await uploadToCloudinary(file.buffer, "stampe");
                await connection.execute(queryImmagine, [stampaId, imageUrl, i+1]);
            }
        }
        await connection.commit();
        res.json({
            success: true,
            message: "Contenuto salvato con successo!"
        });
    }catch(err){
        await connection.rollback();
        console.error("Errore nell'endpoint add-stampa: ", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false,
                message: "Errore: il numero identificativo è già esistente." });
        }
        res.status(500).json({
            success: false,
            message: "Errore interno durante il salvataggio."
        });
    }finally{
        connection.release();
    }
});

//endpoint per cancellazione stampa
app.post("/api/delete-stampa", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.body;
    if(!collocazione){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });
    }
    try{
        const [immagini]=await pool.query(`SELECT i.url_immagine FROM immagini_stampe i JOIN stampe s ON i.stampa_id=s.id WHERE s.collocazione=?`, [collocazione]);
        if(immagini.length>0){
            const publicIds=immagini.map(img=>{
                //estraggo il public_id dall'url dell'immagine
                const nomeFile=img.url_immagine.split('/').pop().split('.')[0];
                return `archivio_musicale/stampe/${nomeFile}`;
            });
            //cancello le immagini da cloudinary
            await cloudinary.api.delete_resources(publicIds);
        }
        //cancello il contenuto dal DB
        const [result]=await pool.query("DELETE FROM stampe WHERE collocazione=?", [collocazione]);
        //le immagini si cancellano a cascata
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Stampa non presente nel database."
            });
        }else{
            return res.json({
                success: true,
                message: "Stampa eliminata con successo!"
            });
        }
    }catch(err){
        console.error("Errore nell'endpoint delete-stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per lista stampe
app.get("/api/show-stampe", async (req, res)=>{
    const {limit, offset, filtro}=req.query;
    const limite=parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio=parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //query per contare le righe che avrà la tabella
    let queryTotali=`SELECT COUNT(*) AS totali FROM stampe s`;
    //query per estrarre contenuti e url dell'immagine, uso left join per estrarre stampe senza immagine
    let queryContenuti=`SELECT s.id, s.collocazione, s.autore, s.titolo, i.url_immagine FROM stampe s LEFT JOIN immagini_stampe i ON s.id=i.stampa_id AND i.ordine=1`;
    let paramsContenuti=[];
    let paramsTotali=[];
    let whereClause="";//clausola where
    //gestione filtro
    if(filtro){
        whereClause=" WHERE s.autore LIKE ? OR s.titolo LIKE ?";//spazio all'inizio
        const filtroLike=`%${filtro}%`;
        paramsTotali.push(filtroLike, filtroLike);
        paramsContenuti.push(filtroLike, filtroLike);
    }
    queryTotali+=whereClause;
    queryContenuti+=whereClause;
    //gestione ordinamento
    queryContenuti+=" ORDER BY s.collocazione ASC LIMIT ? OFFSET ?";//spazio all'inizio
    paramsContenuti.push(limite, inizio);
    try{
        const [risultatoTotale]=await pool.query(queryTotali, paramsTotali);
        const totali=risultatoTotale[0].totali;
        const [righe]=await pool.query(queryContenuti, paramsContenuti);
        res.json({
            success: true,
            contenuti: righe,
            totali: totali
        });
    }catch(err){
        console.error("Errore nell'endpoint show-stampe: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero delle stampe."
        });
    }
});

//endpoint per lettura stampa
app.get("/api/stampa/:collocazione", async (req, res) => {
    const collocazione = req.params.collocazione;
    const queryContenuti = "SELECT * FROM stampe WHERE collocazione=?";
    const queryImmagini = "SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY ordine ASC";
    try {
        const [stampaRisultato] = await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if (stampaRisultato.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        const content = stampaRisultato[0];
        //recupero le immagini della risorsa
        const [immaginiRisultato] = await pool.query(queryImmagini, [content.id]);
        const listaUrlImmagini = immaginiRisultato.map(riga => riga.url_immagine);
        res.json({
            success: true,
            content: content,
            immagini: listaUrlImmagini,
            n_immagini: listaUrlImmagini.length
        });
    } catch (err) {
        console.error("Errore nell'endpoint stampa: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero della risorsa."
        });
    }
});

//endpoint per recupero dati stampa (MODIFICA)
app.get("/api/get-stampa/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res) => {
    const { collocazione } = req.params;
    try {
        const [rows] = await pool.query("SELECT * FROM stampe WHERE collocazione=?", [collocazione]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        res.json({
            success: true,
            dati: rows[0]
        });
    } catch (err) {
        console.error("Errore nell'endpoint get-stampa: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento stampa (MODIFICA)
app.post("/api/update-stampa", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res) => {
    const { collocazione, autore, titolo, data_str, stampa, dimensioni } = req.body;
    if (!autore || !titolo) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    const query = "UPDATE stampe SET autore=?, titolo=?, data_str=?, stampa=?, dimensioni=? WHERE collocazione=?";
    try {
        const [result] = await pool.query(query, [autore, titolo, data_str, stampa, dimensioni, collocazione]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        res.json({
            success: true,
            message: "Stampa/Foto aggiornata con successo!"
        });
    } catch (err) {
        console.error("Errore nell'endpoint update-stampa: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante l'aggiornamento della risorsa."
        });
    }
});

//endpoint per cambio password (SUPERADMIN/ADMIN/EDITOR)
app.post('/api/cambia-password', autenticaToken, async (req, res)=>{
    const {oldPsw, newPsw, confirmPsw}=req.body;
    const userId=req.utente.id;//estratto dal JWT
    //validazione dati
    if(!oldPsw || !newPsw || !confirmPsw){
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
        const [risultato]=await pool.query("UPDATE utenti SET password=? WHERE id=?", [hashPsw, userId]);
        if(risultato.affectedRows!==1){
            return res.status(404).json({
                success: false,
                message: "Impossibile aggiornare la password."
            });
        }
        //password aggiornata => consumo il token e richiedo nuovo login
        res.clearCookie('token');
        res.json({
            success: true,
            message: "Password aggiornata con successo! Sarà richiesto di ripetere login."
        });
    }catch(err){
        console.error("Errore nell'ednpoint cambia-password: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore durante l'aggiornamento della password."
        });
    }
});

//endpoint per logout
app.post('/api/logout', (req, res)=>{
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

app.use((req, res)=>{
    //così rimane il nome del file non trovato nell'url
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});