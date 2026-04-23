require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));// Serve i file statici dalla cartella public

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

//inserimento edizione
app.post("/api/insert-edizioni", upload.array("immagini"), async (req, res) => {
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
        console.error("Errore durante l'inserimento:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Errore: il numero di collocazione è già esistente." });
        }
        res.status(500).json({ message: "Errore interno durante il salvataggio." });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});