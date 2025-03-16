const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

// Đảm bảo cấu hình CORS cho tất cả các domain
app.use(cors());

// Middleware xử lý JSON và URL encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load config
require('dotenv').config();
const connection = require('../config/database');
const routes = require('./routes/index.js');

const port = process.env.PORT || 3000;
const host = process.env.HOST_NAME || 'localhost';

// Thêm middleware debugging để xem tất cả requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Route test cơ bản ở đầu (trước các routes khác)
app.get('/', (req, res) => {
    res.send('Smart Watering System API is running!');
});

// Route test API
app.get('/test', (req, res) => {
    res.json({ message: 'API test successful!' });
});

// API routes
app.use('/api', routes);

// Middleware xử lý lỗi 404 - Đặt sau tất cả các routes
app.use((req, res) => {
    console.log(`[404] Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        success: false,
        message: 'Route not found' 
    });
});

// Khởi động server
app.listen(port, () => {
    console.log(`=============================================`);
    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Test the root endpoint: http://${host}:${port}/`);
    console.log(`Test the API: http://${host}:${port}/test`);
    console.log(`Test auth: http://${host}:${port}/api/auth/register`);
    console.log(`=============================================`);
});