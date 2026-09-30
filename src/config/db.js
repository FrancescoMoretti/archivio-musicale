const fs=require('fs');
require('dotenv').config();
const {createPool}=require('express-mysql-cloudinary-kit');

const pool=createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ca: process.env.DB_CA_CERT || fs.readFileSync('./ca.pem')
    /*
    di default:
    waitForConnections: true,
    connectionLimit: 10,
    queuLimit: 0
    */
});

module.exports=pool;