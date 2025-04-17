require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const iotDeviceService = require('./services/iotDeviceService');
const mqttService = require('./services/mqtt.service');
const scheduleService = require('./services/schedule.service');
const automationService = require('./services/automation.service');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();

// Cấu hình CORS chi tiết
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Log tất cả requests để debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Body parser middleware với giới hạn tăng lên
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', routes);

// Thêm route test để kiểm tra server
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const path = require('path');

// Serve static files từ React FE build
app.use(express.static(path.join(__dirname, '../../FE-Smart_Watering_System/dist')));

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../FE-Smart_Watering_System/dist/index.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Biến global để lưu trữ đối tượng Socket.IO
let io;

// Hàm để lấy đối tượng io từ các service khác
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO chưa được khởi tạo');
    }
    return io;
};

// Export getIO để các module khác có thể sử dụng
module.exports.getIO = getIO;

// Initialize devices and start server
async function startServer() {
    try {
        // Đợi MQTT kết nối thành công trước
        console.log('Đang đợi kết nối MQTT...');
        await mqttService.waitForConnection(20000);

        // Khởi tạo HTTP server
        const server = http.createServer(app);

        // Cấu hình Socket.IO với CORS
        io = new Server(server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Content-Type', 'Authorization']
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true
        });

        // Xử lý kết nối Socket.IO
        io.on('connection', (socket) => {
            console.log('Client kết nối: ' + socket.id);

            socket.emit('connected', {
                status: 'success',
                socketId: socket.id,
                serverTime: new Date().toISOString()
            });

            socket.on('error', (error) => {
                console.error(`Socket error for ${socket.id}:`, error);
            });

            socket.on('disconnect', (reason) => {
                console.log(`Client ngắt kết nối: ${socket.id}, Reason: ${reason}`);
            });
        });

        // Khởi tạo các services
        console.log('Bắt đầu khởi tạo thiết bị');
        await iotDeviceService.initializeDevices();
        await mqttService.subscribeToAllFeeds();
        mqttService.setSocketIO(io);
        automationService.setSocketIO(io);
        scheduleService.initScheduleService();

        // Khởi động server
        server.listen(PORT, () => {
            console.log(`Server đang chạy trên cổng ${PORT}`);
            console.log(`CORS được cấu hình cho các origin:`, allowedOrigins);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();