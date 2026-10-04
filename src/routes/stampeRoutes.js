const express=require('express');
const router=express.Router();
const fs=require('fs').promises;
const path=require('path');
const pool=require('../config/db');
const {cloudinary, upload, uploadToCloudinary}=require('../config/cloudinary');
const {autenticaToken, autorizzaRuoli, autenticaTokenMorbido}=require('../middleware/auth');
const {validaStringa, escapeHTML, costruisciFiltro, gestioneErroriUpload, createPublicLimiter}=require('express-mysql-cloudinary-kit');
const publicLimiter=createPublicLimiter();

//endpoint per rendering server-side per lettura stampa
router.get("/stampa.html", publicLimiter, async (req, res, next)=>{
    const {collocazione}=req.query;
    //validazione server-side
    if(!collocazione){
        return next();//nessuna collocazione
    }
    //preparazione query
    const query="SELECT id, titolo, autore, data_str, stampa, dimensioni FROM stampe WHERE collocazione=?";
    const queryImg="SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY id ASC LIMIT 1";
    try{
        const [result]=await pool.query(query, [collocazione]);
        //nessuna stampa trovata
        if(result.length===0){
            return next();
        }
        //stampa trovata
        //estraggo i dati
        const s=result[0];
        //query per l'immagine
        const [resultImg]=await pool.query(queryImg, [s.id]);
        let urlImmagine
        if(resultImg.length===0){
            //nessuna immagine trovata
            urlImmagine='https://archivio-musicale-luca-moretti.onrender.com/immagini/logo_archivio_rettangolare.webp';
        }else{
            //immagine trovata
            urlImmagine=resultImg[0].url_immagine;
        }
        //costruzione dati
        //titolo
        const titolo=`${s.titolo} - ${s.autore} | Archivio musicale Luca Moretti`;
        //link canonico
        const urlCanonical=`https://archivio-musicale-luca-moretti.onrender.com/stampa.html?collocazione=${encodeURIComponent(collocazione)}`;
        //meta descrizione
        let metaTesto=`${s.titolo} di ${s.autore}`;
        if(s.data_str){
            metaTesto+=`, ${s.data_str}`;
        }
        if(s.stampa){
            metaTesto+=`. Tecnica: ${s.stampa}`;
        }
        if(s.dimensioni){
            metaTesto+=`. Dimensioni: ${s.dimensioni}.`;
        }
        //pulizia degli spazi e limite a 160 caratteri
        metaTesto=metaTesto.replace(/\s+/g, ' ').trim();
        if(metaTesto.length>160){
            metaTesto=metaTesto.substring(0, 157).trim()+"...";
        }
        //inserisco dati nel file html
        let html=await fs.readFile(path.join(__dirname, '../../public/stampa.html'), 'utf-8');
        html=html.replace('<title>Contenuto | Archivio musicale Luca Moretti</title>', `<title>${escapeHTML(titolo)}</title>\n    <!--SEO globale-->\n    <meta name="description" content="${escapeHTML(metaTesto)}">\n    <link rel="canonical" href="${escapeHTML(urlCanonical)}">\n    <!--Open Graph-->\n    <meta property="og:site_name" content="Archivio musicale Luca Moretti">\n    <meta property="og:title" content="${escapeHTML(titolo)}">\n    <meta property="og:description" content="${escapeHTML(metaTesto)}">\n    <meta property="og:image" content="${escapeHTML(urlImmagine)}">\n    <meta property="og:type" content="article">\n    <meta property="og:url" content="${escapeHTML(urlCanonical)}">`);
        html=html.replace('<h1></h1>', `<h1>${escapeHTML(s.titolo)}</h1>`);
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }catch(err){
        console.error("Errore nel rendering server-side di stampa.html: ", err);
        next(err);
    }
});

