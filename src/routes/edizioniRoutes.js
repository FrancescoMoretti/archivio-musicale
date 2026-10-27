const express=require('express');
const router=express.Router();
const fs=require('fs').promises;
const path=require('path');
const pool=require('../config/db');
const {cloudinary, upload, uploadToCloudinary}=require('../config/cloudinary');
const {autenticaToken, autorizzaRuoli, autenticaTokenMorbido}=require('../middleware/auth');
const {validaStringa, validaUrl, escapeHTML, costruisciFiltro, gestioneErroriUpload, createPublicLimiter}=require('express-mysql-cloudinary-kit');
const {costruisciNumeriPagine}=require('../utils/paginazioneListeHtml');
const publicLimiter=createPublicLimiter();

//endpoint per rendering server-side per lettura edizione
router.get('/edizione.html', publicLimiter, async (req, res, next)=>{
    const {collocazione}=req.query;
    //validazione server-side
    if(!collocazione){
        return next();//nessuna collocazione
    }
    //preparazione query
    const query="SELECT id, titolo, autore, data_str, editore, descrizione, note FROM edizioni WHERE collocazione=?";
    const queryImg="SELECT url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY id ASC LIMIT 1";//prendo l'immagine corrispondente con id minore (e prendo una sola immagine)
    try{
        const [result]=await pool.query(query, [collocazione]);
        //nessuna edizione trovata
        if(result.length===0){
            return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
        }
        //edizione trovata
        //estraggo i dati
        const e=result[0];
        //query per l'immagine
        const [resultImg]=await pool.query(queryImg, [e.id]);
        let urlImmagine;
        if(resultImg.length===0){
            //nessuna immagine trovata
            urlImmagine='https://archivio-musicale-luca-moretti.onrender.com/immagini/logo_archivio_rettangolare.webp';
        }else{
            //immagine trovata
            urlImmagine=resultImg[0].url_immagine;
        }
        //costruzione dati
        //titolo
        const titolo=`${e.titolo} - ${e.autore} | Archivio musicale Luca Moretti`;
        //link canonico
        const urlCanonical=`https://archivio-musicale-luca-moretti.onrender.com/edizione.html?collocazione=${encodeURIComponent(collocazione)}`;
        //meta descrizione
        let metaTesto=`${e.titolo} di ${e.autore}`;
        if(e.data_str){
            metaTesto+=`, ${e.data_str}`;
        }
        if(e.editore){
            metaTesto+=`; Editore: ${e.editore}`;
        }
        if(e.descrizione){
            metaTesto+=`. ${e.descrizione}`;
        }
        //pulizia degli spazi e limite a 160 caratteri
        metaTesto=metaTesto.replace(/\s+/g, ' ').trim();
        if(metaTesto.length>160){
            metaTesto=metaTesto.substring(0, 157).trim()+"...";
        }
        //inserisco dati nel file html
        let html=await fs.readFile(path.join(__dirname, '../../public/edizione.html'), 'utf-8');
        html=html.replace('<title>Contenuto | Archivio musicale Luca Moretti</title>', `<title>${escapeHTML(titolo)}</title>\n    <!--SEO globale-->\n    <meta name="description" content="${escapeHTML(metaTesto)}">\n    <link rel="canonical" href="${escapeHTML(urlCanonical)}">\n    <!--Open Graph-->\n    <meta property="og:site_name" content="Archivio musicale Luca Moretti">\n    <meta property="og:title" content="${escapeHTML(titolo)}">\n    <meta property="og:description" content="${escapeHTML(metaTesto)}">\n    <meta property="og:image" content="${escapeHTML(urlImmagine)}">\n    <meta property="og:type" content="article">\n    <meta property="og:url" content="${escapeHTML(urlCanonical)}">`);
        //costruzione scheda
        let scheda="";
        if(e.link_rism && (e.link_rism.startsWith("http://") || e.link_rism.startsWith("https://"))){
            scheda+=`<li><span><a href="${escapeHTML(e.link_rism)}" target="_blank" rel="noopener noreferrer">Link RISM<a/></span></li>`;
        }
        scheda+=`<li><span>Autore</span>: ${escapeHTML(e.autore)}</li>`;
        if(e.data_str){
            scheda+=`<li><span>Data</span>: ${escapeHTML(e.data_str)}</li>`;
        }
        if(e.editore){
            scheda+=`<li><span>Editore</span>: ${escapeHTML(e.editore)}</li>`;
        }
        if(e.descrizione){
            scheda+=`<li><span>Descrizione</span>: ${escapeHTML(e.descrizione)}</li>`;
        }
        if(e.note){
            scheda+=`<li><span>Note</span>: ${escapeHTML(e.note)}</li>`;
        }
        html=html.replace('<li></li>', `<li><h1>${escapeHTML(e.titolo)}</h1></li>${scheda}`);
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }catch(err){
        console.error("Errore nel rendering server-side di edizione.html: ", err);
        next(err);
    }
});

