require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));// Serve i file statici dalla cartella public

const pool = require('./src/db');
const { upload, cloudinary } = require('./src/cloudinaryConfig');

//endpoint per test di upload immagini su cloudinary
app.post('/api/edizioni/test-upload', upload.single('immagine'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nessun file selezionato." });
        }
        // Determiniamo la cartella
        let subfolder = "";
        if(req.originalUrl.includes('edizioni')){
            subfolder="edizioni";
        }else{
            subfolder="stampe";
        }
        // Caricamento manuale tramite Stream
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: `archivio_musicale/${subfolder}` },
            (error, result) => {
                if (error) {
                    console.error("Errore Cloudinary:", error);
                    return res.status(500).json({ error: "Errore durante l'upload su Cloudinary." });
                }
                // Se tutto ok, risposta con url dell'immagine
                res.json({
                    message: "Caricamento riuscito!",
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );
        // Scrivo i byte del file nello stream di Cloudinary
        uploadStream.end(req.file.buffer);
    } catch (err) {
        console.error("Errore Server:", err);
        res.status(500).json({ error: "Errore interno del server." });
    }
});


app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});