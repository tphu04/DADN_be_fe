import { io } from 'socket.io-client';

// URL của WebSocket server
// const SOCKET_URL = 'http://localhost:3000'; // Địa chỉ backend Node.js server

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL; // Địa chỉ backend Node.js server

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {
      'sensor-update': [],
      'sensor_update': [] // Thêm hỗ trợ cho cả 2 event name
    };
    this.userId = null;
    this.reconnectInterval = null;
    this.heartbeatInterval = null;
  }

  // Kết nối đến WebSocket server
  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket connection already exists and is connected');
      return this.socket;
    }

    // Giải phóng kết nối cũ nếu có
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('Connecting to WebSocket server at:', SOCKET_URL);

    // Lấy token từ localStorage
    const token = localStorage.getItem('token');

    // Khởi tạo kết nối Socket.IO với token xác thực
    this.socket = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      transports: ['websocket', 'polling'],
      upgrade: true,
      auth: {
        token
      }
    });

    // Xử lý sự kiện khi kết nối thành công
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server!', this.socket.id);
      this.isConnected = true;
      
      // Đăng ký vào room của user nếu userId đã được thiết lập
      this.joinUserRoom();
      
      // Thiết lập heartbeat để duy trì kết nối
      this.setupHeartbeat();
      
      // Thông báo cho tất cả listeners rằng kết nối đã được thiết lập
      if (this.listeners['connect']) {
        this.listeners['connect'].forEach(callback => callback());
      }
    });

    // Xử lý sự kiện khi mất kết nối
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      
      // Dọn dẹp heartbeat
      this.clearHeartbeat();
      
      // Thông báo cho tất cả listeners rằng kết nối đã mất
      if (this.listeners['disconnect']) {
        this.listeners['disconnect'].forEach(callback => callback(reason));
      }
    });

    // Xử lý event sensor-update với dấu gạch ngang
    this.socket.on('sensor-update', (data) => {
      console.log('Received sensor-update:', data);
      
      // Gọi tất cả các callback đã đăng ký
      if (this.listeners['sensor-update']) {
        this.listeners['sensor-update'].forEach(callback => callback(data));
      }
    });
    
    // Xử lý event sensor_update với dấu gạch dưới
    this.socket.on('sensor_update', (data) => {
      console.log('Received sensor_update:', data);
      
      // Gọi tất cả các callback đã đăng ký
      if (this.listeners['sensor_update']) {
        this.listeners['sensor_update'].forEach(callback => callback(data));
      }
      
      // Gọi luôn listeners của sensor-update để đảm bảo tương thích
      if (this.listeners['sensor-update']) {
        this.listeners['sensor-update'].forEach(callback => callback(data));
      }
    });

    // Xử lý lỗi kết nối
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      
      // Thông báo lỗi kết nối
      if (this.listeners['error']) {
        this.listeners['error'].forEach(callback => callback(error));
      }
    });
    
    // Xác nhận kết nối thành công từ server
    this.socket.on('connected', (data) => {
      console.log('Received connection confirmation from server:', data);
      
      // Cập nhật userId nếu server gửi về
      if (data.userId) {
        this.userId = data.userId;
      }
    });
    
    // Xác nhận đã join room
    this.socket.on('room_joined', (data) => {
      console.log('Joined room:', data.room);
    });

    // Xử lý lỗi xác thực
    this.socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      // Có thể thực hiện các hành động phù hợp như đăng xuất
    });

    return this.socket;
  }
  
  // Thiết lập heartbeat để giữ kết nối
  setupHeartbeat() {
    this.clearHeartbeat(); // Clear any existing heartbeat
    
    // Gửi ping mỗi 30 giây
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        console.log('Sending heartbeat ping...');
        this.socket.emit('ping');
      }
    }, 30000);
    
    // Lắng nghe phản hồi pong
    this.socket.on('pong', () => {
      console.log('Received heartbeat pong');
    });
  }
  
  // Dọn dẹp heartbeat
  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Thiết lập userId và đăng ký vào room tương ứng
  setUserId(userId) {
    console.log(`Setting socket user ID to: ${userId}`);
    this.userId = userId;
    
    // Nếu đã kết nối, đăng ký vào room của user
    if (this.isConnected && this.socket) {
      this.joinUserRoom();
    }
  }
  
  // Đăng ký vào room của user
  joinUserRoom() {
    if (!this.userId) {
      console.warn('Cannot join user room: userId not set');
      return;
    }
    
    console.log(`Joining user room: user-${this.userId}`);
    this.socket.emit('join-user-room', { userId: this.userId });
  }

  // Trả về socket instance
  getSocket() {
    // Kết nối nếu chưa được kết nối
    if (!this.socket || !this.isConnected) {
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
    
    // Nếu đã kết nối và đang lắng nghe sự kiện sensor-update hoặc sensor_update,
    // thiết lập lại kết nối để đảm bảo nhận được cập nhật mới nhất
    if (this.isConnected && (event === 'sensor-update' || event === 'sensor_update')) {
      // Đảm bảo đã đăng ký lắng nghe
      if (event === 'sensor-update') {
        this.socket.off('sensor-update');
        this.socket.on('sensor-update', (data) => {
          console.log('Received sensor-update:', data);
          this.listeners['sensor-update'].forEach(cb => cb(data));
        });
      }
      
      if (event === 'sensor_update') {
        this.socket.off('sensor_update');
        this.socket.on('sensor_update', (data) => {
          console.log('Received sensor_update:', data);
          this.listeners['sensor_update'].forEach(cb => cb(data));
        });
      }
    }
  }
  
  // Hủy đăng ký lắng nghe sự kiện
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      // Nếu không có callback, xóa tất cả listeners cho event này
      this.listeners[event] = [];
    }
    
    console.log(`Removed listener(s) for ${event} event`);
  }

  // Ngắt kết nối WebSocket
  disconnect() {
    this.clearHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
      console.log('Disconnected from WebSocket server');
    }
  }
  
  // Kết nối lại
  reconnect() {
    console.log('Attempting to reconnect...');
    this.disconnect();
    return this.connect();
  }
}

// Khởi tạo một instance duy nhất của SocketService
const socketService = new SocketService();

export default socketService; 