//endpoint per rendering server-side per lista edizioni
router.get('/lista_edizioni.html', publicLimiter, async (req, res, next)=>{
    const righe=10;//righe di tabella per ogni pagina
    const urlBase='https://archivio-musicale-luca-moretti.onrender.com/lista_edizioni.html';
    //pagina richiesta: se non specificata=>1; se non valida=>404
    let pagina=1;
    if(req.query.pagina!==undefined){
        pagina=parseInt(req.query.pagina, 10);
        if(!pagina || pagina<1){
            return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
        }
    }
    const inizio=(pagina-1)*righe;
    //preparazione query
    const queryTotali="SELECT COUNT(*) AS totali FROM edizioni";
    const queryContenuti="SELECT collocazione, titolo, autore FROM edizioni ORDER BY autore ASC, id ASC LIMIT ? OFFSET ?";
    try{
        const [[{totali}]]=await pool.query(queryTotali, [righe, inizio]);
        const numeroPagine=Math.ceil(totali/righe);//parte intera superiore
        //nessuna edizione: pagina esistente ma vuota (gestita da frontend)
        if(totali<1 && pagina===1){
            return next();
        }
        //pagina oltre l'ultima
        if(pagina>numeroPagine){
            return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
        }
        const [contenuti]=await pool.query(queryContenuti, [righe, inizio]);
        //righe della tabella
        const tab="    ";
        const tab4=tab+tab+tab+tab;
        const tab5=tab4+tab;//indentazione
        let corpoTabella="\n";
        contenuti.forEach(c=>{
            const link=`/edizione.html?collocazione=${encodeURIComponent(c.collocazione)}`;
            corpoTabella+=`${tab5}<tr><td class="nome-autore">${escapeHTML(c.autore)}</td><td><a href="${escapeHTML(link)}">${escapeHTML(c.titolo)}</a></td><td></td></tr>\n`;
        });
        corpoTabella+=tab4;
        //link a tutte le pagine
        const linkPagine=costruisciNumeriPagine(numeroPagine, pagina, '/lista_edizioni.html');
        let html=await fs.readFile(path.join(__dirname, '../../public/lista_edizioni.html'), 'utf-8');
        html=html.replace('<!--corpo della tabella-->', ()=>corpoTabella);
        html=html.replace('<!--link alle pagine-->', ()=>linkPagine);
        //dalla seconda pagina titolo, canonical e og devono cambiare
        if(pagina>1){
            const urlPagina=`${urlBase}?pagina=${pagina}`;
            html=html.replace(`<title>Edizioni e Manoscritti | Archivio musicale Luca Moretti</title>`, ()=>`<title>Edizioni e Manoscritti - Pagina ${pagina} | Archivio musicale Luca Moretti</title>`);
            html=html.replace(`<link rel="canonical" href="${urlBase}">`, ()=>`<link rel="canonical" href="${urlPagina}">`);
            html=html.replace(`<meta property="og:url" content="${urlBase}">`, ()=>`<meta property="og:url" content="${urlPagina}">`);
        }
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }catch(err){
        console.error("Errore nel rendering server-side di lista_edizioni.html: ", err);
        next();//servo il file statico
    }
});

