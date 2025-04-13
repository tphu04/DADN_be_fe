import React, { useState, useEffect } from "react";
import axios from "axios";
import API_ENDPOINTS from "../../services/ApiEndpoints";
import socketService from "../../services/socketService";

// Icons
import IconRefresh from "../../assets/images/icon-refresh.svg";
import IconFilter from "../../assets/images/icon-filter.svg";

const Notification = () => {
  // State cho danh sách thông báo
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State cho phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // State cho bộ lọc
  const [filter, setFilter] = useState("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Lấy dữ liệu thông báo từ API
  const fetchNotifications = async (currentPage = page, currentFilter = filter) => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL}?page=${currentPage}&limit=${limit}`;
      
      // Thêm bộ lọc nếu cần
      if (currentFilter !== "ALL") {
        url = `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL}/type/${currentFilter}?limit=${limit}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data && response.data.success) {
        setNotifications(response.data.data);
        
        // Cập nhật thông tin phân trang
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages);
          setTotalItems(response.data.pagination.total);
        }
      } else {
        throw new Error("Không thể tải dữ liệu thông báo");
      }
    } catch (err) {
      console.error("Lỗi khi tải thông báo:", err);
      setError("Đã xảy ra lỗi khi tải thông báo. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Lấy dữ liệu khi component được tải
  useEffect(() => {
    fetchNotifications();
    
    // Lắng nghe thông báo mới từ Socket.IO
    const handleNewNotification = (newNotification) => {
      console.log("Nhận thông báo mới:", newNotification);
      setNotifications(prev => [newNotification, ...prev]);
      setTotalItems(prev => prev + 1);
    };
    
    socketService.on("new-notification", handleNewNotification);
    
    return () => {
      socketService.off("new-notification", handleNewNotification);
    };
  }, []);

  // Lấy dữ liệu khi trang hoặc bộ lọc thay đổi
  useEffect(() => {
    fetchNotifications(page, filter);
  }, [page, filter]);

  // Đổi trang
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Đổi bộ lọc
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1); // Quay lại trang đầu tiên khi thay đổi bộ lọc
    setShowFilterMenu(false);
  };

  // Format thời gian
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Lấy màu cho từng loại thông báo
  const getNotificationColor = (type) => {
    switch (type) {
      case "CONNECTION":
        return "bg-green-100 text-green-800";
      case "THRESHOLD":
        return "bg-red-100 text-red-800";
      case "PUMP":
        return "bg-blue-100 text-blue-800";
      case "UPDATE":
        return "bg-purple-100 text-purple-800";
      case "TEST":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Lấy icon cho từng loại thông báo
  const getNotificationIcon = (type) => {
    switch (type) {
      case "CONNECTION":
        return "🔌";
      case "THRESHOLD":
        return "⚠️";
      case "PUMP":
        return "💧";
      case "UPDATE":
        return "🔄";
      case "TEST":
        return "🧪";
      default:
        return "📌";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Thông báo hệ thống</h1>
        
        <div className="flex items-center gap-2">
          {/* Nút làm mới */}
          <button 
            onClick={() => fetchNotifications()} 
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            <img src={IconRefresh} alt="Refresh" className="w-5 h-5" />
          </button>
          
          {/* Bộ lọc */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <img src={IconFilter} alt="Filter" className="w-5 h-5" />
              <span>{filter === "ALL" ? "Tất cả" : filter}</span>
            </button>
            
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                <button 
                  onClick={() => handleFilterChange("ALL")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => handleFilterChange("CONNECTION")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Kết nối
                </button>
                <button 
                  onClick={() => handleFilterChange("THRESHOLD")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Cảnh báo ngưỡng
                </button>
                <button 
                  onClick={() => handleFilterChange("PUMP")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Máy bơm
                </button>
                <button 
                  onClick={() => handleFilterChange("UPDATE")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Cập nhật
                </button>
                <button 
                  onClick={() => handleFilterChange("TEST")}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Kiểm tra
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hiển thị lỗi */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Danh sách thông báo */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">Không có thông báo nào</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`p-4 rounded-lg shadow-sm border-l-4 ${getNotificationColor(notification.type)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start">
                <div className="text-xl mr-3">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{notification.message}</h3>
                    <span className="text-xs text-gray-500">{formatTime(notification.timestamp)}</span>
                  </div>
                  
                  {notification.value && (
                    <p className="text-sm text-gray-600 mt-1">
                      Giá trị: {notification.value}
                    </p>
                  )}
                  
                  {notification.iotdevice && (
                    <div className="mt-2 text-xs text-gray-500">
                      Thiết bị: {notification.iotdevice.deviceCode} ({notification.iotdevice.deviceType})
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Phân trang */}
      {!loading && notifications.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Hiển thị {notifications.length} / {totalItems} thông báo
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Trước
            </button>
            
            {/* Hiển thị số trang */}
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 rounded ${
                    page === i + 1
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`px-3 py-1 rounded ${
                page === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification; 