const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//funzione di upload su cloudinary
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `archivio_musicale/${folder}` },
            (error, result) => {
                if (error) reject(error);
                else resolve({
                    imageUrl: result.secure_url,
                    publicId: result.public_id
                });
            }
        );
        stream.end(buffer);
    });
};

module.exports = { cloudinary, upload, uploadToCloudinary};