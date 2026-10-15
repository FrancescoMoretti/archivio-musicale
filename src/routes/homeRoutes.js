const express=require('express');
const router=express.Router();
const fs=require('fs').promises;
const path=require('path');
const pool=require('../config/db');
const {autenticaTokenMorbido}=require('../middleware/auth');
const {createPublicLimiter}=require('express-mysql-cloudinary-kit');
const {costruisciArticoliEventi}=require('../utils/eventiHtml');
const publicLimiter=createPublicLimiter();

//endpoint per rendering server-side della home
router.get(['/', '/index.html'], publicLimiter, autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res, next)=>{
    const numeroEventi=3;//eventi mostrati nella home
    //preparazione query
    let campiSelect="id, link_evento, link_facebook, link_instagram, titolo, descrizione, DATE_FORMAT(data_inizio, '%d/%m/%Y') AS data_inizio, DATE_FORMAT(data_fine, '%d/%m/%Y') AS data_fine";
    let mostraCodice=false;
    //se l'utente è addetto => recupero anche il codice
    if(req.addetto){
        campiSelect+=", codice";
        mostraCodice=true;
    }
    const queryEventi=`SELECT ${campiSelect} FROM eventi ORDER BY eventi.data_inizio DESC LIMIT ?`;
    const queryImmagini="SELECT evento_id, url_immagine FROM immagini_eventi WHERE evento_id IN (?) ORDER BY id ASC";
    const querySchede="SELECT (SELECT COUNT(*) FROM edizioni) + (SELECT COUNT(*) FROM stampe) AS totale";
    try{
        const [eventi]=await pool.query(queryEventi, [numeroEventi]);
        //nessun evento trovato
        if(eventi.length===0){
            return next();//viene servita la home con il file statico
        }
        //estraggo gli id degli eventi
        let ids=[];
        eventi.forEach(evento=>{
            ids.push(evento.id);
        });
        const [immagini]=await pool.query(queryImmagini, [ids]);
        //associo le immagini ai rispettivi eventi
        eventi.forEach(evento=>{
            evento.immagini=[];
            immagini.forEach(img=>{
                if(img.evento_id===evento.id){
                    evento.immagini.push(img.url_immagine);
                }
            });
        });
        const {html: articoli, left}=costruisciArticoliEventi(eventi, true, mostraCodice);
        //conteggio delle edizioni
        const [[{totale}]]=await pool.query(querySchede);
        let html=await fs.readFile(path.join(__dirname, '../../public/index.html'), 'utf-8');
        //popolo il file html con gli eventi
        html=html.replace('<section id="eventi-sec">', ()=>`<section id="eventi-sec" data-left="${left}">${articoli}`);
        //popolo il file html con il conteggio
        if(totale>0){
            html=html.replace("<p><!--Schede caricate: *.--></p>", ()=>`<p>Schede caricate: ${totale}</p>`);
        }
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }catch(err){
        console.error("Errore nel rendering server-side della home: ", err);
        next();//viene servita la home con il file statico
    }
});

module.exports=router;