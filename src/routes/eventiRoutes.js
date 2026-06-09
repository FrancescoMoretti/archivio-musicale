const express=require('express');
const router=express.Router();

const pool=require('../db');
const {cloudinary, upload, uploadToCloudinary}=require('../cloudinaryConfig');
const {autenticaToken, autorizzaRuoli}=require('../middleware/auth');

//endpoint per inserimento evento
router.post("/api/evento", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    let {codice, link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine}=req.body;
    const userId=req.utente.id;//id dell'utente che sta creando il contenuto
    const files=req.files;//immagini
    //validazione server-side
    if(!codice || !String(codice).trim() || !titolo || !String(titolo).trim() || !descrizione || !String(descrizione).trim() || !data_inizio || !String(data_inizio).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (codice, titolo, descrizione e data di inizio)."
        });
    }
    if(files && files.length>2){
        return res.status(400).json({
            success: false,
            message: "Puoi caricare al massimo 2 immagini per evento."
        });
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!link_evento || !String(link_evento).trim()){
        link_evento=null;
    }
    if(!link_facebook || !String(link_facebook).trim()){
        link_facebook=null;
    }
    if(!link_instagram || !String(link_instagram).trim()){
        link_instagram=null;
    }
    if(!data_fine || !String(data_fine).trim()){
        data_fine=null;
    }
    //controllo data_finale>data_iniziale
    if(data_fine && new Date(data_fine)< new Date(data_inizio)){
        return res.status(400).json({
            success: false,
            message: "La data di fine è antecedente alla data di inizio."
        });
    }
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    //preparazione query
    const queryEvento=`INSERT INTO eventi(codice, link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_eventi(evento_id, url_immagine, ordine) VALUES (?, ?, ?)`;
    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [result]=await connection.execute(queryEvento, [codice, link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine, userId]);
        const eventoId=result.insertId;//id dell'evento inserito
        //caricamento delle immagini su cloudinary
        if(files && files.length>0){
            for(let i=0; i<files.length; i++){
                const file=files[i];
                const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "eventi");
                publicIds.push(publicId);
                await connection.execute(queryImmagine, [eventoId, imageUrl, i+1]);
            }
        }
        await connection.commit();
        return res.status(201).json({
            success: true,
            message: "Evento salvato con successo!"
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
        console.error("Errore nell'endpoint POST evento: ", err);
        if(err.code==='ER_DUP_ENTRY'){
            return res.status(400).json({
                success: false,
                message: "Errore: il codice è già esistente."
            });
        }
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il salvataggio."
        });
    }
    finally{
        connection.release();
    }
});

