require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const iotDeviceService = require('./services/iotDeviceService');
const mqttService = require('./services/mqtt.service');

const app = express();

// Cấu hình CORS chi tiết
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', routes);

// Thêm route test để kiểm tra server
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Initialize devices and start server
async function startServer() {
    try {
        // Khởi tạo thiết bị khi khởi động server
        await iotDeviceService.initializeDevices();
        
        // Thiết lập kiểm tra thiết bị hoạt động mỗi 1 phút
        setInterval(async () => {
            await mqttService.checkDevicesActivity();
        }, 60000); // 60000 ms = 1 phút
        
        app.listen(PORT, () => {
            console.log(`Server đang chạy trên cổng ${PORT}`);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
}

startServer();