//endpoint per inserimento stampa
router.post("/api/stampa", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    let {collocazione, autore, titolo, data_str, stampa, dimensioni}=req.body;
    const userId=req.utente.id;//id dell'utente che sta creando il contenuto
    const files=req.files;//immagini
    //validazione server-side
    //campi obbligatori
    if(!collocazione || !String(collocazione).trim() || !autore || !String(autore).trim() || !titolo || !String(titolo).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });
    }
    collocazione=collocazione.trim();
    autore=autore.trim();
    titolo=titolo.trim();
    //campi facoltativi
    data_str=validaStringa(data_str);
    stampa=validaStringa(stampa);
    dimensioni=validaStringa(dimensioni);
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    //preparazione query
    const queryStampa=`INSERT INTO stampe(collocazione, autore, titolo, data_str, stampa, dimensioni, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_stampe(stampa_id, url_immagine) VALUES (?, ?)`;
    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [result]=await connection.execute(queryStampa, [collocazione, autore, titolo, data_str, stampa, dimensioni, userId]);
        const stampaId=result.insertId;//id della stampa inserita
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
        if(err.code==='ER_DUP_ENTRY'){
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
router.get("/api/stampe", publicLimiter, async (req, res)=>{
    const {limit, offset, filtro}=req.query;
    const limite=parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio=parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //query per contare le righe che avrà la tabella
    let queryTotali=`SELECT COUNT(*) AS totali FROM stampe s`;
    //query per estrarre contenuti e url dell'immagine, uso left join per estrarre stampe senza immagine
    let queryContenuti=`SELECT s.id, s.collocazione, s.autore, s.titolo, i.url_immagine FROM stampe s LEFT JOIN immagini_stampe i ON i.id=(SELECT MIN(i2.id) FROM immagini_stampe i2 WHERE i2.stampa_id=s.id)`;
    let paramsContenuti=[];
    let paramsTotali=[];
    //gestione filtro
    const {whereClause, parametri}=costruisciFiltro(["s.autore", "s.titolo"], filtro);
    queryTotali+=whereClause;
    queryContenuti+=whereClause;
    paramsTotali.push(...parametri);//...<=>spread operator: parametri è un array e con "..." davanti vengono passati gli elementi che contiene separatamente
    paramsContenuti.push(...parametri);//...<=>spread operator: parametri è un array e con "..." davanti vengono passati gli elementi che contiene separatamente
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
router.get("/api/stampa/:collocazione", publicLimiter, autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res)=>{
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
    const queryImmagini="SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY id ASC";
    try{
        const [stampaRisultato]=await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if(stampaRisultato.length===0){
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
            immagini: listaUrlImmagini
        });
    }catch(err){
        console.error("Errore nell'endpoint GET stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della risorsa."
        });
    }
});

//endpoint per aggiornamento stampa
router.put("/api/stampa/:collocazione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    let {autore, titolo, data_str, stampa, dimensioni}=req.body;
    const userId=req.utente.id;//id dell'utente che sta modificando il contenuto
    //validazione server-side
    //campi obbligatori
    if(!autore || !String(autore).trim() || !titolo || !String(titolo).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    autore=autore.trim();
    titolo=titolo.trim();
    //campi facoltativi
    data_str=validaStringa(data_str);
    stampa=validaStringa(stampa);
    dimensioni=validaStringa(dimensioni);
    const query="UPDATE stampe SET autore=?, titolo=?, data_str=?, stampa=?, dimensioni=?, updated_by=? WHERE collocazione=?";
    try{
        const [result]=await pool.query(query, [autore, titolo, data_str, stampa, dimensioni, userId, collocazione]);
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Stampa/Foto non trovata."
            });
        }
        return res.json({
            success: true,
            message: "Stampa/Foto aggiornata con successo!"
        });
    }catch(err){
        console.error("Errore nell'endpoint PUT stampa: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'aggiornamento della risorsa."
        });
    }
});

//endpoint per lista immagini stampa
router.get("/api/stampa/:collocazione/immagini", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
    const {collocazione}=req.params;
    //validazione server-side
    //campi obbligatori
    if(!collocazione || !String(collocazione).trim()){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });
    }
    //preparazione query
    const queryStampa="SELECT id FROm stampe WHERE collocazione=?";
    const queryImmagini="SELECT id, url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY id";
    try{
        const [resultStampa]=await pool.query(queryStampa, [collocazione]);
        //stampa non trovata
        if(resultStampa.length===0){
            return res.status(404).json({
                success: false,
                message: " non trovata."
            });//404: not found
        }
        //stampa trovata
        const id=resultStampa[0].id;//estraggo l'id della stampa
        const [resultImmagini]=await pool.query(queryImmagini, [id]);
        //immagini trovate (vale anche se sono 0)
        return res.json({
            success: true,
            immagini: resultImmagini
        });
    }catch(err){
        console.error("Errore nell'endpoint GET stampa/:collocazione/immagini: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero delle immagini."
        });
    }
});

