import { useState, useEffect, useRef } from "react";
import { Card, Switch, Slider, Table, Tag, Button, Space, Collapse, Form, Input, Select, TimePicker, Checkbox, Tooltip, Modal, Spin, List, Empty } from "antd";
import { WifiOutlined, ReloadOutlined, SettingOutlined, InfoCircleOutlined, ScheduleOutlined, BulbOutlined, ClockCircleOutlined, CloseOutlined, ExclamationCircleFilled, DeleteOutlined, CalendarOutlined, ToolOutlined, DropboxOutlined, CheckOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../../services/ApiEndpoints";
import { toast } from "react-toastify";

const { Panel } = Collapse;
const { Option } = Select;

// Component hiển thị danh sách lịch trình đang kích hoạt
const ActiveSchedulesList = ({ schedules, onToggle, onDelete }) => {
  if (!schedules || schedules.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Không có lịch trình nào được kích hoạt"
      />
    );
  }
  
  const formatDays = (days) => {
    if (!days || !Array.isArray(days) || days.length === 0) {
      return 'Không có ngày nào';
    }
    
    const dayMap = {
      monday: 'Thứ 2',
      tuesday: 'Thứ 3',
      wednesday: 'Thứ 4',
      thursday: 'Thứ 5',
      friday: 'Thứ 6',
      saturday: 'Thứ 7',
      sunday: 'Chủ nhật',
      // Thêm hỗ trợ cho số
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      0: 'Chủ nhật',
    };
    
    return days.map(day => dayMap[day] || `Ngày ${day}`).join(', ');
  };

  const renderScheduleDetails = (schedule) => {
    if (!schedule) return null;
    
    const scheduleType = schedule.scheduleType || 'unknown';
    const startTime = schedule.startTime || '00:00';
    const duration = schedule.duration || 0;
    let actionDetails = null;
    
    if (scheduleType === 'watering') {
      const speed = schedule.speed !== undefined ? schedule.speed : 0;
      actionDetails = (
        <div>
          <Tag color="blue">Tốc độ máy bơm: {speed}%</Tag>
          <Tag color="cyan">Thời gian tưới: {duration} phút</Tag>
        </div>
      );
    } else if (scheduleType === 'lighting') {
      actionDetails = (
        <div>
          <Tag color="orange">Thời gian bật: {startTime}</Tag>
          <Tag color="purple">Thời gian tắt: {schedule.endTime || '00:00'}</Tag>
        </div>
      );
    }
    
    let endTime = '00:00';
    if (scheduleType === 'watering' && startTime && typeof duration === 'number') {
      try {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      } catch (error) {
        console.error('Lỗi khi tính toán thời gian kết thúc:', error);
      }
    } else if (scheduleType === 'lighting') {
      endTime = schedule.endTime || '00:00';
    }
    
    const daysFormatted = formatDays(schedule.days);
    
    return (
      <List.Item.Meta
        avatar={
          <div style={{ fontSize: '24px', marginRight: '8px' }}>
            {scheduleType === 'watering' ? <DropboxOutlined style={{ color: '#1890ff' }} /> : 
             scheduleType === 'lighting' ? <BulbOutlined style={{ color: '#faad14' }} /> : 
             <InfoCircleOutlined />}
          </div>
        }
        title={
          <div>
            <strong>{schedule.deviceName || `Thiết bị ID: ${schedule.deviceId || 'không xác định'}`}</strong>
            <div>
              <Tag color="geekblue">{scheduleType === 'watering' ? 'Lịch tưới nước' : scheduleType === 'lighting' ? 'Lịch chiếu sáng' : scheduleType}</Tag>
              <Tag color="purple">{daysFormatted}</Tag>
            </div>
          </div>
        }
        description={
          <div>
            <div>{scheduleType === 'watering' ? `Thời gian: ${startTime} - ${endTime} (${duration} phút)` : `Bật: ${startTime}, Tắt: ${endTime}`}</div>
            {actionDetails}
          </div>
        }
      />
    );
  };

  return (
    <List
      itemLayout="horizontal"
      dataSource={schedules}
      renderItem={schedule => (
        <List.Item
          actions={[
            <Button 
              key="toggle" 
              type={schedule.enabled ? "primary" : "default"}
              size="small"
              onClick={() => onToggle && onToggle(schedule)}
            >
              {schedule.enabled ? "Tắt" : "Bật"}
            </Button>,
            <Button 
              key="delete" 
              danger 
              size="small"
              onClick={() => onDelete && onDelete(schedule)}
            >
              Xóa
            </Button>
          ]}
        >
          {renderScheduleDetails(schedule)}
        </List.Item>
      )}
    />
  );
};

