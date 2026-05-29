const express=require('express');
const router=express.Router();

const pool=require('../db');
const {autenticaToken, autorizzaRuoli}=require('../middleware/auth');

//endpoint per conteggio reperti
router.get("/api/conta-reperti", async (req, res)=>{
    try{
        const [risultato]=await pool.query("SELECT (SELECT COUNT(*) FROM edizioni) + (SELECT COUNT(*) FROM stampe) AS somma_reperti");
        if(risultato[0].somma_reperti<=0){
            return res.status(404).json({
                success: false,
                message: ""//messaggio vuoto
            })
        }
        return res.json({
            success: true,
            message: `L'archivio ospita: ${risultato[0].somma_reperti} reperti.`
        });
    }catch(err){
        console.error("Errore nell'endpoint conta-reperti: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante il conteggio dei reperti."
        });
    }
});

//endpoint per monitoraggio contenuti
router.get("/api/monitor-contenuti", autenticaToken, autorizzaRuoli('superadmin', 'admin'), async (req, res)=>{
    const {filtro}=req.query;
    //gestione filtro
    if(!filtro || !String(filtro).trim()){
        return res.status(400).json({
            success: false,
            message: "Cerca un contenuto o un utente."
        });
    }
    const filtroLike=`%${filtro}%`;
    const query=`SELECT r.collocazione, r.titolo, r.autore, r.created_at, c.email AS created_by, r.updated_at, m.email AS updated_by FROM(
        SELECT collocazione, autore, titolo, created_at, created_by, updated_at, updated_by FROM edizioni
        UNION ALL
        SELECT collocazione, autore, titolo, created_at, created_by, updated_at, updated_by FROM stampe
    ) AS r LEFT JOIN utenti c ON r.created_by=c.id LEFT JOIN utenti m ON r.updated_by=m.id
    WHERE r.collocazione LIKE ? OR r.titolo LIKE ? OR r.autore LIKE ? OR c.email LIKE ? OR m.email LIKE ?
    ORDER BY r.updated_at DESC`;
    try{
        const [rows]=await pool.query(query, [filtroLike, filtroLike, filtroLike, filtroLike, filtroLike]);
        if(rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Nessun contenuto o utente trovato."
            });
        }
        return res.json({
            success: true,
            contenuti: rows
        });
    }catch(err){
        console.error("Errore nell'endpoint monitor-contenuti: ", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno durante la ricerca dei contenuti e degli utenti."
        });
    }
});

module.exports=router;