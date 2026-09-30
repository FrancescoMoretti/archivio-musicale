require('dotenv').config();
const {createCloudinary}=require('express-mysql-cloudinary-kit');

const {cloudinary, upload, uploadToCloudinary}=createCloudinary({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folderPrefix: 'archivio_musicale'
    /*
    di default:
    allowedMimeTypes: image/jpeg, image/png, image/webp
    maxFileSize: 5*1024*1024 (5MB)
    maxFiles: 5
    */
});

module.exports={cloudinary, upload, uploadToCloudinary};