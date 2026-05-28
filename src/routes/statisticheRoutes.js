const express=require('express');
const router=express.Router();

const pool=require('../db');

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

module.exports=router;