const multer=require('multer');

//middleware che verifica la validità dei file delle immagini da caricare su cloudinary
const gestioneErroriUpload=(err, req, res, next)=>{
    if(err instanceof multer.MulterError){
        let message="Errore durante il caricamento dei file.";
        switch(err.code){
            case 'LIMIT_FILE_SIZE':
                message="Uno o più file superano la dimensione massima consentita (5MB).";
            break;
            case 'LIMIT_FILE_COUNT':
                message="Numero massimo di file superato (5).";
            break;
            case 'LIMIT_UNEXPECTED_FILE':
                message="Tipo di file non consentito. Sono ammesse solo immagini (jpeg, png, webp).";
            break;
        }
        return res.status(400).json({
            success: false,
            message: message
        });
    }
    next(err);//se l'errore non è relativo a multer=>lo passo alla funzione successiva
};

module.exports=gestioneErroriUpload;