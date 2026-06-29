const express=require('express');
const router=express.Router();

const pool=require('../db');
const {cloudinary, upload, uploadToCloudinary}=require('../cloudinaryConfig');
const {autenticaToken, autorizzaRuoli, autenticaTokenMorbido}=require('../middleware/auth');

//endpoint per inserimento edizione
router.post("/api/edizione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    let {collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note}=req.body;
    const userId=req.utente.id;//id dell'utente che sta creando il contenuto
    const files=req.files;//immagini
    //validazione server-side
    if (!collocazione || !String(collocazione).trim() || !titolo || !String(titolo).trim() || !autore || !String(autore).trim()) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });//400: richiesta mal formata
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!link_rism || !String(link_rism).trim()){
        link_rism=null;
    }
    if(!data_str || !String(data_str).trim()){
        data_str=null;
    }
    if(!editore || !String(editore).trim()){
        editore=null;
    }
    if(!descrizione || !String(descrizione).trim()){
        descrizione=null;
    }
    if(!note || !String(note).trim()){
        note=null;
    }
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    //preparazione query
    const queryEdizione=`INSERT INTO edizioni (collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_edizioni (edizione_id, url_immagine, ordine) VALUES (?, ?, ?)`;
    const connection=await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(queryEdizione, [collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note, userId]);
        const edizioneId = result.insertId;//id dell'edizione inserita
        //caricamento immagini su cloudinary
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const {imageUrl, publicId} = await uploadToCloudinary(file.buffer, "edizioni");
                publicIds.push(publicId);
                await connection.execute(queryImmagine, [edizioneId, imageUrl, i + 1]);
            }
        }
        await connection.commit();
        return res.status(201).json({ success: true, message: "Contenuto salvato con successo!" });
    } catch (err) {
        await connection.rollback();
        try{
            if(publicIds.length>0){
                for(let i=0; i<publicIds.length; i++){
                    await cloudinary.uploader.destroy(publicIds[i]);
                }
                console.log("Pulizia delle immagini parzialmente caricate su Cloudinary completata.");
            }
        }catch(cloudinaryErr){
            console.error("Errore durante la pulizia di Cloudinary: ", cloudinaryErr);
        }
        console.error("Errore nell'endpoint POST edizione: ", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false,
                message: "Errore: collocazione è già esistente." });
        }
        return res.status(500).json({ 
            success: false,
            message: "Errore interno durante il salvataggio." });
    } finally {
        connection.release();
    }
});

