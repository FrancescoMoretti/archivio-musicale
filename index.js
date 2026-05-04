require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));// Serve i file statici dalla cartella public

app.use('/admin', express.static('admin'));

const pool = require('./src/db');
const { upload, cloudinary } = require('./src/cloudinaryConfig');

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

//endpoint per inserimento edizione
app.post("/api/add-edizione", upload.array("immagini"), async (req, res) => {
    const { collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note } = req.body;
    const files = req.files;//immagini
    if (!collocazione || !titolo || !autore) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });
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
app.post("/api/delete-edizione", async (req, res)=>{
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
app.get("/api/get-edizione/:collocazione", async (req, res)=>{
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
app.post("/api/update-edizione", async (req, res)=>{
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
app.post("/api/add-stampa", upload.array("immagini"), async (req, res)=>{
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
app.post("/api/delete-stampa", async (req, res)=>{
    const {id}=req.body;
    if(!id){
        return res.status(400).json({
            success: false,
            message: "Identificativo non valido."
        });
    }
    try{
        const [immagini]=await pool.query(`SELECT i.url_immagine FROM immagini_stampe i JOIN stampe s ON i.stampa_id=s.id WHERE s.id=?`, [id]);
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
        const [result]=await pool.query("DELETE FROM stampe WHERE id=?", [id]);
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
    let queryContenuti=`SELECT s.id, s.autore, s.titolo, i.url_immagine FROM stampe s LEFT JOIN immagini_stampe i ON s.id=i.stampa_id AND i.ordine=1`;
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
    queryContenuti+=" ORDER BY CAST(s.id AS UNSIGNED) ASC LIMIT ? OFFSET ?";//spazio all'inizio
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
app.get("/api/stampa/:id", async (req, res) => {
    const id = req.params.id;
    const queryContenuti = "SELECT * FROM stampe WHERE id=?";
    const queryImmagini = "SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY ordine ASC";
    try {
        const [stampaRisultato] = await pool.query(queryContenuti, [id]);
        //risorsa non trovata
        if (stampaRisultato.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        const content = stampaRisultato[0];
        //recupero le immagini della risorsa
        const [immaginiRisultato] = await pool.query(queryImmagini, [id]);
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
app.get("/api/get-stampa/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT * FROM stampe WHERE id=?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        } else {
            res.json({
                success: true,
                dati: rows[0]
            });
        }
    } catch (err) {
        console.error("Errore nell'endpoint get-stampa: ", err);
        res.status(500).json({
            success: false,
            message: "Errore durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento stampa (MODIFICA)
app.post("/api/update-stampa", async (req, res) => {
    const { id, autore, titolo, data_str, stampa, dimensioni } = req.body;
    if (!autore || !titolo) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    const query = "UPDATE stampe SET autore=?, titolo=?, data_str=?, stampa=?, dimensioni=? WHERE id=?";
    try {
        const [result] = await pool.query(query, [autore, titolo, data_str, stampa, dimensioni, id]);
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

app.use((req, res)=>{
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});