const ControlDevice = () => {
  const [deviceList, setDeviceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initialLoadCompleted = useRef(false);
  const deviceStateCache = useRef({});
  const [controlStates, setControlStates] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceConfig, setDeviceConfig] = useState({
    autoMode: true,
    wateringSchedule: {
      enabled: false,
      startTime: "07:00",
      duration: 15,
      days: ["monday", "wednesday", "friday"],
      speed: 50
    },
    lightSchedule: {
      enabled: false,
      onTime: "18:00",
      offTime: "06:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    }
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const statusRefreshInterval = useRef(null);
  const [deviceLoadingStatus, setDeviceLoadingStatus] = useState({});
  const [displayStates, setDisplayStates] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    if (!initialLoadCompleted.current) {
      console.log("First time initialization");
      fetchDeviceList();
      fetchSchedules();
      initialLoadCompleted.current = true;
    }
    
    statusRefreshInterval.current = setInterval(() => {
      if (deviceList.length > 0) {
        console.log("Refreshing device statuses via interval...");
        refreshStatus();
      }
    }, 30000);
    
    return () => {
      if (statusRefreshInterval.current) {
        clearInterval(statusRefreshInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (deviceList.length > 0) {
      console.log("Devices loaded, starting to fetch statuses...", deviceList);
      // Add small delay before refreshing status to ensure UI updates first
      const timer = setTimeout(() => {
        refreshStatus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [deviceList]);

  // Hàm mới để lấy trạng thái thiết bị và trả về kết quả
  const fetchDeviceStatusWithResult = async (deviceId) => {
    try {
      console.log(`fetchDeviceStatusWithResult starting for device ${deviceId}`);
      
      // Use a cache-busting parameter to ensure we get fresh data
      const timestamp = new Date().getTime();
      const deviceResponse = await axios.get(
        `${API_ENDPOINTS.DEVICES.GET_BY_ID(deviceId)}?_t=${timestamp}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
  
      console.log(`fetchDeviceStatusWithResult received response for device ${deviceId}:`, deviceResponse.data);
  
      if (deviceResponse.data && deviceResponse.data.success) {
        const deviceData = deviceResponse.data.data;
        if (deviceData) {
          // Hãy phân tích dữ liệu đúng cách
          let pumpSpeed = 0;
          let isLightOn = false;
          
          // Phân tích dữ liệu dựa trên loại thiết bị
          if (deviceData.deviceType === 'pump_water') {
            if (deviceData.lastValue !== undefined && deviceData.lastValue !== null) {
              try {
                if (typeof deviceData.lastValue === 'string') {
                  const trimmedValue = deviceData.lastValue.trim();
                  if (trimmedValue === '' || trimmedValue.toLowerCase() === 'off' || trimmedValue === '0') {
                    pumpSpeed = 0;
                  } else {
                    pumpSpeed = parseInt(trimmedValue, 10) || 0;
                  }
                } else if (typeof deviceData.lastValue === 'number') {
                  pumpSpeed = deviceData.lastValue;
                } else if (typeof deviceData.lastValue === 'boolean') {
                  pumpSpeed = deviceData.lastValue ? 100 : 0;
                }
                
                // Đảm bảo giá trị nằm trong khoảng hợp lệ
                pumpSpeed = Math.max(0, Math.min(100, pumpSpeed));
              } catch (e) {
                console.warn(`Không thể chuyển đổi giá trị máy bơm: ${deviceData.lastValue}`, e);
                pumpSpeed = 0;
              }
            }
            
            console.log(`Giá trị máy bơm từ API: ${deviceData.lastValue}, Kiểu: ${typeof deviceData.lastValue}, Đã chuyển đổi: ${pumpSpeed}`);
            
            // Lưu cache cho khôi phục nếu cần
            deviceStateCache.current[deviceId] = {
              pumpSpeed,
              isLightOn: false
            };
            
            return {
              success: true,
              deviceId: deviceId,
              data: {
                deviceType: 'pump_water',
                pumpSpeed: pumpSpeed
              }
            };
          } else if (deviceData.deviceType === 'light') {
            const lightValue = deviceData.lastValue;
            
            if (lightValue !== undefined && lightValue !== null) {
              if (typeof lightValue === 'string') {
                const normalizedValue = lightValue.toLowerCase().trim();
                isLightOn = normalizedValue === 'on' || 
                            normalizedValue === 'true' || 
                            normalizedValue === '1' || 
                            normalizedValue === 'yes' ||
                            normalizedValue === 'bật';
              } else if (typeof lightValue === 'boolean') {
                isLightOn = lightValue;
              } else if (typeof lightValue === 'number') {
                isLightOn = lightValue > 0;
              }
              
              console.log(`Phân tích trạng thái đèn: Giá trị gốc=${lightValue}, Kiểu=${typeof lightValue}, Kết quả=${isLightOn}`);
            }
            
            // Lưu cache cho khôi phục nếu cần
            deviceStateCache.current[deviceId] = {
              pumpSpeed: 0,
              isLightOn
            };
            
            return {
              success: true,
              deviceId: deviceId,
              data: {
                deviceType: 'light',
                isLightOn: isLightOn
              }
            };
          }
          
          // Fallback for unknown device type
          console.warn(`Unknown device type for device ${deviceId}: ${deviceData.deviceType}`);
          return { 
            success: false, 
            deviceId: deviceId, 
            error: new Error(`Unknown device type: ${deviceData.deviceType}`) 
          };
        }
      }
      console.warn(`Failed to get valid data for device ${deviceId}`);
      return { 
        success: false, 
        deviceId: deviceId,
        error: new Error("Invalid response data")
      };
    } catch (error) {
      console.error(`Lỗi khi lấy trạng thái thiết bị ${deviceId}:`, error);
      return { 
        success: false, 
        deviceId: deviceId, 
        error: error 
      };
    }
  };

  const fetchSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const response = await axios.get(
        API_ENDPOINTS.SCHEDULES.GET_ALL,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        // Lấy tất cả lịch trình
        let allSchedules = response.data.data || [];
        
        // Thêm thông tin thiết bị cho mỗi lịch trình
        const schedulesWithDeviceInfo = await Promise.all(
          allSchedules.map(async (schedule) => {
            try {
              // Nếu có deviceId, lấy thông tin thiết bị
              if (schedule.deviceId) {
                const deviceResponse = await axios.get(
                  API_ENDPOINTS.DEVICES.GET_BY_ID(schedule.deviceId),
                  {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem("token")}`
                    }
                  }
                );
                
                if (deviceResponse.data && deviceResponse.data.success && deviceResponse.data.data) {
                  const deviceInfo = deviceResponse.data.data;
                  return {
                    ...schedule,
                    deviceName: deviceInfo.deviceName || deviceInfo.deviceCode,
                    deviceType: deviceInfo.deviceType
                  };
                }
              }
              return schedule;
            } catch (error) {
              console.error(`Error fetching device info for schedule ${schedule.id}:`, error);
              return schedule;
            }
          })
        );
        
        console.log(`Đã tìm thấy ${schedulesWithDeviceInfo.length} lịch trình, trong đó ${schedulesWithDeviceInfo.filter(s => s.enabled).length} lịch trình đang hoạt động`);
        setSchedules(schedulesWithDeviceInfo);
      } else {
        console.error("Error fetching schedules:", response.data?.message);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Không thể tải danh sách lịch trình: " + (error.response?.data?.message || error.message));
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleToggleSchedule = async (schedule) => {
    try {
      const updatedSchedule = {
        ...schedule,
        enabled: !schedule.enabled
      };
      
      await axios.put(
        API_ENDPOINTS.SCHEDULES.UPDATE(schedule.id),
        updatedSchedule,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      toast.success(`Lịch trình đã được ${updatedSchedule.enabled ? 'bật' : 'tắt'}`);
      
      fetchSchedules();
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error("Không thể thay đổi trạng thái lịch trình: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    try {
      await axios.delete(
        API_ENDPOINTS.SCHEDULES.DELETE(schedule.id),
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      toast.success("Lịch trình đã được xóa");
      
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Không thể xóa lịch trình: " + (error.response?.data?.message || error.message));
    }
  };

  const handleRefreshSchedules = () => {
    fetchSchedules();
  };

  const fetchDeviceList = async () => {
    try {
      console.log("Fetching device list...");
      setLoading(true);
      
      const response = await axios.get(
        API_ENDPOINTS.DEVICES.GET_ALL,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data.success) {
        console.log("Device list fetched successfully:", response.data.data);
        const devices = response.data.data || [];
        
        // Thêm kiểm tra thiết bị có thuộc loại được hỗ trợ (đèn hoặc máy bơm)
        const filteredDevices = devices.filter(device => 
          device.deviceType === 'pump_water' || device.deviceType === 'light'
        );
        
        console.log(`Found ${filteredDevices.length} supported devices out of ${devices.length} total devices`);
        
        // Initialize controlStates and displayStates for each device
        const newControlStates = { ...controlStates };
        const newDisplayStates = { ...displayStates };
        const loadingStates = {};
        
        filteredDevices.forEach(device => {
          // Set initial loading state
          loadingStates[device.id] = true;
          
          // Initialize control and display states
          if (device.deviceType === 'pump_water') {
            newControlStates[device.id] = {
              ...newControlStates[device.id],
              pumpWaterOn: false,
              pumpWaterSpeed: 0
            };
            newDisplayStates[device.id] = {
              ...newDisplayStates[device.id],
              pumpWaterOn: false,
              pumpWaterSpeed: 0
            };
          } else if (device.deviceType === 'light') {
            newControlStates[device.id] = {
              ...newControlStates[device.id],
              light: false
            };
            newDisplayStates[device.id] = {
              ...newDisplayStates[device.id],
              light: false
            };
          }
        });
        
        // Set the device loading states
        setDeviceLoadingStatus(loadingStates);
        
        // Update the state values
        setControlStates(newControlStates);
        setDisplayStates(newDisplayStates);
        setDeviceList(filteredDevices);
      } else {
        console.error("Error fetching device list:", response.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching device list:", error);
      toast.error("Không thể tải danh sách thiết bị: " + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  // Refresh status for all devices
  const refreshStatus = async () => {
    console.log("Starting refreshStatus with deviceList:", deviceList?.length || 0, "devices");
    try {
      if (!deviceList || deviceList.length === 0) {
        console.log("No devices found, skipping refresh");
        setLoading(false); // Make sure to set loading to false here
        return;
      }
      
      setLoading(true);
      
      // Clear existing cache to ensure we get fresh data
      deviceStateCache.current = {};
      
      // Fetch all device statuses in parallel
      console.log("Fetching device statuses in parallel for", deviceList.length, "devices");
      const deviceStatusPromises = deviceList.map(device => {
        console.log("Creating promise for device:", device.id);
        return fetchDeviceStatusWithResult(device.id);
      });
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Device status fetch timeout")), 15000)
      );
      
      // Use Promise.race with the timeout
      const results = await Promise.race([
        Promise.all(deviceStatusPromises),
        timeoutPromise
      ]);
      
      console.log("All device statuses fetched, processing results:", results?.length || 0);
      
      // Process all results and update states
      const newControlStates = { ...controlStates };
      const newDisplayStates = { ...displayStates };
      const newLoadingStates = {};
      
      // Initialize loading states to false for all devices
      deviceList.forEach(device => {
        newLoadingStates[device.id] = false;
      });
      
      // Update states based on results
      results.forEach(result => {
        if (result && result.success && result.data) {
          const { deviceId, data } = result;
          
          if (data.deviceType === 'pump_water') {
            newControlStates[deviceId] = {
              ...newControlStates[deviceId],
              pumpWaterOn: data.pumpSpeed > 0,
              pumpWaterSpeed: data.pumpSpeed
            };
            
            newDisplayStates[deviceId] = {
              ...newDisplayStates[deviceId],
              pumpWaterOn: data.pumpSpeed > 0,
              pumpWaterSpeed: data.pumpSpeed
            };
            
            console.log(`Updated pump status for device ${deviceId}: Speed=${data.pumpSpeed}, On=${data.pumpSpeed > 0}`);
          } else if (data.deviceType === 'light') {
            newControlStates[deviceId] = {
              ...newControlStates[deviceId],
              light: data.isLightOn
            };
            
            newDisplayStates[deviceId] = {
              ...newDisplayStates[deviceId],
              light: data.isLightOn
            };
            
            console.log(`Updated light status for device ${deviceId}: On=${data.isLightOn}`);
          }
        } else if (result) {
          console.warn(`Failed to refresh status for device ${result.deviceId}:`, result.error);
        }
      });
      
      console.log("Updating control and display states");
      
      // Update all states at once to minimize re-renders
      setDeviceLoadingStatus(newLoadingStates);
      setControlStates(newControlStates);
      setDisplayStates(newDisplayStates);
      
      setInitialized(true);
      console.log("RefreshStatus completed successfully");
      
      // Clear loading state
      setLoading(false);
      
      // Return success
      return true;
    } catch (error) {
      console.error("Error refreshing statuses:", error);
      // Even if there's an error, make sure we're not stuck in loading state
      const deviceLoadingObj = {};
      deviceList?.forEach(device => {
        deviceLoadingObj[device.id] = false;
      });
      setDeviceLoadingStatus(deviceLoadingObj);
      
      // Show error message to user
      toast.error("Không thể lấy trạng thái thiết bị: " + (error.message || "Lỗi không xác định"));
      
      // Clear loading state
      setLoading(false);
      
      // Re-throw to allow proper promise chaining
      throw error;
    }
  };
  
  // Force a refresh of all device statuses
  const forceRefreshStatus = () => {
    console.log("Force refreshing all device statuses");
    setInitialized(false);
    // Show a toast message to indicate refresh is in progress
    toast.info("Đang cập nhật trạng thái thiết bị...");
    
    refreshStatus()
      .then(() => {
        // Show success message when refresh completes
        toast.success("Đã cập nhật trạng thái thiết bị thành công");
      })
      .catch((error) => {
        console.error("Error in force refresh:", error);
        // Error message is already handled in refreshStatus
      });
  };

  const fetchDeviceStatus = async (deviceId) => {
    // Đánh dấu thiết bị đang tải
    setDeviceLoadingStatus(prev => ({
      ...prev,
      [deviceId]: true
    }));
    
    try {
      const deviceResponse = await axios.get(
        API_ENDPOINTS.DEVICES.GET_BY_ID(deviceId),
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
  
      if (deviceResponse.data && deviceResponse.data.success) {
        const deviceData = deviceResponse.data.data;
        if (deviceData) {
          console.log(`Đồng bộ dữ liệu thiết bị ${deviceId}:`, deviceData);
          
          try {
            // Cập nhật trạng thái điều khiển với dữ liệu thực tế từ thiết bị
            if (deviceData.deviceType === 'pump_water') {
              // Lấy giá trị thực tế từ thiết bị
              let pumpSpeed = 0;
              
              if (deviceData.lastValue !== undefined && deviceData.lastValue !== null) {
                // Cố gắng chuyển đổi thành số
                try {
                  // Kiểm tra nếu là chuỗi hoặc số
                  if (typeof deviceData.lastValue === 'string') {
                    // Xử lý các trường hợp chuỗi khác nhau
                    const trimmedValue = deviceData.lastValue.trim();
                    if (trimmedValue === '' || trimmedValue.toLowerCase() === 'off' || trimmedValue === '0') {
                      pumpSpeed = 0;
                    } else {
                      pumpSpeed = parseInt(trimmedValue, 10) || 0;
                    }
                  } else if (typeof deviceData.lastValue === 'number') {
                    pumpSpeed = deviceData.lastValue;
                  } else if (typeof deviceData.lastValue === 'boolean') {
                    // Xử lý trường hợp boolean
                    pumpSpeed = deviceData.lastValue ? 100 : 0;
                  }
                  
                  // Đảm bảo giá trị nằm trong khoảng hợp lệ
                  pumpSpeed = Math.max(0, Math.min(100, pumpSpeed));
                } catch (e) {
                  console.warn(`Không thể chuyển đổi giá trị máy bơm: ${deviceData.lastValue}`, e);
                  pumpSpeed = 0;
                }
              }
              
              console.log(`Giá trị máy bơm từ API: ${deviceData.lastValue}, Kiểu: ${typeof deviceData.lastValue}, Đã chuyển đổi: ${pumpSpeed}`);
              
              setControlStates(prev => {
                // Đảm bảo device.id đã được khởi tạo
                const currentState = prev[deviceId] || {};
                
                return {
                  ...prev,
                  [deviceId]: {
                    ...currentState,
                    pumpWaterOn: pumpSpeed > 0,
                    pumpWaterSpeed: pumpSpeed
                  }
                };
              });
              
              console.log(`Đồng bộ trạng thái máy bơm ${deviceId}: Tốc độ ${pumpSpeed}%, ${pumpSpeed > 0 ? 'BẬT' : 'TẮT'}`);
            } else if (deviceData.deviceType === 'light') {
              // Xử lý các dạng giá trị khác nhau có thể có
              const lightValue = deviceData.lastValue;
              
              // Cải thiện xử lý các định dạng giá trị khác nhau
              let isLightOn = false;
              
              if (lightValue !== undefined && lightValue !== null) {
                // Nếu là chuỗi
                if (typeof lightValue === 'string') {
                  const normalizedValue = lightValue.toLowerCase().trim();
                  isLightOn = normalizedValue === 'on' || 
                              normalizedValue === 'true' || 
                              normalizedValue === '1' || 
                              normalizedValue === 'yes' ||
                              normalizedValue === 'bật';
                } 
                // Nếu là boolean
                else if (typeof lightValue === 'boolean') {
                  isLightOn = lightValue;
                } 
                // Nếu là số
                else if (typeof lightValue === 'number') {
                  isLightOn = lightValue > 0;
                }
                
                console.log(`Phân tích trạng thái đèn: Giá trị gốc=${lightValue}, Kiểu=${typeof lightValue}, Kết quả=${isLightOn}`);
              }
              
              // Cập nhật trạng thái đèn với giá trị mới
              setControlStates(prev => {
                // Đảm bảo device.id đã được khởi tạo
                const currentState = prev[deviceId] || {};
                const newState = {
                  ...prev,
                  [deviceId]: {
                    ...currentState,
                    light: isLightOn
                  }
                };
                
                console.log(`Cập nhật trạng thái đèn: ${JSON.stringify(newState[deviceId])}`);
                return newState;
              });
              
              console.log(`Đồng bộ trạng thái đèn ${deviceId}: ${isLightOn ? 'Bật' : 'Tắt'}`);
            }
          } catch (error) {
            console.error(`Lỗi khi xử lý dữ liệu thiết bị ${deviceId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Lỗi khi lấy trạng thái thiết bị ${deviceId}:`, error);
    } finally {
      // Đánh dấu thiết bị đã tải xong
      setDeviceLoadingStatus(prev => ({
        ...prev,
        [deviceId]: false
      }));
    }
  };

  const handlePumpSpeedChange = async (value, deviceId) => {
    // Đảm bảo giá trị là một số nguyên
    const speedValue = parseInt(value, 10);
    
    // Log để kiểm tra giá trị
    console.log(`handlePumpSpeedChange: deviceId=${deviceId}, speed=${speedValue}, type=${typeof speedValue}`);
    
    // Đánh dấu thiết bị đang trong trạng thái loading
    setDeviceLoadingStatus(prev => ({
      ...prev,
      [deviceId]: true
    }));
    
    // Cập nhật trạng thái local trước (UI sẽ phản ứng ngay) - Cập nhật cả controlStates và displayStates
    setControlStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        pumpWaterSpeed: speedValue,
        pumpWaterOn: speedValue > 0
      }
    }));
    
    // Cập nhật displayStates đồng thời
    setDisplayStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        pumpWaterSpeed: speedValue,
        pumpWaterOn: speedValue > 0
      }
    }));
    
    try {
      // Gửi lệnh đến thiết bị
      console.log(`Sending pumpWater command with speed: ${speedValue}`);
      
      await sendDeviceCommand(deviceId, 'pumpWater', {
        status: speedValue > 0 ? 'On' : 'Off',
        speed: speedValue
      });
      
      // Hiển thị thông báo thành công
      if (speedValue === 0) {
        toast.success('Đã tắt máy bơm');
      } else {
        toast.success(`Tốc độ máy bơm đã được đặt: ${speedValue}%`);
      }
      
      // Tải lại trạng thái thiết bị từ API để đảm bảo hiển thị đúng
      const deviceStatus = await fetchDeviceStatusWithResult(deviceId);
      
      // Cập nhật state theo kết quả API mới nhất
      if (deviceStatus && deviceStatus.data) {
        const { data } = deviceStatus;
        
        // Cập nhật cả hai states để đảm bảo sự nhất quán
        setControlStates(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            pumpWaterSpeed: data.pumpSpeed,
            pumpWaterOn: data.pumpSpeed > 0
          }
        }));
        
        setDisplayStates(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            pumpWaterSpeed: data.pumpSpeed,
            pumpWaterOn: data.pumpSpeed > 0
          }
        }));
      }
    } catch (error) {
      // Hiển thị thông báo lỗi
      if (speedValue === 0) {
        toast.error("Không thể tắt máy bơm: " + error.message);
      } else {
        toast.error("Không thể điều chỉnh tốc độ máy bơm: " + error.message);
      }
      
      // Lấy lại giá trị từ cache nếu có
      const cachedState = deviceStateCache.current[deviceId];
      const pumpSpeed = cachedState && cachedState.pumpSpeed !== undefined ? 
                        cachedState.pumpSpeed : 0;
      
      // Khôi phục trạng thái - cập nhật cả hai state
      setControlStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          pumpWaterSpeed: pumpSpeed,
          pumpWaterOn: pumpSpeed > 0
        }
      }));
      
      setDisplayStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          pumpWaterSpeed: pumpSpeed,
          pumpWaterOn: pumpSpeed > 0
        }
      }));
    } finally {
      // Kết thúc trạng thái loading
      setDeviceLoadingStatus(prev => ({
        ...prev,
        [deviceId]: false
      }));
    }
  };

  const handleToggleLight = async (checked, deviceId) => {
    // Log để kiểm tra
    console.log(`handleToggleLight: deviceId=${deviceId}, checked=${checked}, type=${typeof checked}`);
    
    // Đánh dấu thiết bị đang trong trạng thái loading
    setDeviceLoadingStatus(prev => ({
      ...prev,
      [deviceId]: true
    }));
    
    // Cập nhật trạng thái local trước (UI sẽ phản ứng ngay) - cả hai state
    setControlStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        light: checked
      }
    }));
    
    // Cập nhật displayStates đồng thời
    setDisplayStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        light: checked
      }
    }));
    
    try {
      // Gửi lệnh đến thiết bị
      await sendDeviceCommand(deviceId, 'light', {
        status: checked ? 'On' : 'Off'
      });
      
      // Hiển thị thông báo thành công
      toast.success(`Đèn đã ${checked ? 'bật' : 'tắt'}`);
      
      // Tải lại trạng thái thiết bị từ API để đảm bảo hiển thị đúng
      const deviceStatus = await fetchDeviceStatusWithResult(deviceId);
      
      // Cập nhật state theo kết quả API mới nhất
      if (deviceStatus && deviceStatus.data) {
        const { data } = deviceStatus;
        
        // Cập nhật cả hai states để đảm bảo sự nhất quán
        setControlStates(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            light: data.isLightOn
          }
        }));
        
        setDisplayStates(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            light: data.isLightOn
          }
        }));
      }
    } catch (error) {
      // Hiển thị thông báo lỗi
      toast.error(`Không thể ${checked ? 'bật' : 'tắt'} đèn: ` + error.message);
      
      // Lấy lại giá trị từ cache nếu có
      const cachedState = deviceStateCache.current[deviceId];
      const isLightOn = cachedState && cachedState.isLightOn !== undefined ? 
                        cachedState.isLightOn : false;
      
      // Khôi phục trạng thái - cập nhật cả hai state
      setControlStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          light: isLightOn
        }
      }));
      
      setDisplayStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          light: isLightOn
        }
      }));
    } finally {
      // Kết thúc trạng thái loading
      setDeviceLoadingStatus(prev => ({
        ...prev,
        [deviceId]: false
      }));
    }
  };

  const sendDeviceCommand = async (deviceId, type, data) => {
    // Make a copy of the data to avoid reference issues
    const commandData = JSON.parse(JSON.stringify(data));
    
    // Debug log to verify data before the API call
    console.log(`sendDeviceCommand called with type: ${type}, data:`, commandData);
    
    try {
      const response = await axios.post(
        API_ENDPOINTS.DEVICES.CONTROL(deviceId),
        {
          type,
          ...commandData
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      // Debug log the response
      console.log(`Response from device command:`, response.data);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || "Lỗi khi gửi lệnh điều khiển");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error sending device command:", error);
      throw new Error(error.response?.data?.message || error.message);
    }
  };

  // Kiểm tra xem thiết bị có trực tuyến không dựa trên dữ liệu cảm biến gần đây
  const isDeviceOnline = (device) => {
    // Tạm thời coi tất cả thiết bị là online do các trường isOnline, status, lastseen đã bị xóa trong schema
    return true;
  };

  // Hiển thị điều khiển máy bơm
  const renderPumpControls = (device) => {
    if (!device || device.deviceType !== 'pump_water') return null;
    
    // Kiểm tra xem thiết bị này có đang được chọn không và có đang ở chế độ tự động không
    const isCurrentDevice = selectedDevice && selectedDevice.id === device.id;
    const isAutoMode = isCurrentDevice && deviceConfig.autoMode;
    const isWateringScheduleEnabled = isCurrentDevice && deviceConfig.wateringSchedule?.enabled;
    
    // Thiết bị ở chế độ tự động khi autoMode = true và lịch tưới nước đã bật
    const isInAutoMode = isAutoMode && isWateringScheduleEnabled;
    
    // Kiểm tra trạng thái loading của thiết bị
    const isDeviceLoading = deviceLoadingStatus[device.id] === true;
    
    // Sử dụng displayStates để hiển thị (ưu tiên) hoặc controlStates nếu không có
    const displayState = displayStates[device.id] || {};
    const controlState = controlStates[device.id] || {};
    
    // Lấy giá trị từ displayState (ưu tiên) hoặc controlState
    const pumpSpeedValue = displayState.pumpWaterSpeed !== undefined ? 
                          displayState.pumpWaterSpeed : 
                          controlState.pumpWaterSpeed;
                          
    // Đảm bảo hiển thị đúng giá trị thực tế
    const pumpSpeed = pumpSpeedValue !== undefined ? pumpSpeedValue : 0;

    // Log để debug - thêm thông tin về cả hai state
    console.log(`Render pump controls for device ${device.id}: Display=${JSON.stringify(displayState)}, Control=${JSON.stringify(controlState)}, Final Speed=${pumpSpeed}, Loading=${isDeviceLoading}`);
    
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Tốc độ máy bơm</span>
          {isDeviceLoading ? (
            <span className="text-sm text-gray-500">Đang tải...</span>
          ) : (
            <span className="text-sm text-blue-500 font-medium">{pumpSpeed}%</span>
          )}
        </div>
        
        {isDeviceLoading ? (
          <div className="flex justify-center p-3">
            <div className="animate-pulse flex space-x-2">
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
            </div>
          </div>
        ) : isDeviceOnline(device) && !isInAutoMode ? (
          <div className="flex justify-between space-x-4">
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${pumpSpeed === 0 
                ? 'bg-blue-500 text-white font-medium shadow-md' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handlePumpSpeedChange(0, device.id)}
              disabled={isInAutoMode || isDeviceLoading}
            >
              Tắt (0%)
            </button>
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${pumpSpeed === 50 
                ? 'bg-blue-500 text-white font-medium shadow-md' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => {
                const mediumSpeed = 50;
                console.log("Medium speed button clicked with exact value:", mediumSpeed);
                handlePumpSpeedChange(mediumSpeed, device.id);
              }}
              disabled={isInAutoMode || isDeviceLoading}
            >
              Vừa (50%)
            </button>
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${pumpSpeed === 100 
                ? 'bg-blue-500 text-white font-medium shadow-md' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handlePumpSpeedChange(100, device.id)}
              disabled={isInAutoMode || isDeviceLoading}
            >
              Cao (100%)
            </button>
          </div>
        ) : null}
        
        {isInAutoMode && !isDeviceLoading && (
          <div className="text-yellow-600 text-xs bg-yellow-50 p-2 rounded">
            Đang ở chế độ tự động. Hãy tắt chế độ tự động để điều khiển thủ công.
          </div>
        )}
        
        {!isDeviceOnline(device) && !isDeviceLoading && (
          <div className="text-red-500 text-xs mt-2">
            Thiết bị offline. Không thể điều khiển.
          </div>
        )}
      </div>
    );
  };

  // Hiển thị điều khiển đèn
  const renderLightControls = (device) => {
    if (!device || device.deviceType !== 'light') return null;
    
    // Kiểm tra xem thiết bị này có đang được chọn không và có đang ở chế độ tự động không
    const isCurrentDevice = selectedDevice && selectedDevice.id === device.id;
    const isAutoMode = isCurrentDevice && deviceConfig.autoMode;
    const isLightScheduleEnabled = isCurrentDevice && deviceConfig.lightSchedule?.enabled;
    
    // Thiết bị ở chế độ tự động khi autoMode = true và lịch chiếu sáng đã bật
    const isInAutoMode = isAutoMode && isLightScheduleEnabled;
    
    // Kiểm tra trạng thái loading của thiết bị
    const isDeviceLoading = deviceLoadingStatus[device.id] === true;
    
    // Sử dụng displayStates để hiển thị (ưu tiên) hoặc controlStates nếu không có
    const displayState = displayStates[device.id] || {};
    const controlState = controlStates[device.id] || {};
    
    // Lấy giá trị từ displayState (ưu tiên) hoặc controlState
    const lightValue = displayState.light !== undefined ? 
                      displayState.light : 
                      controlState.light;
                      
    // Đảm bảo hiển thị đúng giá trị thực sự
    const isLightOn = lightValue !== undefined ? lightValue : false;

    // Log để debug - thêm thông tin về cả hai state
    console.log(`Render light controls for device ${device.id}: Display=${JSON.stringify(displayState)}, Control=${JSON.stringify(controlState)}, Final Light=${isLightOn}, Loading=${isDeviceLoading}`);
    
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center">
          <span className="font-medium">Đèn chiếu sáng</span>
          {isDeviceLoading ? (
            <span className="text-sm text-gray-500">Đang tải...</span>
          ) : (
            <div className={`p-1 rounded-full transition-all ${isLightOn ? 'bg-yellow-100 shadow-md' : ''}`}>
              <Switch
                checked={isLightOn}
                onChange={(checked) => handleToggleLight(checked, device.id)}
                className={isLightOn ? "bg-yellow-500" : ""}
                disabled={!isDeviceOnline(device) || isInAutoMode || isDeviceLoading}
              />
            </div>
          )}
        </div>
        
        {isDeviceLoading ? (
          <div className="flex justify-center p-3">
            <div className="animate-pulse flex space-x-2">
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
              <div className="rounded-full bg-gray-200 h-2 w-2"></div>
            </div>
          </div>
        ) : isDeviceOnline(device) && !isInAutoMode && (
          <div className="mt-2 text-center">
            <div className={`text-sm font-medium ${isLightOn ? 'text-yellow-500' : 'text-gray-400'}`}>
              {isLightOn ? '☀️ Đèn đang bật' : '🌙 Đèn đang tắt'}
            </div>
          </div>
        )}
        
        {isInAutoMode && !isDeviceLoading && (
          <div className="text-yellow-600 text-xs bg-yellow-50 p-2 mt-2 rounded">
            Đang ở chế độ lịch trình tự động. Hãy tắt lịch trình để điều khiển thủ công.
          </div>
        )}
        
        {!isDeviceOnline(device) && !isDeviceLoading && (
          <div className="text-red-500 text-xs mt-2">
            Thiết bị offline. Không thể điều khiển.
          </div>
        )}
      </div>
    );
  };

  // Hiển thị nút cấu hình
  const renderConfigButton = (device) => {
    return (
      <Button 
        size="small"
        icon={<SettingOutlined />}
        onClick={() => handleSelectDevice(device)}
      >
        Cấu hình
      </Button>
    );
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    fetchDeviceStatus(device.id);
    
    // Nếu là máy bơm, đặt tốc độ mặc định từ trạng thái hiện tại
    if (device.deviceType === 'pump_water') {
      setDeviceConfig(prevConfig => ({
        ...prevConfig,
        wateringSchedule: {
          ...prevConfig.wateringSchedule,
          speed: controlStates[device.id]?.pumpWaterSpeed || 50
        }
      }));
    }
  };

  const handleCloseConfig = () => {
    setSelectedDevice(null);
    setDeviceConfig({
      autoMode: true,
      wateringSchedule: {
        enabled: false,
        startTime: "07:00",
        duration: 15,
        days: ["monday", "wednesday", "friday"],
        speed: 50
      },
      lightSchedule: {
        enabled: false,
        onTime: "18:00",
        offTime: "06:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      }
    });
  };

  const handleAutoModeChange = (checked) => {
    setDeviceConfig(prev => ({
      ...prev,
      autoMode: checked
    }));
  };

  const handleScheduleChange = (scheduleType, field, value) => {
    setDeviceConfig(prev => ({
      ...prev,
      [scheduleType]: {
        ...prev[scheduleType],
        [field]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    if (!selectedDevice) return;
    
    try {
      setSavingConfig(true);
      
      // Chuẩn bị dữ liệu cấu hình
      const configData = {
        ...deviceConfig
      };
      
      // Thêm các trường cần thiết tùy theo loại thiết bị
      if (selectedDevice.deviceType === 'pump_water') {
        // Đảm bảo cấu hình máy bơm có đầy đủ trường
        configData.pumpWaterSpeed = controlStates[selectedDevice.id]?.pumpWaterSpeed || 0;
      } else if (selectedDevice.deviceType === 'light') {
        // Đảm bảo cấu hình đèn có đầy đủ trường
        configData.light = controlStates[selectedDevice.id]?.light || false;
      }
      
      console.log("Saving config:", configData);
      
      // Bỏ qua việc lưu cấu hình vào bảng configuration vì không liên quan
      console.log("Bỏ qua việc lưu cấu hình, chỉ lưu lịch trình");
      
      // Cập nhật trạng thái thiết bị trực tiếp (nếu cần)
      if (selectedDevice.deviceType === 'pump_water' || selectedDevice.deviceType === 'light') {
        // Gửi lệnh cập nhật trạng thái thiết bị
        try {
          await axios.put(
            API_ENDPOINTS.DEVICES.UPDATE(selectedDevice.id),
            {
              status: 'On', // Chỉ sử dụng giá trị hợp lệ 'On' hoặc 'Off' theo schema
              // Lưu thông tin autoMode vào bảng scheduled thay vì vào trạng thái thiết bị
              lastValue: selectedDevice.deviceType === 'pump_water' ? configData.pumpWaterSpeed : (configData.light ? 1 : 0)
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          console.log(`Đã cập nhật trạng thái thiết bị ${selectedDevice.id}`);
        } catch (updateError) {
          console.error("Lỗi khi cập nhật trạng thái thiết bị:", updateError);
          // Tiếp tục xử lý lưu lịch trình ngay cả khi cập nhật trạng thái thiết bị thất bại
        }
      }
      
      // Lưu lịch trình tưới nước nếu thiết bị là máy bơm và chế độ tự động được bật
      if (selectedDevice.deviceType === 'pump_water' && 
          configData.autoMode && 
          configData.wateringSchedule && 
          configData.wateringSchedule.enabled) {
        
        // Kiểm tra xem đã có lịch trình cho thiết bị này chưa
        const scheduleResponse = await axios.get(
          API_ENDPOINTS.SCHEDULES.GET_BY_DEVICE(selectedDevice.id),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        // Chuẩn bị dữ liệu lịch trình tưới nước
        const wateringScheduleData = {
          deviceId: selectedDevice.id,
          scheduleType: 'watering',
          enabled: configData.wateringSchedule.enabled,
          startTime: configData.wateringSchedule.startTime,
          duration: configData.wateringSchedule.duration,
          speed: configData.wateringSchedule.speed,
          days: configData.wateringSchedule.days,
          autoMode: configData.autoMode
        };
        
        // Nếu đã có lịch trình, cập nhật lịch trình đó
        if (scheduleResponse.data && scheduleResponse.data.success && 
            scheduleResponse.data.data && scheduleResponse.data.data.length > 0) {
          const existingSchedule = scheduleResponse.data.data.find(s => s.scheduleType === 'watering');
          
          if (existingSchedule) {
            await axios.put(
              API_ENDPOINTS.SCHEDULES.UPDATE(existingSchedule.id),
              wateringScheduleData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            console.log("Đã cập nhật lịch trình tưới nước ID:", existingSchedule.id);
          } else {
            // Tạo lịch trình mới nếu không tìm thấy lịch trình tưới nước
            await axios.post(
              API_ENDPOINTS.SCHEDULES.CREATE,
              wateringScheduleData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            console.log("Đã tạo lịch trình tưới nước mới");
          }
        } else {
          // Tạo lịch trình mới nếu chưa có lịch trình nào
          await axios.post(
            API_ENDPOINTS.SCHEDULES.CREATE,
            wateringScheduleData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          console.log("Đã tạo lịch trình tưới nước mới");
        }
      }
      
      // Lưu lịch trình chiếu sáng nếu thiết bị là đèn và chế độ tự động được bật
      if (selectedDevice.deviceType === 'light' && 
          configData.autoMode && 
          configData.lightSchedule && 
          configData.lightSchedule.enabled) {
        
        // Kiểm tra xem đã có lịch trình cho thiết bị này chưa
        const scheduleResponse = await axios.get(
          API_ENDPOINTS.SCHEDULES.GET_BY_DEVICE(selectedDevice.id),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        // Chuẩn bị dữ liệu lịch trình chiếu sáng
        const lightScheduleData = {
          deviceId: selectedDevice.id,
          scheduleType: 'lighting',
          enabled: configData.lightSchedule.enabled,
          startTime: configData.lightSchedule.onTime,
          endTime: configData.lightSchedule.offTime,
          days: configData.lightSchedule.days,
          autoMode: configData.autoMode
        };
        
        // Nếu đã có lịch trình, cập nhật lịch trình đó
        if (scheduleResponse.data && scheduleResponse.data.success && 
            scheduleResponse.data.data && scheduleResponse.data.data.length > 0) {
          const existingSchedule = scheduleResponse.data.data.find(s => s.scheduleType === 'lighting');
          
          if (existingSchedule) {
            await axios.put(
              API_ENDPOINTS.SCHEDULES.UPDATE(existingSchedule.id),
              lightScheduleData,
              {
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
            );
            console.log("Đã cập nhật lịch trình chiếu sáng ID:", existingSchedule.id);
          } else {
            // Tạo lịch trình mới nếu không tìm thấy lịch trình chiếu sáng
            await axios.post(
              API_ENDPOINTS.SCHEDULES.CREATE,
              lightScheduleData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            console.log("Đã tạo lịch trình chiếu sáng mới");
          }
        } else {
          // Tạo lịch trình mới nếu chưa có lịch trình nào
          await axios.post(
            API_ENDPOINTS.SCHEDULES.CREATE,
            lightScheduleData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          console.log("Đã tạo lịch trình chiếu sáng mới");
        }
      }
      
      toast.success("Cấu hình đã được lưu thành công");
      
      // Cập nhật giao diện điều khiển
      fetchDeviceStatus(selectedDevice.id);
      
      // Cập nhật danh sách lịch trình
      if (document.querySelector('.active-schedules-list')) {
        // Tìm component danh sách lịch trình và gọi hàm refreshSchedules
        setTimeout(() => {
          document.querySelector('.refresh-schedules-button')?.click();
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving device config:", error);
      toast.error("Lỗi khi lưu cấu hình: " + (error.response?.data?.message || error.message));
    } finally {
      setSavingConfig(false);
    }
  };

  const columns = [
    {
      title: 'Mã thiết bị',
      dataIndex: 'deviceCode',
      key: 'deviceCode',
    },
    {
      title: 'Loại thiết bị',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type) => {
        let color = '';
        let displayName = '';
        
        switch(type) {
          case 'pump_water':
            color = 'cyan';
            displayName = 'Máy bơm';
            break;
          case 'light':
            color = 'gold';
            displayName = 'Đèn';
            break;
          default:
            color = 'default';
            displayName = type;
        }
        
        return <Tag color={color}>{displayName}</Tag>;
      },
      filters: [
        { text: 'Máy bơm', value: 'pump_water' },
        { text: 'Đèn', value: 'light' }
      ],
      onFilter: (value, record) => record.deviceType === value,
    },
    {
      title: 'Điều khiển',
      key: 'controls',
      render: (_, record) => {
        if (record.deviceType === 'pump_water') {
          return renderPumpControls(record);
        } else if (record.deviceType === 'light') {
          return renderLightControls(record);
        }
        return null;
      },
    },
    {
      title: '',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {renderConfigButton(record)}
          <Button 
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => navigate(`/dashboard/device/${record.id}`)}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Điều Khiển Thiết Bị</h1>
        <p className="text-gray-600">Bật/tắt & cấu hình tự động hóa máy bơm và đèn</p>
      </div>

      {/* Thanh công cụ */}
      <div className="mb-4 flex justify-between items-center">
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDeviceList}
            loading={loading}
          >
            Làm mới danh sách
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={forceRefreshStatus}
            loading={loading}
            type="primary"
          >
            Cập nhật trạng thái
          </Button>
        </Space>
      </div>

      {/* Danh sách thiết bị */}
      <Card title="Điều khiển thiết bị" className="mb-6 shadow-md">
        <Table
          dataSource={deviceList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Không có thiết bị máy bơm hoặc đèn nào" }}
        />
      </Card>

      {/* Danh sách lịch trình */}
      <Card 
        title="Lịch trình đang hoạt động" 
        className="mb-6 shadow-md"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshSchedules}
            loading={schedulesLoading}
            className="refresh-schedules-button"
          >
            Làm mới
          </Button>
        }
      >
        <Table
          dataSource={schedules.filter(schedule => schedule.enabled)}
          rowKey="id"
          loading={schedulesLoading}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: "Không có lịch trình nào được kích hoạt" }}
          columns={[
            {
              title: 'Loại lịch trình',
              key: 'scheduleType',
              render: (_, record) => {
                const scheduleType = record.scheduleType || 'unknown';
                return (
                  <Tag color={scheduleType === 'watering' ? 'blue' : scheduleType === 'lighting' ? 'gold' : 'default'}>
                    {scheduleType === 'watering' ? (
                      <><DropboxOutlined /> Tưới nước</>
                    ) : scheduleType === 'lighting' ? (
                      <><BulbOutlined /> Chiếu sáng</>
                    ) : scheduleType}
                  </Tag>
                );
              },
              filters: [
                { text: 'Tưới nước', value: 'watering' },
                { text: 'Chiếu sáng', value: 'lighting' }
              ],
              onFilter: (value, record) => record.scheduleType === value,
            },
            {
              title: 'Thiết bị',
              dataIndex: 'deviceName',
              key: 'deviceName',
              render: (text, record) => text || `Thiết bị ID: ${record.deviceId || 'không xác định'}`,
              sorter: (a, b) => {
                const aName = a.deviceName || '';
                const bName = b.deviceName || '';
                return aName.localeCompare(bName);
              },
            },
            {
              title: 'Ngày',
              key: 'days',
              render: (_, record) => {
                const formatDays = (days) => {
                  if (!days || !Array.isArray(days) || days.length === 0) {
                    return 'Không có ngày nào';
                  }
                  
                  const dayMap = {
                    monday: 'T2',
                    tuesday: 'T3',
                    wednesday: 'T4',
                    thursday: 'T5',
                    friday: 'T6',
                    saturday: 'T7',
                    sunday: 'CN',
                    // Hỗ trợ cho số
                    1: 'T2',
                    2: 'T3',
                    3: 'T4',
                    4: 'T5',
                    5: 'T6',
                    6: 'T7',
                    0: 'CN',
                  };
                  
                  const fullDayMap = {
                    monday: 'Thứ 2',
                    tuesday: 'Thứ 3',
                    wednesday: 'Thứ 4',
                    thursday: 'Thứ 5',
                    friday: 'Thứ 6',
                    saturday: 'Thứ 7',
                    sunday: 'Chủ nhật',
                    // Hỗ trợ cho số
                    1: 'Thứ 2',
                    2: 'Thứ 3',
                    3: 'Thứ 4',
                    4: 'Thứ 5',
                    5: 'Thứ 6',
                    6: 'Thứ 7',
                    0: 'Chủ nhật',
                  };
                  
                  return days.map(day => (
                    <Tooltip key={day} title={fullDayMap[day] || `Ngày ${day}`}>
                      <Tag color="purple" style={{ margin: '2px' }}>
                        {dayMap[day] || `${day}`}
                      </Tag>
                    </Tooltip>
                  ));
                };
                
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {formatDays(record.days)}
                  </div>
                );
              }
            },
            {
              title: 'Thời gian',
              key: 'time',
              render: (_, record) => {
                const scheduleType = record.scheduleType || 'unknown';
                const startTime = record.startTime || '00:00';
                const duration = record.duration || 0;
                
                if (scheduleType === 'watering') {
                  let endTime = '00:00';
                  if (startTime && typeof duration === 'number') {
                    try {
                      const [hours, minutes] = startTime.split(':').map(Number);
                      const totalMinutes = hours * 60 + minutes + duration;
                      const endHours = Math.floor(totalMinutes / 60) % 24;
                      const endMinutes = totalMinutes % 60;
                      endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                    } catch (error) {
                      console.error('Lỗi khi tính toán thời gian kết thúc:', error);
                    }
                  }
                  return (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Tag color="processing" icon={<ClockCircleOutlined />}>
                          Bắt đầu: {startTime}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Tag color="default" icon={<ClockCircleOutlined />}>
                          Kết thúc: {endTime}
                        </Tag>
                      </div>
                    </Space>
                  );
                } else if (scheduleType === 'lighting') {
                  return (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Tag color="success" icon={<BulbOutlined />}>
                          Bật: {startTime}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Tag color="error" icon={<CloseOutlined />}>
                          Tắt: {record.endTime || '00:00'}
                        </Tag>
                      </div>
                    </Space>
                  );
                }
                return null;
              }
            },
            {
              title: 'Chi tiết',
              key: 'details',
              render: (_, record) => {
                const scheduleType = record.scheduleType || 'unknown';
                
                if (scheduleType === 'watering') {
                  const speed = record.speed !== undefined ? record.speed : 0;
                  const duration = record.duration || 0;
                  return (
                    <div>
                      <Tag color="cyan">{speed === 0 ? 'Tắt máy bơm' : `Tốc độ: ${speed}%`}</Tag>
                      <div>Thời gian tưới: {duration} phút</div>
                    </div>
                  );
                } else if (scheduleType === 'lighting') {
                  return (
                    <div>
                      <Tag color="yellow">
                        <BulbOutlined /> {record.status === 'On' || record.status === true || record.status === 1 ? 'Đèn bật' : 'Trạng thái tự động'}
                      </Tag>
                      <div>Lịch trình hàng ngày</div>
                    </div>
                  );
                }
                return null;
              }
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'center',
              render: (_, record) => (
                <Tooltip title="Xóa lịch trình">
                  <Button 
                    danger 
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteSchedule(record)}
                  >
                    Xóa
                  </Button>
                </Tooltip>
              )
            }
          ]}
        />
      </Card>

      {/* Phần cấu hình tự động */}
      {selectedDevice && (
        <Card 
          title={`Cấu hình tự động: ${selectedDevice.deviceCode} (${selectedDevice.deviceType === 'pump_water' ? 'Máy bơm' : 'Đèn'})`}
          extra={<Button type="link" onClick={handleCloseConfig}>Đóng</Button>}
          className="mb-6 shadow-md"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg font-semibold">Chế độ điều khiển</div>
              <div className="text-sm text-gray-500">Chọn cách bạn muốn điều khiển thiết bị</div>
            </div>
            <div className="flex items-center">
              <span className="mr-2">Thủ công</span>
              <Switch 
                checked={deviceConfig.autoMode} 
                onChange={handleAutoModeChange}
                className={deviceConfig.autoMode ? "bg-green-500" : ""}
              />
              <span className="ml-2">Tự động</span>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
            <div className="font-medium text-blue-700 mb-1">Chế độ tự động:</div>
            <div className="text-blue-600 text-sm">
              Khi bật chế độ tự động, hệ thống sẽ tự động điều chỉnh máy bơm và đèn dựa trên lịch trình. 
              Bạn có thể thiết lập lịch trình tưới nước và chiếu sáng bên dưới.
            </div>
          </div>

          {/* Hiển thị cấu hình lịch trình dựa vào loại thiết bị */}
          {selectedDevice.deviceType === 'pump_water' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="font-medium text-lg"><ScheduleOutlined /> Lịch trình tưới nước</div>
                  <div className="text-sm text-gray-500">Thiết lập thời gian tưới nước tự động</div>
                </div>
                <Switch 
                  checked={deviceConfig.wateringSchedule.enabled} 
                  onChange={(val) => handleScheduleChange("wateringSchedule", "enabled", val)}
                  className={deviceConfig.wateringSchedule.enabled ? "bg-blue-500" : ""}
                  disabled={!deviceConfig.autoMode}
                />
              </div>
              
              {!deviceConfig.autoMode && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded mb-4">
                  Vui lòng bật chế độ tự động để sử dụng lịch trình.
                </div>
              )}
              
              <Form layout="vertical" disabled={!deviceConfig.autoMode || !deviceConfig.wateringSchedule.enabled}>
                <Form.Item label="Thời gian bắt đầu">
                  <Input 
                    type="time" 
                    value={deviceConfig.wateringSchedule.startTime}
                    onChange={(e) => handleScheduleChange("wateringSchedule", "startTime", e.target.value)}
                  />
                </Form.Item>
                
                <Form.Item label="Thời gian tưới (phút)">
                  <Input 
                    type="number" 
                    min={1} 
                    max={60} 
                    value={deviceConfig.wateringSchedule.duration}
                    onChange={(e) => handleScheduleChange("wateringSchedule", "duration", Number(e.target.value))}
                  />
                </Form.Item>
                
                <Form.Item label="Tốc độ máy bơm">
                  <div className="flex justify-between space-x-4">
                    <button 
                      type="button"
                      className={`flex-1 py-2 px-3 rounded-lg border ${deviceConfig.wateringSchedule.speed === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                      onClick={() => handleScheduleChange("wateringSchedule", "speed", 0)}
                      disabled={!deviceConfig.autoMode || !deviceConfig.wateringSchedule.enabled}
                    >
                      Tắt (0%)
                    </button>
                    <button 
                      type="button"
                      className={`flex-1 py-2 px-3 rounded-lg border ${deviceConfig.wateringSchedule.speed === 50 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                      onClick={() => {
                        // Explicitly use number 50, not string "50"
                        const mediumSpeed = 50;
                        console.log("Medium speed button clicked with exact value:", mediumSpeed);
                        handleScheduleChange("wateringSchedule", "speed", mediumSpeed);
                      }}
                      disabled={!deviceConfig.autoMode || !deviceConfig.wateringSchedule.enabled}
                    >
                      Vừa (50%)
                    </button>
                    <button 
                      type="button"
                      className={`flex-1 py-2 px-3 rounded-lg border ${deviceConfig.wateringSchedule.speed === 100 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                      onClick={() => handleScheduleChange("wateringSchedule", "speed", 100)}
                      disabled={!deviceConfig.autoMode || !deviceConfig.wateringSchedule.enabled}
                    >
                      Cao (100%)
                    </button>
                  </div>
                </Form.Item>
                
                <Form.Item label="Các ngày trong tuần">
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Chọn các ngày"
                    value={deviceConfig.wateringSchedule.days}
                    onChange={(val) => handleScheduleChange("wateringSchedule", "days", val)}
                  >
                    <Option value="monday">Thứ 2</Option>
                    <Option value="tuesday">Thứ 3</Option>
                    <Option value="wednesday">Thứ 4</Option>
                    <Option value="thursday">Thứ 5</Option>
                    <Option value="friday">Thứ 6</Option>
                    <Option value="saturday">Thứ 7</Option>
                    <Option value="sunday">Chủ nhật</Option>
                  </Select>
                </Form.Item>
              </Form>
            </div>
          )}
          
          {selectedDevice.deviceType === 'light' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="font-medium text-lg"><BulbOutlined /> Lịch trình chiếu sáng</div>
                  <div className="text-sm text-gray-500">Thiết lập thời gian bật tắt đèn tự động</div>
                </div>
                <Switch 
                  checked={deviceConfig.lightSchedule.enabled} 
                  onChange={(val) => handleScheduleChange("lightSchedule", "enabled", val)}
                  className={deviceConfig.lightSchedule.enabled ? "bg-yellow-500" : ""}
                  disabled={!deviceConfig.autoMode}
                />
              </div>
              
              {!deviceConfig.autoMode && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded mb-4">
                  Vui lòng bật chế độ tự động để sử dụng lịch trình.
                </div>
              )}
              
              <Form layout="vertical" disabled={!deviceConfig.autoMode || !deviceConfig.lightSchedule.enabled}>
                <Form.Item label="Thời gian bật đèn">
                  <Input 
                    type="time" 
                    value={deviceConfig.lightSchedule.onTime}
                    onChange={(e) => handleScheduleChange("lightSchedule", "onTime", e.target.value)}
                  />
                </Form.Item>
                
                <Form.Item label="Thời gian tắt đèn">
                  <Input 
                    type="time" 
                    value={deviceConfig.lightSchedule.offTime}
                    onChange={(e) => handleScheduleChange("lightSchedule", "offTime", e.target.value)}
                  />
                </Form.Item>
                
                <Form.Item label="Các ngày trong tuần">
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Chọn các ngày"
                    value={deviceConfig.lightSchedule.days}
                    onChange={(val) => handleScheduleChange("lightSchedule", "days", val)}
                  >
                    <Option value="monday">Thứ 2</Option>
                    <Option value="tuesday">Thứ 3</Option>
                    <Option value="wednesday">Thứ 4</Option>
                    <Option value="thursday">Thứ 5</Option>
                    <Option value="friday">Thứ 6</Option>
                    <Option value="saturday">Thứ 7</Option>
                    <Option value="sunday">Chủ nhật</Option>
                  </Select>
                </Form.Item>
              </Form>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              type="primary"
              onClick={handleSaveConfig}
              loading={savingConfig}
            >
              {savingConfig ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ControlDevice; 