//endpoint per cancellazione evento
router.delete("/api/evento/:codice", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {codice}=req.params;
    //validazione server-side
    if(!codice || !String(codice).trim()){
        return res.status(400).json({
            success: false,
            message: "Codice non valido."
        });
    }
    try{
        const [immagini]=await pool.query("SELECT i.url_immagine FROM immagini_eventi i JOIN eventi e ON i.evento_id=e.id WHERE e.codice=?", [codice]);
        if(immagini.length>0){
            const publicIds=immagini.map(img=>{
                //estraggo il public_id dall'url dell'immagine
                const nomeFile=img.url_immagine.split('/').pop().split('.')[0];
                return `archivio_musicale/eventi/${nomeFile}`;
            });
            //cancello le immagini da cloudinary
            await cloudinary.api.delete_resources(publicIds);
        }
        //cancello il contenuto dal DB
        const [result]=await pool.query("DELETE FROM eventi WHERE codice=?", [codice]);
        //le immagini si cancellano a cascata
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Evento non presente nel database."
            });
        }else{
            return res.json({
                success: true,
                message: "Evento cancellato con successo!"
            });
        }
    }catch(err){
        console.error("Errore nell'endpoint DELETE evento: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per visualizzare eventi
router.get("/api/show-eventi", async (req, res)=>{
    const {limit, offset}=req.query;
    const limite=parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio=parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //preparazione query
    //query per prendere gli eventi da mostrare
    const queryEventi="SELECT id, codice, link_evento, link_facebook, link_instagram, titolo, descrizione, DATE_FORMAT(data_inizio, '%d/%m/%Y') AS data_inizio, DATE_FORMAT(data_fine, '%d/%m/%Y') AS data_fine FROM eventi ORDER BY eventi.data_inizio DESC LIMIT ? OFFSET ?";
    //query per sapere se ci sono altri eventi
    const queryCount="SELECT COUNT(*) AS totale FROM eventi";
    const connection=await pool.getConnection();//uso connection perché devo fare 3 query
    try{
        const [eventi]=await connection.query(queryEventi, [limite, inizio]);
        if(eventi.length===0){
            return res.status(404).json({
                success: false,
                message: "Nessun evento trovato."
            });
        }
        const eventiIds=eventi.map(evento=>evento.id);//costruisco array con id degli eventi
        //query per estrarre le immagini degli eventi da mostarre
        const queryImmagini=`SELECT evento_id, url_immagine, ordine FROM immagini_eventi WHERE evento_id IN (${eventiIds.map(()=>'?').join(',')}) ORDER BY ordine ASC`;
        const [immagini]=await connection.execute(queryImmagini, eventiIds);
        //associo immagini al rispettivo evento
        const eventiDaMostrare=eventi.map(evento=>{
            return {
                id: evento.id,
                codice: evento.codice,
                link_evento: evento.link_evento,
                link_facebook: evento.link_facebook,
                link_instagram: evento.link_instagram,
                titolo: evento.titolo,
                descrizione: evento.descrizione,
                data_inizio: evento.data_inizio,
                data_fine: evento.data_fine,
                immagini: immagini.filter(img=>img.evento_id===evento.id).map(img=>img.url_immagine)
            };
        });
        const [[{totale}]]=await connection.execute(queryCount);
        const altri=inizio+eventi.length<totale;//true=>ce ne sono altri; false=>sono finiti
        return res.json({
            success: true,
            eventi: eventiDaMostrare,
            altri: altri
        });
    }catch(err){
        console.error("Errore nell'endpoint evento: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero degli eventi."
        });
    }finally{
        connection.release();
    }
});

//endpoint per recupero dati evento
router.get("/api/get-evento/:codice", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {codice}=req.params;
    //validazione server-side
    if(!codice || !String(codice).trim()){
        return res.status(400).json({
            success: false,
            message: "Codice non valido."
        });
    }
    try{
        const [rows]=await pool.query("SELECT id, codice, link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine FROM eventi WHERE codice=?", [codice]);
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Evento non trovato."
            });
        }
        res.json({
            success: true,
            dati: rows[0]
        });
    }catch(err){
        console.error("Errore nell'endpoint get-evento: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento evento
router.put("/api/evento/:codice", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {codice}=req.params;
    let {link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine}=req.body;
    const userId=req.utente.id;//id dell'utente che sta modificando il contenuto
    //validazione server-side
    if(!titolo || !String(titolo).trim() || !descrizione || !String(descrizione).trim() || !data_inizio || !String(data_inizio).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (titolo, descrizione e data di inizio)."
        });
    }
    //setto a null eventuali valori facoltativi vuoti
    if(!data_fine || !String(data_fine).trim()){
        data_fine=null;
    }
    if(!link_evento || !String(link_evento).trim()){
        link_evento=null;
    }
    if(!link_facebook || !String(link_facebook).trim()){
        link_facebook=null;
    }
    if(!link_instagram || !String(link_instagram).trim()){
        link_instagram=null;
    }
    //controllo data_finale>data_iniziale
    if(data_fine && new Date(data_fine)< new Date(data_inizio)){
        return res.status(400).json({
            success: false,
            message: "La data di fine è antecedente alla data di inizio."
        });
    }
    const query="UPDATE eventi SET link_evento=?, link_facebook=?, link_instagram=?, titolo=?, descrizione=?, data_inizio=?, data_fine=?, updated_by=? WHERE codice=?";
    try{
        const [result]=await pool.query(query, [link_evento, link_facebook, link_instagram, titolo, descrizione, data_inizio, data_fine, userId, codice]);
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Evento non trovato."
            });
        }
        return res.json({
            success: true,
            message: "Evento aggiornato con successo!"
        });
    }catch(err){
        console.error("Errore nell'endpoint PUT evento: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della risorsa."
        });
    }
});

module.exports=router;