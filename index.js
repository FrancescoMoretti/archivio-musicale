require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve i file statici dalla cartella public
app.use(express.static('public'));

app.get('/api/test', (req, res) => {
    res.json({ message: "Il server è vivo e vegeto!" });
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});