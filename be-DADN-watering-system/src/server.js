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
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

// ✅ Danh sách origin được phép (bao gồm cả FE local và FE Vercel)
const allowedOrigins = [
    // 'https://smart-watering-system.vercel.app',
    'http://localhost:5173' 
];

// ✅ Cấu hình CORS động theo origin
const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
app.use(cors(corsOptions));

// ✅ Log tất cả requests để debug (có origin luôn)
app.use((req, res, next) => {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// ✅ Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Routes API
app.use('/api', routes);

// ✅ Route test
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// ✅ Error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ✅ Serve frontend (nếu build chung FE ở server này, còn nếu Vercel thì đoạn này sẽ bỏ đi)
// app.use(express.static(path.join(__dirname, '../../FE-Smart_Watering_System/dist')));
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../../FE-Smart_Watering_System/dist/index.html'));
// });

// ✅ Handle 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
let io;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO chưa được khởi tạo');
    }
    return io;
};
module.exports.getIO = getIO;

// ✅ Start server chính
async function startServer() {
    try {
        console.log('Đang đợi kết nối MQTT...');
        await mqttService.waitForConnection(20000);

        const server = http.createServer(app);

        // ✅ Socket.IO config chuẩn cho nhiều origin
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

        // ✅ Khởi tạo các service
        console.log('Bắt đầu khởi tạo thiết bị');
        await iotDeviceService.initializeDevices();
        await mqttService.subscribeToAllFeeds();
        mqttService.setSocketIO(io);
        automationService.setSocketIO(io);
        scheduleService.initScheduleService();

        // ✅ Khởi động server
        server.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
            console.log(`🌍 CORS cho phép các origin:`, allowedOrigins);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
}

startServer();
