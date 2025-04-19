import { io } from 'socket.io-client';

// URL của WebSocket server
const API_BASE_URL = import.meta.env.VITE_API_URL;
// const API_BASE_URL = 'http://localhost:3000';
const SOCKET_URL = API_BASE_URL; // Sử dụng cùng URL với API để đảm bảo tính nhất quán

// Ghi log URL để debug
console.log('Connecting to Socket.IO using URL:', SOCKET_URL);

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
    this.connectAttempts = 0;
    this.maxConnectAttempts = 5;
  }

  // Kết nối đến WebSocket server
  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket connection already exists and is connected');
      return this.socket;
    }

    // Giới hạn số lần thử kết nối
    if (this.connectAttempts >= this.maxConnectAttempts) {
      console.warn(`Reached maximum connection attempts (${this.maxConnectAttempts}). Stopping reconnection.`);
      return null;
    }
    
    this.connectAttempts++;

    // Giải phóng kết nối cũ nếu có
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log(`Connecting to WebSocket server at: ${SOCKET_URL} (Attempt ${this.connectAttempts}/${this.maxConnectAttempts})`);

    // Lấy token từ localStorage
    const token = localStorage.getItem('token');

    // Khởi tạo kết nối Socket.IO với token xác thực
    try {
      this.socket = io(SOCKET_URL, {
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000, // Giảm timeout để phát hiện lỗi nhanh hơn
        autoConnect: true,
        forceNew: true,
        transports: ['websocket', 'polling'],
        upgrade: true,
        auth: {
          token
        }
      });
    } catch (error) {
      console.error('Error initializing socket connection:', error);
      return null;
    }

    // Xử lý sự kiện khi kết nối thành công
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server!', this.socket.id);
      this.isConnected = true;
      
      // Reset số lần thử kết nối khi kết nối thành công
      this.connectAttempts = 0;
      
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
      
      // Tự động kết nối lại sau 5 giây nếu không phải do chủ ý ngắt kết nối
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          console.log('Attempting to reconnect after disconnect...');
          this.reconnect();
        }, 5000);
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
      
      // Nếu không thể kết nối, chạy ở chế độ offline và thử lại sau
      if (this.connectAttempts >= this.maxConnectAttempts) {
        console.warn('Maximum connection attempts reached, running in offline mode');
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
    console.log('Attempting to reconnect socket...');
    
    // Xóa bất kỳ interval nào đang chạy
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Ngắt kết nối hiện tại nếu có
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      this.socket = null;
    }
    
    // Đặt lại trạng thái
    this.isConnected = false;
    
    // Thử kết nối lại
    const socket = this.connect();
    
    // Nếu không thể kết nối lại ngay, thiết lập interval để thử lại
    if (!socket && this.connectAttempts < this.maxConnectAttempts) {
      this.reconnectInterval = setInterval(() => {
        console.log('Reconnect interval triggered');
        
        // Nếu đã kết nối, xóa interval
        if (this.isConnected) {
          console.log('Already connected, clearing reconnect interval');
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
          return;
        }
        
        // Thử kết nối lại
        this.connect();
        
        // Nếu đã đạt số lần thử lại tối đa, xóa interval
        if (this.connectAttempts >= this.maxConnectAttempts) {
          console.warn('Maximum reconnection attempts reached, stopping reconnect interval');
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }, 10000); // Thử lại mỗi 10 giây
    }
    
    return socket;
  }
}

// Khởi tạo một instance duy nhất của SocketService
const socketService = new SocketService();

export default socketService; 