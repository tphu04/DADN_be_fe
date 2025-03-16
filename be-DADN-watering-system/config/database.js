require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// const mysql = require('mysql2/promise');


// const connection = mysql.createPool({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
// });

// // test connection
// const testConnection = async () => {
//     try {
//         const test_connection = await connection.getConnection();
//         console.log('Kết nối thành công đến database.');
//         test_connection.release();
//     } catch (err) {
//         console.error('Lỗi kết nối đến database:', err);
//     }
// };

// testConnection();

module.exports = prisma;

