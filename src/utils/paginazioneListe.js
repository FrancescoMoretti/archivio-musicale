//costruzione dei numeri in fondo alle pagine di lista "1 ... 5 6 7 8 9 ... 30"

//varabili per indentazione
const tab="    ";
const tab3=tab+tab+tab;
const tab4=tab3+tab;

//costruzione del tag con il numero: ancora se non è il numero della pagina corrente; <span> se è il numero della pagina corrente;
/*
    n: numero di cui costruire il tag
    pagina: numero della pagina corrente
    percorso: path della pagina di lista ("/lista_edizioni.html")
*/
function numeroHTML(n, pagina, percorso){
    if(n===pagina){
        return `${tab4}<span class="corrente">${n}</span>\n`;
    }
    let href=percorso;
    if(n>1){
        href+=`?pagina=${n}`;
    }
    return `${tab4}<a href="${href}">${n}</a>\n`;
};

//costruisco tutto il blocco
function costruisciNumeriPagine(numeroPagine, pagina, percorso){
    const finestra=2;//pagine prima e dopo quella corrente
    //calcolo le pagine da mostrare (prima, precedente, attuale, successiva, ultima)
    let daMostrare=[];
    for(let i=1; i<=numeroPagine; i++){
        if(i===1){
            daMostrare.push(i);
        }else if(Math.abs(i-pagina)<=finestra){
            daMostrare.push(i);
        }else if(i===numeroPagine){
            daMostrare.push(i);
        }
    }
    //scrivo i numeri e i "..."
    let html="\n";
    for(let i=0; i<daMostrare.length; i++){
        if(i>0){//se NON è il primo
            if(daMostrare[i]-daMostrare[i-1]>finestra){
                html+=`${tab4}<span>...</span>\n`;
            }
        }
        html+=numeroHTML(daMostrare[i], pagina, percorso);
    }
    html+=tab3;
    return html;
};

module.exports={costruisciNumeriPagine};