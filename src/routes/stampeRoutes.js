const express=require('express');
const router=express.Router();

const pool=require('../db');
const {cloudinary, upload, uploadToCloudinary}=require('../cloudinaryConfig');
const {autenticaToken, autorizzaRuoli, autenticaTokenMorbido}=require('../middleware/auth');

//endpoint per inserimento stampa
router.post("/api/stampa", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    let {collocazione, autore, titolo, data_str, stampa, dimensioni}=req.body;
    const userId=req.utente.id;//id dell'utente che sta creando il contenuto
    const files=req.files;//immagini
    //validazione server-side
    if(!collocazione || !String(collocazione).trim() || !autore || !String(autore).trim() || !titolo || !String(titolo).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!data_str || !String(data_str).trim()){
        data_str=null;
    }
    if(!stampa || !String(stampa).trim()){
        stampa=null;
    }
    if(!dimensioni || !String(dimensioni).trim()){
        dimensioni=null;
    }
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    //preparazione query
    const queryStampa=`INSERT INTO stampe(collocazione, autore, titolo, data_str, stampa, dimensioni, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_stampe(stampa_id, url_immagine, ordine) VALUES (?, ?, ?)`;
    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [result]=await connection.execute(queryStampa, [collocazione, autore, titolo, data_str, stampa, dimensioni, userId]);
        const stampaId = result.insertId;//id della stampa inserita
        //caricamento delle immagini su cloudinary
        if(files && files.length>0){
            for(let i=0; i<files.length; i++){
                const file=files[i];
                const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "stampe");
                publicIds.push(publicId);
                await connection.execute(queryImmagine, [stampaId, imageUrl, i+1]);
            }
        }
        await connection.commit();
        return res.status(201).json({
            success: true,
            message: "Contenuto salvato con successo!"
        });
    }catch(err){
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
        console.error("Errore nell'endpoint POST stampa: ", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Errore: il numero identificativo è già esistente." });
        }
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il salvataggio."
        });
    }finally{
        connection.release();
    }
});

//endpoint per cancellazione stampa
router.delete("/api/stampa/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
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
        console.error("Errore nell'endpoint DELETE stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per lista stampe
router.get("/api/stampe", async (req, res)=>{
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
        return res.json({
            success: true,
            contenuti: righe,
            totali: totali
        });
    }catch(err){
        console.error("Errore nell'endpoint GET stampe: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero delle stampe."
        });
    }
});

//endpoint per lettura stampa
router.get("/api/stampa/:collocazione", autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res) => {
    const {collocazione}=req.params;
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });
    }
    let campiSelect="id, titolo, autore, data_str, stampa, dimensioni";
    //se l'utente è addetto => recupero anche la collocazione
    if(req.addetto){
        campiSelect+=", collocazione";
    }
    const queryContenuti=`SELECT ${campiSelect} FROM stampe WHERE collocazione=?`;
    const queryImmagini="SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY ordine ASC";
    try {
        const [stampaRisultato]=await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if (stampaRisultato.length===0) {
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        const content=stampaRisultato[0];
        //recupero le immagini della risorsa
        const [immaginiRisultato]=await pool.query(queryImmagini, [content.id]);
        const listaUrlImmagini=immaginiRisultato.map(riga => riga.url_immagine);
        return res.json({
            success: true,
            content: content,
            immagini: listaUrlImmagini,
            n_immagini: listaUrlImmagini.length
        });
    } catch (err) {
        console.error("Errore nell'endpoint GET stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento stampa
router.put("/api/stampa/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res) => {
    const {collocazione}=req.params;
    let {autore, titolo, data_str, stampa, dimensioni}=req.body;
    const userId=req.utente.id;//id dell'utente che sta modificando il contenuto
    //validazione server-side
    if (!autore || !String(autore).trim() || !titolo || !String(titolo).trim()) {
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!data_str || !String(data_str).trim()){
        data_str=null;
    }
    if(!stampa || !String(stampa).trim()){
        stampa=null;
    }
    if(!dimensioni || !String(dimensioni).trim()){
        dimensioni=null;
    }
    const query = "UPDATE stampe SET autore=?, titolo=?, data_str=?, stampa=?, dimensioni=?, updated_by=? WHERE collocazione=?";
    try {
        const [result]=await pool.query(query, [autore, titolo, data_str, stampa, dimensioni, userId, collocazione]);
        if (result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        return res.json({
            success: true,
            message: "Stampa/Foto aggiornata con successo!"
        });
    } catch (err) {
        console.error("Errore nell'endpoint PUT stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della risorsa."
        });
    }
});

module.exports=router;