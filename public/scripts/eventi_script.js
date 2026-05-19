let numeroArticoli=1;//numero di articoli che voglio mostrare per volta
let articoliMostrati=0;
let left=true;//variabile per alternare foto a sinistra e a destra negli articoli con una sola immagine

document.addEventListener("DOMContentLoaded", async function(){
    //controllo se sto eseguendo lo script per la pagina eventi o per la pagina home
    const pagina=document.querySelector('body').id;
    if(pagina==="index"){
        numeroArticoli=3;//mostro solo ultimi 3 eventi
    }
    const sec=document.getElementById("eventi-sec");
    const message=sec.querySelector('p');
    const altriBtn=document.getElementById("show-more-btn");
    //chiamata iniziale
    await caricaEventi();

    //fetch di caricamento degli eventi
    async function caricaEventi(){
        //costruisco url con parametri
        let url=`/api/show-eventi?limit=${numeroArticoli}&offset=${articoliMostrati}`;
        try{
            const res=await fetch(url);
            const result=await res.json();
            if(res.ok && result.success){
                //aggiornamento contenti
                result.eventi.forEach(evento => {
                    const article=document.createElement('article');
                    let h3=`<h3>${evento.titolo}</h3>`;//titolo
                    article.insertAdjacentHTML('beforeend', h3);
                    let p=`<p>${evento.descrizione}</p>`;//corpo dell'articolo
                    let collegamenti=null;
                    //se c'è almeno un link=> creo div collegamenti
                    if(evento.link_evento || evento.link_facebook || evento.link_instagram){
                        collegamenti=document.createElement('div');
                        collegamenti.classList.add("collegamenti");
                        if(evento.link_evento){
                            const a=`<a href="${evento.link_evento}" target="_blank" rel="noopener">Ulteriori dettagli</a>`;
                            collegamenti.insertAdjacentHTML('beforeend', a);
                        }
                        if(evento.link_facebook){
                            const a=`<a href="${evento.link_facebook}" target="_blank" rel="noopener">Post Facebook</a>`;
                            collegamenti.insertAdjacentHTML('beforeend', a);
                        }
                        if(evento.link_instagram){
                            const a=`<a href="${evento.link_instagram}" target="_blank" rel="noopener">Post Instagram</a>`;
                            collegamenti.insertAdjacentHTML('beforeend', a);
                        }
                    }
                    //conto quante immagini ha l'evento
                    let numeroImmagini=0;
                    if(evento.immagini){
                        numeroImmagini=evento.immagini.length;
                    }
                    switch(numeroImmagini){
                        case 1:
                            article.classList.add("one-img-article");
                            const img=`<img src="${evento.immagini[0]}" alt="${evento.titolo} prima immagine">`;
                            if(left){
                                article.insertAdjacentHTML('beforeend', img);
                                article.insertAdjacentHTML('beforeend', p);
                                left=false;
                            }else{
                                article.insertAdjacentHTML('beforeend', p);
                                article.insertAdjacentHTML('beforeend', img);
                                left=true;
                            }
                        break;
                        case 2:
                            article.classList.add("two-img-article");
                            const img1=`<img src="${evento.immagini[0]}" alt="${evento.titolo} prima immagine">`;
                            const img2=`<img src="${evento.immagini[1]}" alt="${evento.titolo} seconda immagine">`;
                            article.insertAdjacentHTML('beforeend', img1);
                            article.insertAdjacentHTML('beforeend', p);
                            article.insertAdjacentHTML('beforeend', img2);
                        break;
                        default:
                            //non ci sono immagini
                            article.insertAdjacentHTML('beforeend', p);
                        break;
                    }
                    if(collegamenti){
                        article.appendChild(collegamenti);
                    }
                    sec.appendChild(article);
                });
                //aggiorno variabili globali
                articoliMostrati=sec.querySelectorAll('article').length;
                //se eventi esauriti => "spengo" il bottone
                if(altriBtn){
                    if(!result.altri){
                        altriBtn.style.display="none";
                    }else{
                        altriBtn.style.display="block";
                    }
                }
            }else{
                message.textContent=result.message || "Errore durante il recupero degli eventi."
                if(altriBtn){
                    altriBtn.style.display="none";
                }
            }
        }catch(err){
            message.textContent="Errore di rete: impossible raggiungere il server.";
            if(altriBtn){
                altriBtn.style.display="none";
            }
        }
    };

    //gestione bottone altri
    if(altriBtn){
        altriBtn.addEventListener("click", () => caricaEventi());
    }
});