//endpoint per inserimento edizione
router.post("/api/edizione", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array("immagini"), async (req, res)=>{
    let {collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note}=req.body;
    const userId=req.utente.id;//id dell'utente che sta creando il contenuto
    const files=req.files;//immagini
    //validazione server-side
    //campi obbligatori
    if(!collocazione || !String(collocazione).trim() || !titolo || !String(titolo).trim() || !autore || !String(autore).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (collocazione, autore, titolo)."
        });//400: richiesta mal formata
    }
    collocazione=collocazione.trim();
    titolo=titolo.trim();
    autore=autore.trim();
    //campi facoltativi
    link_rism=validaUrl(link_rism);
    if(link_rism===false){
        return res.status(400).json({
            success: false,
            message: "Link RISM non valido."
        });
    }
    data_str=validaStringa(data_str);
    editore=validaStringa(editore);
    descrizione=validaStringa(descrizione);
    note=validaStringa(note);
    let publicIds=[];//id pubblici delle immagini caricate su cloudinary
    //preparazione query
    const queryEdizione=`INSERT INTO edizioni (collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryImmagine=`INSERT INTO immagini_edizioni (edizione_id, url_immagine) VALUES (?, ?)`;
    const connection=await pool.getConnection();
    try{
        await connection.beginTransaction();
        const [result]=await connection.execute(queryEdizione, [collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note, userId]);
        //edizione non inserita => lascio che vada nel catch
        const edizioneId=result.insertId;//id dell'edizione inserita
        //caricamento immagini su cloudinary
        if(files && files.length>0){
            for(let i=0; i<files.length; i++){
                const file=files[i];
                const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "edizioni");
                publicIds.push(publicId);
                await connection.execute(queryImmagine, [edizioneId, imageUrl, i+1]);
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
        console.error("Errore nell'endpoint POST edizione: ", err);
        if(err.code==='ER_DUP_ENTRY'){
            return res.status(400).json({
                success: false,
                message: "Errore: collocazione è già esistente." });
        }
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il salvataggio." });
    }finally{
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
    //preparazione query
    const queryImmagini="SELECT i.url_immagine FROM immagini_edizioni i JOIN edizioni e ON i.edizione_id=e.id WHERE e.collocazione=?";
    const queryEdizioni="DELETE FROM edizioni WHERE collocazione=?";
    try{
        const [immagini]=await pool.query(queryImmagini, [collocazione]);
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
        const [result]=await pool.query(queryEdizioni, [collocazione]);
        //le immagini si cancellano a cascata
        //cancellazione non avvenuta
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Edizione non presente nel database."
            });
        }
        //cancellazione avvenuta
        return res.json({
            success: true,
            message: "Edizione eliminata con successo!"
        });
    }catch(err){
        console.error("Errore nell'endpoint DELETE edizione: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

//endpoint per lista edizioni
router.get("/api/edizioni", publicLimiter, async (req, res)=>{
    const {limit, offset, filtro}=req.query;
    const limite=parseInt(limit, 10) || 5;//converto in intero base 10, oppure assegno 5
    const inizio=parseInt(offset, 10) || 0;//converto in intero base 10, oppure assegno 0
    //query per contare le righe che avrà la tabella
    let queryTotali="SELECT COUNT(*) AS totali FROM edizioni e";
    //query per estrarre contenuti e url dell'immagine, uso left join per estrarre anche edizioni senza immagini
    let queryContenuti=`SELECT e.id, e.collocazione, e.titolo, e.autore, i.url_immagine FROM edizioni e LEFT JOIN immagini_edizioni i ON i.id=(SELECT MIN(i2.id) FROM immagini_edizioni i2 WHERE i2.edizione_id=e.id)`;
    let paramsContenuti=[];
    let paramsTotali=[];
    //gestione filtro
    const {whereClause, parametri}=costruisciFiltro(["e.autore", "e.titolo"], filtro);
    queryTotali+=whereClause;
    queryContenuti+=whereClause;
    paramsTotali.push(...parametri);//...<=>spread operator: parametri è un array e con "..." davanti vengono passati gli elementi che contiene separatamente
    paramsContenuti.push(...parametri);//...<=>spread operator: parametri è un array e con "..." davanti vengono passati gli elementi che contiene separatamente
    //gestione ordinamento
    queryContenuti+=" ORDER BY e.autore ASC, e.id ASC LIMIT ? OFFSET ?";//spazio all'inizio
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
        console.error("Errore nell'endpoint GET edizioni: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero delle edizioni."
        });
    }
});

//endpoint per lettura edizione
router.get("/api/edizione/:collocazione", publicLimiter, autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res)=>{
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
    const queryImmagini="SELECT url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY id ASC";
    try{
        const [edizioneRisultato]=await pool.query(queryContenuti, [collocazione]);
        //risorsa non trovata
        if(edizioneRisultato.length===0){
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
            immagini: listaUrlImmagini
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
    //campi obbligatori
    if(!titolo || !String(titolo).trim() || !autore || !String(autore).trim()){
        return res.status(400).json({
            success: false,
            message: "Campi obbligatori mancanti (autore, titolo)."
        });
    }
    titolo=titolo.trim();
    autore=autore.trim();
    //campi facoltativi
    link_rism=validaUrl(link_rism);
    if(link_rism===false){
        return res.status(400).json({
            success: false,
            message: "Link RISM non valido."
        });
    }
    data_str=validaStringa(data_str);
    editore=validaStringa(editore);
    descrizione=validaStringa(descrizione);
    note=validaStringa(note);
    //preparazione query
    const query="UPDATE edizioni SET link_rism=?, autore=?, titolo=?, data_str=?, editore=?, descrizione=?, note=?, updated_by=? WHERE collocazione=?";
    try{
        const [result]=await pool.query(query, [link_rism, autore, titolo, data_str, editore, descrizione, note, userId, collocazione]);
        //aggiornamento non avvenuto
        if(result.affectedRows===0){
            return res.status(404).json({
                success: false,
                message: "Contenuto non trovato."
            });//404: not found
        }
        //aggiornamento avvenuto
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
    const userId=req.utente.id;//id dell'utente che sta facendo la correzione
    //preparazione query
    const querySelect="SELECT collocazione, descrizione, note FROM edizioni";
    const queryUpdate="UPDATE edizioni SET descrizione=?, note=?, updated_by=? WHERE collocazione=?";
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
                await connection.execute(queryUpdate, [descrizioneCorretta, noteCorrette, userId, edizione.collocazione]);
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

//endpoint per lista immagini edizione
router.get("/api/edizione/:collocazione/immagini", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), async (req, res)=>{
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
    const queryEdizione="SELECT id FROM edizioni WHERE collocazione=?";
    const queryImmagini="SELECT id, url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY id";
    try{
        const [resultEdizione]=await pool.query(queryEdizione, [collocazione]);
        //edizione non trovata
        if(resultEdizione.length===0){
            return res.status(404).json({
                success: false,
                message: "Edizione non trovata."
            });//404: not found
        }
        //edizione trovata
        const id=resultEdizione[0].id;//estraggo l'id dell'edizione
        const [resultImmagini]=await pool.query(queryImmagini, [id]);
        //immagini trovate (vale anche se sono 0)
        return res.json({
            success: true,
            immagini: resultImmagini
        });
    }catch(err){
        console.error("Errore nell'endpoint GET edizione/:collocazione/immagini: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero delle immagini."
        });
    }
});

//endpoint per inserimento immagine edizione
router.post("/api/edizione/:collocazione/immagine", autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), upload.array('immagini'), async (req, res)=>{
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
    const queryImmagini="INSERT INTO immagini_edizioni (edizione_id, url_immagine) VALUES(?, ?)";
    const queryEdizione="SELECT id FROM edizioni WHERE collocazione=?";
    let id=null;
    try{
        const [resultEdizione]=await pool.query(queryEdizione, [collocazione]);
        //edizione non trovata
        if(resultEdizione.length===0){
            return res.status(404).json({
                success: false,
                message: "Edizione non trovata."
            });
        }
        id=resultEdizione[0].id;//estraggo l'id dell'edizione
    }catch(err){
        console.error("Errore nell'endpoint POST edizione/:collocazione/immagine: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero dell'edizione."
        });
    }
    //edizione trovata
    //se ho una sola immagine
    if(files.length===1){
        let idCloudinary=null;
        try{
            //caricament su cloudinary
            const file=files[0];
            const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "edizioni");
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
            console.error("Errore nell'endpoint POST edizione/:collocazione/immagine: ", err);
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
            const {imageUrl, publicId}=await uploadToCloudinary(file.buffer, "edizioni");
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
        console.error("Errore nell'endpoint POST edizione/:collocazione/immagine: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante l'inserimento."
        });
    }finally{
        connection.release();   
    }
});

//endpoint per cancellazione immagine edizione
router.delete("/api/edizione/:collocazione/immagine/:id", autenticaToken, autorizzaRuoli("superadmin", "admin", "editor"), async (req, res)=>{
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
    const queryEdizione="SELECT id FROM edizioni WHERE collocazione=?";
    let idEdizione=null;
    const queryImmagine="SELECT url_immagine FROM immagini_edizioni WHERE id=? AND edizione_id=?";
    const queryCancellazione="DELETE FROM immagini_edizioni WHERE id=?";
    try{
        const [resultEdizione]=await pool.query(queryEdizione, [collocazione]);
        //edizione non trovata
        if(resultEdizione.length===0){
            return res.status(404).json({
                success: false,
                message: "Edizione non trovata."
            });
        }
        idEdizione=resultEdizione[0].id;//estraggo l'id dell'edizione
    }catch(err){
        console.error("Errore nell'endpoint DELETE edizione/:collocazione/immagine/:id: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il recupero dell'edizione."
        });
    }
    //edizione trovata
    try{
        const [resultImmagine]=await pool.query(queryImmagine, [id, idEdizione]);
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
        const publicId=`archivio_musicale/edizioni/${nomeFile}`;
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
        console.error("Errore nell'endpoint DELETE edizione/:collocazione/immagine/:id: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la cancellazione."
        });
    }
});

router.use(gestioneErroriUpload);//gestione di errori durante l'upload delle immagini

module.exports=router;