const express=require('express');
const router=express.Router();
const fs=require('fs').promises;
const path=require('path');
const pool=require('../config/db');
const {autenticaTokenMorbido}=require('../middleware/auth');
const {createPublicLimiter}=require('express-mysql-cloudinary-kit');
const {costruisciArticoliEventi}=require('../utils/eventiHtml');
const {costruisciUltimeAggiunte}=require('../utils/ultimeAggiunteHtml');
const publicLimiter=createPublicLimiter();

//endpoint per rendering server-side della home
router.get(['/', '/index.html'], publicLimiter, autenticaTokenMorbido('superadmin', 'admin', 'editor'), async (req, res, next)=>{
    const numeroEventi=3;//eventi mostrati nella home
    //preparazione query
    //query per ultimi eventi
    let campiSelect="id, link_evento, link_facebook, link_instagram, titolo, descrizione, DATE_FORMAT(data_inizio, '%d/%m/%Y') AS data_inizio, DATE_FORMAT(data_fine, '%d/%m/%Y') AS data_fine";
    let mostraCodice=false;
    //se l'utente è addetto => recupero anche il codice
    if(req.addetto){
        campiSelect+=", codice";
        mostraCodice=true;
    }
    const queryEventi=`SELECT ${campiSelect} FROM eventi ORDER BY eventi.data_inizio DESC LIMIT ?`;
    const queryImmaginiEvento="SELECT evento_id, url_immagine FROM immagini_eventi WHERE evento_id IN (?) ORDER BY id ASC";
    //query per conteggio schede totali
    const querySchede="SELECT (SELECT COUNT(*) FROM edizioni) + (SELECT COUNT(*) FROM stampe) AS totale";
    //query per preview ultime aggiunte
    const queryAggiunte="(SELECT 'edizione' AS tipo, id, collocazione, titolo, created_at FROM edizioni) UNION (SELECT 'stampa' AS tipo, id, collocazione, titolo, created_at FROM stampe) ORDER BY created_at DESC LIMIT 3";
    const queryImmagineEdizione="SELECT url_immagine FROM immagini_edizioni WHERE edizione_id=? ORDER BY id ASC LIMIT 1";
    const queryImmagineStampa="SELECT url_immagine FROM immagini_stampe WHERE stampa_id=? ORDER BY id ASC LIMIT 1";
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
        const [immagini]=await pool.query(queryImmaginiEvento, [ids]);
        //associo le immagini ai rispettivi eventi
        eventi.forEach(evento=>{
            evento.immagini=[];
            immagini.forEach(img=>{
                if(img.evento_id===evento.id){
                    evento.immagini.push(img.url_immagine);
                }
            });
        });
        const articoli=costruisciArticoliEventi(eventi, mostraCodice);
        //conteggio delle schede
        const [[{totale}]]=await pool.query(querySchede);
        //recupero ultime aggiunte
        const [aggiunte]=await pool.query(queryAggiunte);
        //nessuna aggiunta trovata (DB vuoto)
        if(aggiunte.length===0){
            return next();//servo la home con il file statico
        }
        for(const a of aggiunte){
            let righe;
            if(a.tipo==='edizione'){
                [righe]=await pool.query(queryImmagineEdizione, [a.id]);
            }else{
                [righe]=await pool.query(queryImmagineStampa, [a.id]);
            }
            if(righe.length>0){
                a.url=righe[0].url_immagine;//estraggo l'url della copertina
            }
        }
        const ultimeAggiunte=costruisciUltimeAggiunte(aggiunte);
        //iniezione dei contenuti nel file html
        let html=await fs.readFile(path.join(__dirname, '../../public/index.html'), 'utf-8');
        //popolo il file html con il conteggio
        if(totale>0){
            html=html.replace("<p><!--Schede caricate: *.--></p>", ()=>`<p>Schede caricate: ${totale}</p>`);
        }
        //popolo il file con le ultime schede aggiunte
        html=html.replace('<!--ultime aggiunte-->', ()=>ultimeAggiunte);
        //popolo il file html con gli eventi
        html=html.replace('<!--articoli eventi-->', ()=>articoli);
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }catch(err){
        console.error("Errore nel rendering server-side della home: ", err);
        next();//viene servita la home con il file statico
    }
});

module.exports=router;