//endpoint per cancellazione edizione
router.delete("/api/edizione/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
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
        console.error("Errore nell'endpoint DELETE edizione: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per lista edizioni
router.get("/api/edizioni", async (req, res)=>{
    const {limit, offset, filtro}=req.query;
    const limite=parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio=parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //query per contare le righe che avrà la tabella
    let queryTotali="SELECT COUNT(*) AS totali FROM edizioni e";
    //query per estrarre contenuti e url dell'immagine, uso left join per estrarre anche edizioni senza immagini
    let queryContenuti=`SELECT e.id, e.collocazione, e.titolo, e.autore, i.url_immagine FROM edizioni e LEFT JOIN immagini_edizioni i ON e.id=i.edizione_id AND i.ordine=1`;
    let paramsContenuti=[];
    let paramsTotali=[];
    let whereClause="";//clausola where
    //gestione filtro
    if(filtro){
        whereClause = " WHERE e.autore LIKE ? OR e.titolo LIKE ?";//spazio all'inizio
        const filtroLike = `%${filtro}%`;
        paramsTotali.push(filtroLike, filtroLike);
        paramsContenuti.push(filtroLike, filtroLike);
    }
    queryTotali+=whereClause;
    queryContenuti+=whereClause;
    //gestione ordinamento
    queryContenuti+=" ORDER BY e.collocazione ASC LIMIT ? OFFSET ?";//spazio all'inizio
    paramsContenuti.push(limite, inizio);
    try{
        const [risultatoTotale] = await pool.query(queryTotali, paramsTotali);
        const totali = risultatoTotale[0].totali;
        const [righe] = await pool.query(queryContenuti, paramsContenuti);
        return res.json({
            success: true,
            contenuti: righe,
            totali: totali
        });
    }catch(err){
        console.error("Errore nell'endpoint GET edizioni: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero delle edizioni."
        });
    }
});

//endpoint per lettura edizione
router.get("/api/edizione/:collocazione", autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });
    }
    let campiSelect="id, titolo, link_rism, autore, data_str, editore, descrizione, note";
    //se l'utente è addetto => recupero anche la collocazione
    if(req.addetto){
        campiSelect+=", collocazione";
    }
    const queryContenuti=`SELECT ${campiSelect} FROM edizioni WHERE collocazione=?`;
    const queryImmagini="SELECT url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY ordine ASC";
    try {
        const [edizioneRisultato]=await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if (edizioneRisultato.length===0) {
            return res.status(404).json({
                success: false,
                message: "Edizione/Manoscritto non trovato."
            });
        }
        const content=edizioneRisultato[0];
        //recupero le immagini della risorsa
        const [immaginiRisultato]=await pool.query(queryImmagini, [content.id]);
        const listaUrlImmagini=immaginiRisultato.map(riga=>riga.url_immagine);
        return res.json({
            success: true,
            content: content,
            immagini: listaUrlImmagini,
            n_immagini: listaUrlImmagini.length
        });
    }catch(err){
        console.error("Errore nell'endpoint GET edizione: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento edizione
router.put("/api/edizione/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    let {link_rism, autore, titolo, data_str, editore, descrizione, note}=req.body;
    const userId=req.utente.id;//id dell'utente che sta modificando il contenuto
    //validazione server-side
    if (!titolo || !String(titolo).trim() || !autore || !String(autore).trim()) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!link_rism || !String(link_rism).trim()){
        link_rism=null;
    }
    if(!data_str || !String(data_str).trim()){
        data_str=null;
    }
    if(!editore || !String(editore).trim()){
        editore=null;
    }
    if(!descrizione || !String(descrizione).trim()){
        descrizione=null;
    }
    if(!note || !String(note).trim()){
        note=null;
    }
    const query="UPDATE edizioni SET link_rism=?, autore=?, titolo=?, data_str=?, editore=?, descrizione=?, note=?, updated_by=? WHERE collocazione=?";
    try{
        const [result]=await pool.query(query, [link_rism, autore, titolo, data_str, editore, descrizione, note, userId, collocazione]);
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Contenuto non trovato."
            });
        }
        return res.json({
            success: true,
            message: "Contenuto aggiornato con successo!"
        });
    }catch(err){
        console.error("Errore nell'endpoint PUT edizione: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della risorsa."
        });
    }
});

//endpoint per correzione edizioni
router.patch("/api/edizioni", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    //preparazione query
    const querySelect="SELECT collocazione, descrizione, note FROM edizioni";
    const queryUpdate="UPDATE edizioni SET descrizione=?, note=? WHERE collocazione=?";
    let modificati=[];//array per salvare collocazioni delle edizioni corrette
    
    //funzione di correzione testi (descrizione e note)
    const correggiTesto=(testo)=>{
        if(!testo){
            return testo;
        }
        let testoPulito=testo.trim();//pulisco da eventuali spazi in eccesso
        if(testoPulito.length>0 && !testoPulito.endsWith('.')){
            testoPulito+='.';
        }
        return testoPulito;
    };

    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [edizioni]=await connection.execute(querySelect);
        //ciclo di correzione
        for(const edizione of edizioni){
            //correzione "descrizione" e "note"
            const descrizioneCorretta=correggiTesto(edizione.descrizione);
            const noteCorrette=correggiTesto(edizione.note);
            if(descrizioneCorretta!==edizione.descrizione || noteCorrette!==edizione.note){
                //aggiorno edizione
                await connection.execute(queryUpdate, [descrizioneCorretta, noteCorrette, edizione.collocazione]);
                //annoto la collocazione dell'edizione modificata
                modificati.push(edizione.collocazione);
            }
        }
        await connection.commit();
        if(modificati.length===0){
            return res.status(200).json({
                success: true,
                message: "Nessun errore rilevato per Edizioni e Manoscritti."
            });
        }else{
            const stringa=modificati.join(", ")+".";//lista delle collocazioni per edizioni modificate
            return res.status(200).json({
                success: true,
                message: `Correzione completata con successo! Sono stati corrette le Edizioni/Manoscritti con collocazione: ${stringa}`
            });
        }
    }catch(err){
        await connection.rollback();
        console.error("Errore nell'endpoint PATCH edizioni: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la correzione."
        });
    }finally{
        connection.release();
    }
});

module.exports=router;