import { useState, useEffect, useRef } from "react";
import { Card, Switch, Slider, Table, Tag, Button, Space, Collapse, Form, Input, Select, TimePicker, Checkbox, Tooltip, Modal, Spin } from "antd";
import { WifiOutlined, ReloadOutlined, SettingOutlined, InfoCircleOutlined, ScheduleOutlined, BulbOutlined, ClockCircleOutlined, CloseOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../../services/ApiEndpoints";
import { toast } from "react-toastify";

const { Panel } = Collapse;
const { Option } = Select;

const ControlDevice = () => {
  const [deviceList, setDeviceList] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const navigate = useNavigate();

  useEffect(() => {
    fetchDeviceList();
  }, []);

  const fetchDeviceList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.DEVICES.GET_ALL, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data && response.data.success) {
        // Lọc chỉ thiết bị máy bơm và đèn
        const filteredDevices = response.data.data.filter(device => 
          device.deviceType === 'pump_water' || device.deviceType === 'light'
        );
        
        setDeviceList(filteredDevices);
        
        // Lấy dữ liệu mới nhất cho các thiết bị máy bơm trước khi khởi tạo trạng thái
        const deviceDataPromises = filteredDevices.map(async (device) => {
          if (device.deviceType === 'pump_water') {
            try {
              // Lấy dữ liệu máy bơm mới nhất
              const pumpDataResponse = await axios.get(API_ENDPOINTS.DEVICES.GET_PUMP_WATER(device.id), {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
              });
              
              if (pumpDataResponse.data && pumpDataResponse.data.success) {
                const pumpData = pumpDataResponse.data.data;
                if (pumpData && pumpData.length > 0) {
                  const latestPumpData = pumpData[0]; // Lấy bản ghi mới nhất
                  console.log(`📊 Dữ liệu máy bơm mới nhất:`, latestPumpData);
                  
                  // Kiểm tra các trường khác nhau của dữ liệu máy bơm
                  if (latestPumpData.pumpSpeed !== undefined && latestPumpData.pumpSpeed !== null) {
                    device.lastValue = parseInt(latestPumpData.pumpSpeed);
                    console.log(`📊 Tốc độ máy bơm từ API (pumpSpeed): ${device.lastValue}%`);
                  } else if (latestPumpData.speed !== undefined && latestPumpData.speed !== null) {
                    device.lastValue = parseInt(latestPumpData.speed);
                    console.log(`📊 Tốc độ máy bơm từ API (speed): ${device.lastValue}%`);
                  }
                  
                  // Cập nhật trạng thái
                  if (latestPumpData.status) {
                    device.status = latestPumpData.status;
                  }
                  
                  // Nếu tốc độ > 0, đảm bảo trạng thái là 'On'
                  if (device.lastValue > 0) {
                    device.status = 'On';
                  }
                  
                  console.log(`🚰 Cập nhật tốc độ máy bơm (ID: ${device.id}): ${device.lastValue}%, Trạng thái: ${device.status}`);
                } else {
                  console.log(`⚠️ Không có dữ liệu máy bơm cho thiết bị (ID: ${device.id})`);
                }
              }
            } catch (error) {
              console.error(`Lỗi khi lấy dữ liệu máy bơm (ID: ${device.id}):`, error);
            }
          }
          return device;
        });
        
        // Chờ tất cả các promise hoàn thành
        await Promise.all(deviceDataPromises);
        
        // Khởi tạo trạng thái điều khiển cho tất cả thiết bị với dữ liệu đã cập nhật
        const initialControlStates = {};
        filteredDevices.forEach(device => {
          let pumpSpeed = 0;
          
          if (device.deviceType === 'pump_water') {
            // Xử lý tốc độ máy bơm
            if (device.lastValue !== undefined && device.lastValue !== null) {
              pumpSpeed = parseInt(device.lastValue);
              console.log(`🚰 Tốc độ máy bơm trước khi chuẩn hóa: ${pumpSpeed}%`);
              
              // Đảm bảo tốc độ là một trong các giá trị hợp lệ: 0, 50, 100
              if (pumpSpeed > 0 && pumpSpeed < 50) pumpSpeed = 50;
              else if (pumpSpeed > 50 && pumpSpeed < 100) pumpSpeed = 100;
              else if (pumpSpeed > 100) pumpSpeed = 100;
            } else {
              // Nếu không có giá trị lastValue, kiểm tra trạng thái
              if (device.status === 'On') {
                // Nếu thiết bị đang bật nhưng không có tốc độ, đặt mặc định là 100
                pumpSpeed = 100;
                console.log(`🚰 Không có tốc độ máy bơm, nhưng trạng thái là On, đặt mặc định: ${pumpSpeed}%`);
              }
            }
            
            // Trạng thái bật/tắt dựa trên tốc độ hoặc trạng thái
            const isPumpOn = pumpSpeed > 0 || device.status === 'On';
            
            // Đảm bảo nếu máy bơm đang bật, tốc độ phải > 0
            const finalSpeed = isPumpOn ? (pumpSpeed > 0 ? pumpSpeed : 100) : 0;
            
            initialControlStates[device.id] = {
              pumpWaterOn: isPumpOn,
              pumpWaterSpeed: finalSpeed,
              light: undefined
            };
            
            console.log(`🚰 Khởi tạo máy bơm (ID: ${device.id}): ${isPumpOn ? 'BẬT' : 'TẮT'}, Tốc độ cuối cùng: ${finalSpeed}%`);
          } else if (device.deviceType === 'light') {
            // Xử lý đèn
            initialControlStates[device.id] = {
              light: device.status === 'On',
              pumpWaterOn: undefined,
              pumpWaterSpeed: undefined
            };
            
            console.log(`💡 Khởi tạo đèn (ID: ${device.id}): ${device.status === 'On' ? 'BẬT' : 'TẮT'}`);
          }
        });
        
        setControlStates(initialControlStates);
        console.log('Khởi tạo trạng thái thiết bị:', initialControlStates);
        
        // Lấy trạng thái chi tiết cho mỗi thiết bị
        for (const device of filteredDevices) {
          // Lấy cấu hình chi tiết cho tất cả thiết bị
          fetchDeviceStatus(device.id);
        }
      } else {
        throw new Error(response.data?.message || "Không thể tải danh sách thiết bị");
      }
    } catch (error) {
      console.error("Error fetching device list:", error);
      toast.error("Không thể tải danh sách thiết bị: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceStatus = async (deviceId) => {
    try {
      // Check if GET_STATUS function exists and is a function
      if (typeof API_ENDPOINTS.DEVICES.GET_STATUS !== 'function') {
        console.warn("API_ENDPOINTS.DEVICES.GET_STATUS não está definida ou não é uma função. Usando GET_BY_ID como fallback.");
        // Use GET_BY_ID as fallback
        const response = await axios.get(
          API_ENDPOINTS.DEVICES.GET_BY_ID(deviceId),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          const deviceData = response.data.data;
          
          // Update control states based on the device data
          setControlStates(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              pumpWaterOn: deviceData.status === 'On',
              pumpWaterSpeed: deviceData.lastValue ? parseInt(deviceData.lastValue) : 0,
              light: deviceData.status === 'On',
            }
          }));
        }
      } else {
        // GET_STATUS is available, use it
        const response = await axios.get(
          API_ENDPOINTS.DEVICES.GET_STATUS(deviceId),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          const deviceStatus = response.data.data;
          
          // Update control states based on the device status
          setControlStates(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              pumpWaterOn: deviceStatus.status === 'On',
              pumpWaterSpeed: deviceStatus.speed || 0,
              light: deviceStatus.status === 'On',
            }
          }));
          
          // Update device config if available
          if (deviceStatus.config) {
            setDeviceConfig(deviceStatus.config);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching device status for device ${deviceId}:`, error);
      // Don't show toast to avoid annoying the user with many errors
      // Try fallback for basic information
      try {
        const basicResponse = await axios.get(
          API_ENDPOINTS.DEVICES.GET_BY_ID(deviceId),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        if (basicResponse.data && basicResponse.data.success) {
          const deviceData = basicResponse.data.data;
          // Update with basic information
          setControlStates(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              pumpWaterOn: deviceData.status === 'On',
              pumpWaterSpeed: deviceData.lastValue ? parseInt(deviceData.lastValue) : 0,
              light: deviceData.status === 'On',
            }
          }));
        }
      } catch (fallbackError) {
        console.error(`Fallback also failed for device ${deviceId}:`, fallbackError);
      }
      
      // Set default config if error occurs
      if (selectedDevice && selectedDevice.id === deviceId) {
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
      }
    }
  };

  const handlePumpSpeedChange = async (value, deviceId) => {
    // Update local state
    setControlStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        pumpWaterSpeed: value,
        pumpWaterOn: value > 0
      }
    }));
    
    try {
      // Send command to the device
      await sendDeviceCommand(deviceId, 'pumpWater', {
        status: value > 0 ? 'On' : 'Off',
        speed: value
      });
      
      // Show appropriate success message
      if (value === 0) {
        toast.success('Đã tắt máy bơm');
      } else {
        toast.success(`Tốc độ máy bơm đã được đặt: ${value}%`);
      }
    } catch (error) {
      // Show error message
      if (value === 0) {
        toast.error("Không thể tắt máy bơm: " + error.message);
      } else {
        toast.error("Không thể điều chỉnh tốc độ máy bơm: " + error.message);
      }
      
      // Revert to previous state on error
      setControlStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          pumpWaterSpeed: prev[deviceId]?.pumpWaterSpeed || 0,
          pumpWaterOn: prev[deviceId]?.pumpWaterOn || false
        }
      }));
    }
  };

  const handleToggleLight = async (checked, deviceId) => {
    setControlStates(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        light: checked
      }
    }));
    
    try {
      await sendDeviceCommand(deviceId, 'light', {
        status: checked ? 'On' : 'Off'
      });
      toast.success(`Đèn đã ${checked ? 'bật' : 'tắt'}`);
    } catch (error) {
      toast.error(`Không thể ${checked ? 'bật' : 'tắt'} đèn: ` + error.message);
      // Revert state if failed
      setControlStates(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          light: !checked
        }
      }));
    }
  };

  const sendDeviceCommand = async (deviceId, type, data) => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.DEVICES.CONTROL(deviceId),
        {
          type,
          ...data
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || "Lỗi khi gửi lệnh điều khiển");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error sending device command:", error);
      throw new Error(error.response?.data?.message || error.message);
    }
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
    
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Tốc độ máy bơm</span>
          {controlStates[device.id]?.pumpWaterSpeed > 0 && (
            <span className="text-sm text-blue-500 font-medium">{controlStates[device.id]?.pumpWaterSpeed}%</span>
          )}
        </div>
        
        {device.isOnline && !isInAutoMode ? (
          <div className="flex justify-between space-x-4">
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border ${controlStates[device.id]?.pumpWaterSpeed === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => handlePumpSpeedChange(0, device.id)}
              disabled={isInAutoMode}
            >
              Tắt (0%)
            </button>
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border ${controlStates[device.id]?.pumpWaterSpeed === 50 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => handlePumpSpeedChange(50, device.id)}
              disabled={isInAutoMode}
            >
              Vừa (50%)
            </button>
            <button 
              className={`flex-1 py-2 px-3 rounded-lg border ${controlStates[device.id]?.pumpWaterSpeed === 100 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => handlePumpSpeedChange(100, device.id)}
              disabled={isInAutoMode}
            >
              Cao (100%)
            </button>
          </div>
        ) : null}
        
        {isInAutoMode && (
          <div className="text-yellow-600 text-xs bg-yellow-50 p-2 rounded">
            Đang ở chế độ tự động. Hãy tắt chế độ tự động để điều khiển thủ công.
          </div>
        )}
        
        {!device.isOnline && (
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
    
    return (
      <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center">
          <span className="font-medium">Đèn chiếu sáng</span>
          <Switch
            checked={controlStates[device.id]?.light}
            onChange={(checked) => handleToggleLight(checked, device.id)}
            className={controlStates[device.id]?.light ? "bg-yellow-500" : ""}
            disabled={!device.isOnline || isInAutoMode}
          />
        </div>
        
        {device.isOnline && !isInAutoMode && (
          <div className="mt-2 text-center">
            <div className={`text-sm ${controlStates[device.id]?.light ? 'text-yellow-500' : 'text-gray-400'}`}>
              {controlStates[device.id]?.light ? '☀️ Đèn đang bật' : '🌙 Đèn đang tắt'}
            </div>
          </div>
        )}
        
        {isInAutoMode && (
          <div className="text-yellow-600 text-xs bg-yellow-50 p-2 mt-2 rounded">
            Đang ở chế độ lịch trình tự động. Hãy tắt lịch trình để điều khiển thủ công.
          </div>
        )}
        
        {!device.isOnline && (
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
      title: 'Trạng thái',
      key: 'isOnline',
      dataIndex: 'isOnline',
      render: (isOnline) => (
        <Tag color={isOnline ? 'success' : 'error'}>
          {isOnline ? 'Online' : 'Offline'}
        </Tag>
      ),
      filters: [
        { text: 'Online', value: true },
        { text: 'Offline', value: false }
      ],
      onFilter: (value, record) => record.isOnline === value,
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
            Làm mới
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
                      onClick={() => handleScheduleChange("wateringSchedule", "speed", 50)}
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