import { io } from 'socket.io-client';

// URL của WebSocket server
const SOCKET_URL = 'http://localhost:3000'; // Địa chỉ backend Node.js server

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {
      'sensor-update': []
    };
  }

  // Kết nối đến WebSocket server
  connect() {
    if (this.socket) {
      console.log('Socket connection already exists');
      return this.socket;
    }

    console.log('Connecting to WebSocket server at:', SOCKET_URL);

    // Khởi tạo kết nối Socket.IO
    this.socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    // Xử lý sự kiện khi kết nối thành công
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server!', this.socket.id);
      this.isConnected = true;
    });

    // Xử lý sự kiện khi mất kết nối
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
    });

    // Xử lý event sensor-update
    this.socket.on('sensor-update', (data) => {
      console.log('Received sensor update:', data);
      
      // Gọi tất cả các callback đã đăng ký cho sensor-update
      if (this.listeners['sensor-update']) {
        this.listeners['sensor-update'].forEach(callback => callback(data));
      }
    });

    // Xử lý lỗi kết nối
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });

    return this.socket;
  }

  // Trả về socket instance
  getSocket() {
    // Kết nối nếu chưa được kết nối
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  // Kiểm tra trạng thái kết nối
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  // Đăng ký lắng nghe sự kiện
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    console.log(`Registered listener for ${event} event`);

    // Đảm bảo đã kết nối trước khi đăng ký sự kiện
    if (!this.socket || !this.isConnected) {
      this.connect();
    }
  }
  
  // Hủy đăng ký lắng nghe sự kiện
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    console.log(`Removed listener for ${event} event`);
  }

  // Ngắt kết nối WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Disconnected from WebSocket server');
    }
  }
}

// Khởi tạo một instance duy nhất của SocketService
const socketService = new SocketService();

export default socketService; 