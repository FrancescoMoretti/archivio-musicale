require('dotenv').config();
const express=require('express');
const path=require('path');
const cookieParser=require('cookie-parser');
const helmet=require('helmet');

const pool=require('./src/db');
const keepAlive=require('./src/utils/dbKeepAlive');
keepAlive(pool);//funzione di keepalive per non far andare il db in timeout
const {autenticaToken, autorizzaRuoli}=require('./src/middleware/auth');

const app=express();
app.set('trust proxy', 1);//mi fido di un livello di proxy (leggo l'IP dietro al proxy per un livello)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "https://res.cloudinary.com"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],//blocca <object> e <embed>
            baseUri: ["'self'"],//limita <base href> alla stessa origine
            formAction: ["'self'"],//i form che uso possono inviare dati solo allo stesso server in cui si trova il sito
            frameAncestors: ["'self'"],//impedisce che il sito venga incorporato in un <iframe> su un dominio esterno
            upgradeInsecureRequests: []
        }
    }
}));

const PORT=process.env.PORT || 3000;

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

const utentiRoutes=require('./src/routes/utentiRoutes');
app.use(utentiRoutes);

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
    res.set("Cross-Origin-Resource-Policy", "cross-origin");//permetto il recupero del favicon da altre origini
    res.sendFile(__dirname+"/favicon.ico");
});

//endpoint da pingare per keepalive di Render
app.get('/health', (req, res)=>{
    res.sendStatus(200);
});

//404
app.use((req, res)=>{
    //così rimane il nome del file non trovato nell'url
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

//handler per erorri non gestiti
app.use((err, req, res, next)=>{
    console.error("Errore non gestito: ", err);
    res.status(err.status || 500).json({
        success: false,
        message: "Errore interno lato server."
    });
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});