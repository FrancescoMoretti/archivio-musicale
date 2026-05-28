//keepalive per non far andare il db in timeout
const keepAlive=(pool)=>{
    setInterval(async ()=>{
        try{
            await pool.query("SELECT 1");
            console.log("Ping di keepalive inviato al db.");
        }catch(err){
            console.error("Errore nel keepalive: ", err);
        }
    }, 12*60*60*1000);//scatta ogni 12 ore (12*60*60*1000)
};

module.exports=keepAlive;