//endpoint per inserimento immagine stampa
router.post("/api/stampa/:collocazione/immagine", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array('immagini'), async (req, res)=>{
    let {collocazione}=req.params;
    let files=req.files;//immagini
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });//400: bad request
    }
    //nessuna immagine inserita
    if(!files || files.length===0){
        return res.status(400).json({
            success: false,
            message: "Nessuna immagine fornita."
        });//400: bd request
    }
    //preparazione query
    const queryImmagini="INSERT INTO immagini_stampe (stampa_id, url_immagine) VALUES(?, ?)";
    const queryStampa="SELECT id FROM stampe WHERE collocazione=?";
    let id=null;
    try{
        const [resultStampa]=await pool.query(queryStampa, [collocazione]);
        //stampa non trovata
        if(resultStampa.length===0){
            return res.status(404).json({
                success: false,
                message: "Stampa non trovata."
            });
        }
        id=resultStampa[0].id;//estraggo l'id della stampa
    }catch(err){
        console.error("Errore nell'endpoint POST stampa/:collocazione/immagine: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della stampa."
        });
    }
    //stampa trovata
    //se ho una sola immagine
    if(files.length===1){
        let idCloudinary=null;
        try{
            //caricament su cloudinary
            const file=files[0];
            const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "stampe");
            idCloudinary=publicId;
            //query inserimento immagine
            await pool.query(queryImmagini, [id, imageUrl]);
            return res.json({
                success: true,
                message: "Immagine inserita con successo!"
            });
        }catch(err){
            try{
                if(idCloudinary){
                    await cloudinary.uploader.destroy(idCloudinary);
                    console.log("Pulizia dell'immagine parzialmente caricata su Cloudinary completata.");
                }
            }catch(cloudinaryErr){
                console.error("Errore durante la pulizia di Cloudinary: ", cloudinaryErr);
            }
            console.error("Errore nell'endpoint POST stampa/:collocazione/immagine: ", err);
            return res.status(500).json({
                success: false,
                message: "Errore interno durante l'inserimento."
            });
        }
    }
    //se ho più immagini => uso connection
    const connection=await pool.getConnection();
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    try{
        await connection.beginTransaction();
        //caricamento delle immagini su cloudinary
        for(let i=0; i<files.length; i++){
            const file=files[i];
            const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "stampe");
            publicIds.push(publicId);
            //query inserimento immagine
            await connection.execute(queryImmagini, [id, imageUrl]);
        }
        await connection.commit();
        return res.json({
            success: true,
            message: "Immagini inserite con successo!"
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
        console.error("Errore nell'endpoint POST stampa/:collocazione/immagine: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'inserimento."
        });
    }finally{
        connection.release();   
    }
});

//endpoint per cancellazione immagine stampa
router.delete("/api/stampa/:collocazione/immagine/:id", autenticaToken, autorizzaRuoli("superadmin", "admin", "editor"), async (req, res)=>{
    const {collocazione, id}=req.params;
    //validazione server-side
    if(!collocazione || !String(collocazione).trim()){
        return res.status(400).json({
            success: false,
            message: "Collocazione non valida."
        });//400: bad request
    }
    if(!id || !String(id).trim()){
        return res.status(400).json({
            success: false,
            message: "Id dell'immagine non valido."
        });//400: bad request
    }
    //preparazione query
    const queryStampa="SELECT id FROM stampe WHERE collocazione=?";
    let idStampa=null;
    const queryImmagine="SELECT url_immagine FROM immagini_stampe WHERE id=? AND stampa_id=?";
    const queryCancellazione="DELETE FROM immagini_stampe WHERE id=?";
    try{
        const [resultStampa]=await pool.query(queryStampa, [collocazione]);
        //stampa non trovata
        if(resultStampa.length===0){
            return res.status(404).json({
                success: false,
                message: "Stampa non trovata."
            });
        }
        idStampa=resultStampa[0].id;//estraggo l'id della stampa
    }catch(err){
        console.error("Errore nell'endpoint DELETE stampa/:collocazione/immagine/:id: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero della stampa."
        });
    }
    //stampa trovata
    try{
        const [resultImmagine]=await pool.query(queryImmagine, [id, idStampa]);
        //immagine non trovata
        if(resultImmagine.length===0){
            return res.status(404).json({
                success: false,
                message: "Immagine non trovata."
            });//404: not found
        }
        //immagine trovata
        //estraggo il public_id dall'url dell'immagine ('.../v12345/campione.jpg'=>'campione')
        const nomeFile=resultImmagine[0].url_immagine.split('/').pop().split('.')[0];
        const publicId=`archivio_musicale/stampa/${nomeFile}`;
        //cancello immagine da cloudinary
        await cloudinary.uploader.destroy(publicId);
        //cancello immagine dal DB
        const [resultCancellazione]=await pool.query(queryCancellazione, [id]);
        //cancellazione non avvenuta
        if(resultCancellazione.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Immagine non presente nel database."
            });//404: not found
        }
        //cancellazione avvenuta
        return res.json({
            success: true,
            message: "Immagine eliminata con successo"
        });
    }catch(err){
        console.error("Errore nell'endpoint DELETE stampa/:collocazione/immagine/:id: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

router.use(gestioneErroriUpload);//gestione di errori durante l'upload delle immagini

module.exports=router;