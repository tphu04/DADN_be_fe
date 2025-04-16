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
// Lấy danh sách origin từ biến môi trường hoặc mặc định
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://fesmartwater.onrender.com'];

// const allowedOrigins = ['http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://fesmartwater.onrender.com'];

// Cấu hình CORS chi tiết
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (như curl) hoặc origin trong danh sách
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

const path = require('path');

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../FE-Smart_Watering_System/dist')));

// Catch-all to return index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../FE-Smart_Watering_System/dist/index.html'));
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
        await mqttService.waitForConnection(20000); // Đợi tối đa 20 giây

        // Sau khi MQTT đã kết nối, khởi tạo thiết bị
        console.log('Bắt đầu khởi tạo thiết bị');
        await iotDeviceService.initializeDevices();

        // Đăng ký nhận dữ liệu từ tất cả feeds
        await mqttService.subscribeToAllFeeds();

        // Tạo HTTP server từ Express app
        const server = http.createServer(app);

        // Tạo Socket.IO server
        io = new Server(server, {
            cors: {
                origin: allowedOrigins, // Đặt origin phù hợp với frontend của bạn
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000, // 60 giây timeout
            pingInterval: 25000, // Kiểm tra kết nối mỗi 25 giây
            transports: ['websocket', 'polling'], // Ưu tiên websocket
            allowEIO3: true, // Cho phép Engine.IO phiên bản 3
            maxHttpBufferSize: 1e8 // Tăng kích thước buffer cho socket
        });

        // Xử lý kết nối Socket.IO
        io.on('connection', (socket) => {
            console.log('Client kết nối: ' + socket.id);
            
            // Cho phép tất cả kết nối mà không cần xác thực
            console.log(`Anonymous connection accepted: ${socket.id}`);
            socket.emit('connected', { status: 'success', anonymous: true });
            
            // Xử lý sự kiện join-user-room (dùng khi client muốn join room một cách rõ ràng)
            socket.on('join-user-room', (data) => {
                if (data && data.userId) {
                    const userRoom = `user-${data.userId}`;
                    socket.join(userRoom);
                    console.log(`Socket ${socket.id} manually joined room: ${userRoom}`);
                    // Gửi xác nhận cho client
                    socket.emit('room_joined', { room: userRoom });
                } else {
                    console.warn(`Socket ${socket.id} attempted to join a room without userId`);
                }
            });

            // Thêm heartbeat để kiểm tra kết nối
            socket.on('ping', () => {
                socket.emit('pong');
            });

            socket.on('disconnect', (reason) => {
                console.log(`Client ngắt kết nối: ${socket.id}, Reason: ${reason}`);
            });

            // Xử lý sự kiện lỗi
            socket.on('error', (error) => {
                console.error(`Socket error for ${socket.id}:`, error);
            });
        });

        console.log('✅ allowedOrigins:', allowedOrigins);

        // Sửa MQTT service để phát sóng dữ liệu mới qua Socket.IO
        mqttService.setSocketIO(io);
        
        // Thiết lập Socket.IO cho automation service
        automationService.setSocketIO(io);

        // Khởi tạo dịch vụ lịch trình tự động
        scheduleService.initScheduleService();
        
        // Bật dịch vụ tự động hóa
        console.log('🤖 Khởi tạo dịch vụ tự động hóa...');
        const automationStatus = automationService.getStatus();
        console.log(`🤖 Trạng thái tự động hóa: ${automationStatus.enabled ? 'Đã bật' : 'Đã tắt'}`);

        // Khởi động HTTP server
        server.listen(PORT, () => {
            console.log(`Server đang chạy trên cổng ${PORT}`);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
}

startServer();