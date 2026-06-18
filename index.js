require('dotenv').config();
const express=require('express');
const cors=require('cors');
const path=require('path');
const cookieParser=require('cookie-parser');

const pool=require('./src/db');
const keepAlive=require('./src/utils/dbKeepAlive');
keepAlive(pool);//funzione di keepalive per non far andare il db in timeout
const {autenticaToken, autorizzaRuoli}=require('./src/middleware/auth');

const app=express();
const PORT=process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//servo file statici dalla cartella /admin solo ai superadmin o admin
app.use('/admin', autenticaToken, autorizzaRuoli('admin', 'superadmin'), express.static('admin'));
//servo file statici dalla cartella /provate solo ai superadmin, admin o editor
app.use('/private', autenticaToken, autorizzaRuoli('superadmin', 'admin', 'editor'), express.static('private'));

//DEVIAZIONI TEMPORANEE
app.get('/catalogo.html', (req, res)=>{
    res.redirect(302, 'lista_edizioni.html');
});

app.get('/lista_stampe.html', (req, res)=>{
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});
//FINE DEVIAZIONI TEMPORANEE

// Serve i file statici dalla cartella public
app.use(express.static('public'));

const authRoutes=require('./src/routes/authRoutes');
app.use(authRoutes);

const statisticheRoutes=require('./src/routes/statisticheRoutes');
app.use(statisticheRoutes);

const edizioniRoutes=require('./src/routes/edizioniRoutes');
app.use(edizioniRoutes);

const stampeRoutes=require('./src/routes/stampeRoutes');
app.use(stampeRoutes);

const eventiRouter=require('./src/routes/eventiRoutes');
app.use(eventiRouter);

//favicon
app.get("/favicon.ico", (req, res)=>{
    res.sendFile(__dirname+"/favicon.ico");
});

//404
app.use((req, res)=>{
    //così rimane il nome del file non trovato nell'url
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});