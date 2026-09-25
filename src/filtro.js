/*
funzione per dividere le stringhe delle barre di ricerca e usarle come parole chiave per tutti i campi delle tabelle
la funzione produce una clausola WHERE del tipo:
WHERE (nome LIKE ? OR cognome LIKE ?) AND (nome LIKE ? OR cognome LIKE ?)
che serve a ricercare "Mario Bianchi" in una tabella con una colonna nome+cognome
*/

function costruisciFiltro(colonne, filtro){
    let whereClause="";
    let parametri=[];
    if(filtro && filtro.trim()){
        const parole=filtro.trim().split(/\s+/);//spezzo quando trovo uno o più spazi
        const gruppi=parole.map(()=>"("+colonne.map(col=>`${col} LIKE ?`).join(" OR ")+")");
        whereClause+=" WHERE "+gruppi.join(" AND ");
        parole.forEach(parola=>{
            const parolaLike=`%${parola}%`;
            colonne.forEach(()=>{
                parametri.push(parolaLike);
            });
        });
    }
    return {whereClause, parametri};
};

module.exports={costruisciFiltro};