require('dotenv').config();
const {createCloudinary}=require('express-mysql-cloudinary-kit');

const {cloudinary, upload, uploadToCloudinary}=createCloudinary({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    folderPrefix: 'archivio_musicale'
    /*
    di default:
    allowedMimeTypes: image/jpeg, image/png, image/webp
    maxFileSize: 5*1024*1024 (5MB)
    maxFiles: 5
    */
});

module.exports={cloudinary, upload, uploadToCloudinary};