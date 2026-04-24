require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
        return res.status(400).json({ message: "Campi obbligatori mancanti (collocazione, autore, titolo)" });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const queryEdizione = `
            INSERT INTO edizioni (collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(queryEdizione, [collocazione, link_rism, autore, titolo, data_str, editore, descrizione, note]);
        const edizioneId = result.insertId;//recupero id dell'edizione inserita
        //caricamento immagini su cloudinary
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageUrl = await uploadToCloudinary(file.buffer, "edizioni");
                const queryImmagine = `INSERT INTO immagini_edizioni (edizione_id, url_immagine, ordine) VALUES (?, ?, ?)`;
                await connection.execute(queryImmagine, [edizioneId, imageUrl, i + 1]);
            }
        }
        await connection.commit();
        res.json({ success: true, message: "Edizione e immagini salvate con successo!" });
    } catch (err) {
        await connection.rollback();
        console.error("Errore nell'endpoint add-edizione: ", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Errore: il numero di collocazione è già esistente." });
        }
        res.status(500).json({ message: "Errore interno durante il salvataggio." });
    } finally {
        connection.release();
    }
});

//endpoint per lista edizioni
app.get("/api/show-edizioni", async (req, res) => {
    const { limit, offset, filtro } = req.query;
    const limite = parseInt(limit, 10) || 5;
    const inizio = parseInt(offset, 10) || 0;
    //query per contare le righe che avrà la tabella
    let queryTotali = "SELECT COUNT(*) AS totali FROM edizioni e";
    //query per estrarre contenuti e url dell'immagine, uso left jin per estrarre anche edizioni senza immagini
    let queryContenuti = `SELECT e.id, e.collocazione, e.titolo, e.autore, i.url_immagine FROM edizioni e LEFT JOIN immagini_edizioni i ON e.id=i.edizione_id AND i.ordine=1`;
    let paramsContenuti = [];
    let paramsTotali = [];
    let whereClause = "";//clausola where
    //gestione filtro
    if (filtro) {
        whereClause = " WHERE e.autore LIKE ? OR e.titolo LIKE ?";
        const filtroLike = `%${filtro}%`;
        paramsTotali.push(filtroLike, filtroLike);
        paramsContenuti.push(filtroLike, filtroLike);
    }
    queryTotali += whereClause;
    queryContenuti += whereClause;
    //gestione ordinamento
    queryContenuti += " ORDER BY e.collocazione ASC LIMIT ? OFFSET ?";
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
                message: "Edizione/Manoscritto non trovato"
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

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});