import React, { useState, useEffect } from "react";
import SensorServices from "../../services/SensorServices";
import DeviceServices from "../../services/DeviceServices";
import DeviceList from "../../components/DeviceList/DeviceList";
import { useSensorData } from "../../context/SensorContext";
import socketService from '../../services/socketService';
import axios from "axios";
import API_ENDPOINTS from "../../services/ApiEndpoints";

// Icon
import IconIncrease from "../../assets/images/icon-increase.svg";
import Icon3Dots from "../../assets/images/icon-3dots.svg";
import IconChart from "../../assets/images/icon-chart.svg";
import IconDecrease from "../../assets/images/icon-decrease.svg";

// Giá trị ngưỡng mặc định nếu không thể tải từ API
// const DEFAULT_THRESHOLD = {
//   SOIL_MOISTURE: { min: 20, max: 80 },
//   TEMPERATURE: { min: 20, max: 35 },
//   AIR_HUMIDITY: { min: 40, max: 80 },
//   PUMP_SPEED: { min: 0, max: 100 }
// };

const Dashboard = () => {
  // Sử dụng context để lấy dữ liệu sensor thay vì quản lý state riêng
  const {
    sensorData,
    prevData,
    socketConnected,
    calculatePercentChange,
    updateFromAPI,
    forceSaveData,
    clearSavedData,
    updateFromSocketData,
    // Thêm các trạng thái và hàm liên quan đến ngưỡng
    thresholdAlerts,
    thresholdConfig,
    setThresholdConfig,
    updateThresholdConfig,
    checkThresholds
  } = useSensorData();

  // State cho danh sách thiết bị
  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [showDebug, setShowDebug] = useState(true);

  // State lưu trữ ngưỡng từ API
  const [thresholds, setThresholds] = useState({
    SOIL_MOISTURE: { min: 0, max: 100 },  // Khởi tạo với giá trị rộng, sẽ cập nhật từ API
    TEMPERATURE: { min: 0, max: 50 },
    AIR_HUMIDITY: { min: 0, max: 100 },
    PUMP_SPEED: { min: 0, max: 100 },
  });

  // Đăng ký lắng nghe sự kiện cập nhật từ socket
  useEffect(() => {
    const handleSensorUpdate = (data) => {
      console.log('Dashboard: Socket sensor update received:', data);

      // Sử dụng hàm updateFromSocketData mới trong SensorContext
      if (updateFromSocketData) {
        // Định dạng lại dữ liệu cho phù hợp với cấu trúc updateFromSocketData
        const formattedData = {};

        if (data.type === 'temperature_humidity' && data.data) {
          formattedData.temperature = data.data.temperature;
          formattedData.airHumidity = data.data.humidity;
        }
        else if (data.type === 'soil_moisture' && data.data) {
          formattedData.soilMoisture = data.data.soilMoisture;
        }
        else if ((data.type === 'pump_water' || data.type === 'pump_status' || data.type === 'pump-water' || data.type === 'pump-status') && data.data) {
          // Ensure we get both status and speed from the data if available
          const pumpSpeed = data.data.pumpSpeed !== undefined ? data.data.pumpSpeed :
            (data.data.speed !== undefined ? data.data.speed : null);
          let pumpStatus = data.data.status;

          // Make sure we have a valid pumpWater object with both speed and status
          formattedData.pumpWater = {};

          // If speed is available, set it and derive status
          if (pumpSpeed !== null) {
            formattedData.pumpWater.speed = pumpSpeed;
            formattedData.pumpWater.status = pumpSpeed > 0 ? 'On' : 'Off';
          }
          // If only status is available
          else if (pumpStatus) {
            formattedData.pumpWater.status = pumpStatus;
            // If status is On but no speed, default to a reasonable speed
            formattedData.pumpWater.speed = pumpStatus.toLowerCase() === 'on' ? 50 : 0;
          }

          console.log('Dashboard: Formatted pump data for context:', formattedData.pumpWater);
        }
        else if ((data.type === 'light' || data.type === 'light_status' || data.type === 'light-status') && data.data) {
          formattedData.light = {
            status: data.data.status
          };
        }

        // Chỉ cập nhật nếu có dữ liệu hợp lệ
        if (Object.keys(formattedData).length > 0) {
          console.log('Dashboard: Updating sensor context with:', formattedData);
          updateFromSocketData(formattedData);
        }
      } else {
        // Fallback đến việc xử lý dữ liệu thẳng nếu hàm updateFromSocketData không có sẵn
        handleSensorData(data);
      }
    };

    // Đăng ký lắng nghe sự kiện cập nhật cảm biến từ WebSocket
    if (socketService.socket) {
      socketService.socket.on('sensor-update', handleSensorUpdate);
    }

    // Cleanup listener khi component unmount
    return () => {
      if (socketService.socket) {
        socketService.socket.off('sensor-update', handleSensorUpdate);
      }
    };
  }, [updateFromSocketData]);

  // Lấy dữ liệu từ API khi component mount
  useEffect(() => {
    console.log('Dashboard: Component mounted');
    console.log('Dashboard: Initial pump water data:', sensorData.pumpWater);

    // Fetch dữ liệu mới từ API mỗi khi component mount
    const fetchInitialData = async () => {
      try {
        console.log('Dashboard: Fetching fresh sensor data from API on mount');
        // Chỉ lấy dữ liệu từ API nếu chưa có kết nối socket
        if (!socketConnected) {
          console.log('Dashboard: Socket not connected, fetching data from API');
          const data = await updateFromAPI(SensorServices);
          console.log('Dashboard: Data after API fetch:', data);
          console.log('Dashboard: Pump water data after API fetch:', data?.pumpWater);

          // Kiểm tra ngưỡng sau khi lấy dữ liệu cảm biến
          if (checkThresholds) {
            console.log('Dashboard: Kiểm tra ngưỡng sau khi lấy dữ liệu từ API');
            checkThresholds(data);
          }
        } else {
          console.log('Dashboard: Socket connected, skipping initial API fetch');
          // Vẫn lưu dữ liệu hiện tại
          forceSaveData();
          console.log('Dashboard: Current pump water data:', sensorData.pumpWater);
        }
      } catch (error) {
        console.error('Dashboard: Error fetching sensor data:', error);
        // Nếu có lỗi, vẫn sử dụng dữ liệu đã lưu
        console.log('Dashboard: Using existing sensor data due to error');
        forceSaveData();
        console.log('Dashboard: Current pump water data after error:', sensorData.pumpWater);
      }
    };

    // Lấy danh sách thiết bị
    const fetchDevices = async () => {
      try {
        setIsLoadingDevices(true);
        // Lấy thiết bị của người dùng hiện tại
        const result = await DeviceServices.getDevices();
        console.log('Dashboard: User devices:', result);
        setDevices(result);

        setIsLoadingDevices(false);
      } catch (error) {
        console.error("Dashboard: Error fetching devices:", error);
        setIsLoadingDevices(false);
      }
    };

    // Lấy cấu hình ngưỡng
    const fetchThresholds = async () => {
      try {
        // Check if user is approved before attempting to fetch thresholds
        const currentUserData = JSON.parse(localStorage.getItem('userData'));
        if (!currentUserData || !currentUserData.isAccepted) {
          console.log('Dashboard: User not approved yet, skipping threshold config fetch');
          return;
        }

        const response = await axios.get(API_ENDPOINTS.DEVICES.GET_CONFIG('current'), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        
        console.log('Dashboard: Threshold config API response:', response.data);
        
        if (response.data && response.data.success) {
          // Kiểm tra cấu trúc dữ liệu để xử lý phù hợp
          if (response.data.config) {
            const configData = response.data.config;
            
            // Cập nhật state thresholds
            const newThresholds = {
              SOIL_MOISTURE: {
                min: configData.soilMoisture?.min || 0,
                max: configData.soilMoisture?.max || 100
              },
              TEMPERATURE: {
                min: configData.temperature?.min || 0,
                max: configData.temperature?.max || 50
              },
              AIR_HUMIDITY: {
                min: configData.airHumidity?.min || 0,
                max: configData.airHumidity?.max || 100
              },
              PUMP_SPEED: {
                min: 0,
                max: 100
              }
            };

            // Cập nhật cấu hình ngưỡng trong SensorContext
            if (updateThresholdConfig) {
              updateThresholdConfig(newThresholds);
              console.log('Dashboard: Đã cập nhật cấu hình ngưỡng cho SensorContext');
            }

            console.log('Dashboard: Updated thresholds from API:', thresholds);
          } else {
            console.warn('Dashboard: Invalid config data format, using defaults');
          }
        }
      } catch (error) {
        console.error('Dashboard: Error fetching threshold configs:', error);
        console.log('Dashboard: Using default threshold values');
      }
    };

    // Thực hiện fetch dữ liệu
    fetchInitialData();
    fetchDevices();
    fetchThresholds();

    // Thiết lập interval để cập nhật dữ liệu định kỳ nếu không có socket
    const intervalId = !socketConnected ?
      setInterval(() => {
        console.log('Dashboard: Updating sensor data periodically due to no socket connection');
        updateFromAPI(SensorServices);
      }, 30000) : null; // Cập nhật mỗi 30 giây nếu không có socket

    // Force save data khi component unmount
    return () => {
      console.log('Dashboard: Component unmounting, saving data...');
      if (intervalId) clearInterval(intervalId);
      forceSaveData();
    };
  }, [socketConnected]);

  // Lưu dữ liệu vào localStorage khi có thay đổi
  useEffect(() => {
    // Khi dữ liệu sensor thay đổi, lưu vào localStorage
    if (!sensorData.loading) {
      console.log('Dashboard: Sensor data changed, forcing save');
      forceSaveData();
    }
  }, [sensorData]);

  // Thêm useEffect để đồng bộ lại ngưỡng từ API định kỳ
  useEffect(() => {
    // Chỉ refresh cấu hình ngưỡng khi đã lấy được dữ liệu từ API
    if (!sensorData.loading && socketConnected) {
      // Gọi lại fetchThresholds để cập nhật cấu hình mới nhất từ API
      const refreshThresholds = async () => {
        console.log('Dashboard: Refreshing threshold configs');
        try {
          // Check if user is approved before attempting to fetch thresholds
          const currentUserData = JSON.parse(localStorage.getItem('userData'));
          if (!currentUserData || !currentUserData.isAccepted) {
            console.log('Dashboard: User not approved yet, skipping threshold config refresh');
            return;
          }

          const response = await axios.get(API_ENDPOINTS.DEVICES.GET_CONFIG('current'), {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          console.log('Dashboard: Refresh threshold response:', response.data);
          console.log('Dashboard: Cấu trúc phản hồi refresh API:', {
            success: response.data.success,
            has_config: !!response.data.config,
            has_data: !!response.data.data,
            config_structure: response.data.config ? Object.keys(response.data.config) : 'không có config'
          });

          if (response.data && response.data.success && response.data.config) {
            const configData = response.data.config;

            const newThresholds = {
              SOIL_MOISTURE: {
                min: configData.soilMoisture?.min || 0,
                max: configData.soilMoisture?.max || 100
              },
              TEMPERATURE: {
                min: configData.temperature?.min || 0,
                max: configData.temperature?.max || 50
              },
              AIR_HUMIDITY: {
                min: configData.airHumidity?.min || 0,
                max: configData.airHumidity?.max || 100
              },
              PUMP_SPEED: {
                min: 0,
                max: 100
              }
            };

            // Cập nhật state thresholds của Dashboard
            setThresholds(newThresholds);

            // Cập nhật cấu hình ngưỡng trong SensorContext
            if (updateThresholdConfig) {
              updateThresholdConfig(newThresholds);
              console.log('Dashboard: Refreshed thresholds after initial load', newThresholds);
            }
          }
        } catch (error) {
          console.error('Dashboard: Error refreshing threshold configs:', error);
        }
      };

      // Gọi refresh ngưỡng sau khi component đã ổn định
      const timeoutId = setTimeout(refreshThresholds, 2000);

      // Thiết lập interval cho refresh định kỳ
      const intervalId = setInterval(refreshThresholds, 60000); // 60 giây refresh một lần

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }
  }, [sensorData.loading, socketConnected, updateThresholdConfig]);

  // Tính toán phần trăm thay đổi cho từng loại dữ liệu
  const soilMoistureChange = calculatePercentChange(
    sensorData.soilMoisture,
    prevData.soilMoisture
  );

  const temperatureChange = calculatePercentChange(
    sensorData.temperature,
    prevData.temperature
  );

  const airHumidityChange = calculatePercentChange(
    sensorData.airHumidity,
    prevData.airHumidity
  );

  const pumpSpeedChange = calculatePercentChange(
    sensorData.pumpWater?.speed,
    prevData.pumpWater?.speed
  );

  // Xử lý nút xoá dữ liệu
  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá dữ liệu đã lưu? Trang sẽ tải lại sau khi xoá.')) {
      clearSavedData();
      window.location.reload();
    }
  };

  // Kiểm tra xem giá trị có vượt ngưỡng không và trả về class tương ứng
  const getThresholdClass = (value, thresholdMax) => {
    return value > thresholdMax ? 'bg-red-200 border-2 border-red-500' : '';
  };

  // Kiểm tra từng loại dữ liệu với ngưỡng tương ứng
  const soilMoistureThresholdClass = getThresholdClass(sensorData.soilMoisture, thresholds.SOIL_MOISTURE?.max || 100);
  const temperatureThresholdClass = getThresholdClass(sensorData.temperature, thresholds.TEMPERATURE?.max || 50);
  const airHumidityThresholdClass = getThresholdClass(sensorData.airHumidity, thresholds.AIR_HUMIDITY?.max || 100);
  const pumpSpeedThresholdClass = getThresholdClass(sensorData.pumpWater?.speed, thresholds.PUMP_SPEED?.max || 100);

  // Log pump data on component render to help diagnose issues
  console.log('Dashboard Render - Pump Water Data:', sensorData.pumpWater);

  // Log thresholds để gỡ lỗi
  console.log('Dashboard Render - Thresholds Data:', {
    soilMoisture: thresholds.SOIL_MOISTURE,
    temperature: thresholds.TEMPERATURE,
    airHumidity: thresholds.AIR_HUMIDITY,
    pumpSpeed: thresholds.PUMP_SPEED,
    hasAllThresholds: !!(thresholds.SOIL_MOISTURE && thresholds.TEMPERATURE && thresholds.AIR_HUMIDITY && thresholds.PUMP_SPEED)
  });

  return (
    <div className="flex flex-col space-y-6">

      {/* Sensor Data cards - hiển thị cho tất cả người dùng đã đăng nhập */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Soil Moisture  */}
        <div className={`w-full h-[170px] bg-gradient-to-b from-[#0093E9] to-[#80D0C7] rounded relative ${soilMoistureThresholdClass}`}>
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Soil Moisture
                {(thresholdAlerts.soilMoisture?.high || thresholdAlerts.soilMoisture?.low) &&
                  <span className="ml-2 text-red-700 font-bold">⚠️ Quá ngưỡng!</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading ? "Loading..." : `${sensorData.soilMoisture}%`}
            </div>
            <div className="text-white font-roboto text-[14px] font-normal leading-[20px] flex space-x-1">
              <img
                src={soilMoistureChange >= 0 ? IconIncrease : IconDecrease}
                alt="change icon"
                className="w-[20px] h-[20px]"
              />
              <div>{Math.abs(soilMoistureChange)}% vs last reading</div>
            </div>

            <div className="absolute right-2 bottom-6">
              <img src={IconChart} alt="icon chart" />
            </div>
          </div>
        </div>

        {/* Temperature  */}
        <div className={`w-full h-[170px] bg-gradient-to-b from-[#FF55AACD] to-[#FBDA61] rounded relative ${temperatureThresholdClass}`}>
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Temperature
                {(thresholdAlerts.temperature?.high || thresholdAlerts.temperature?.low) &&
                  <span className="ml-2 text-red-700 font-bold">⚠️ Quá ngưỡng!</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading ? "Loading..." : `${sensorData.temperature}°C`}
            </div>
            <div className="text-white font-roboto text-[14px] font-normal leading-[20px] flex space-x-1">
              <img
                src={temperatureChange >= 0 ? IconIncrease : IconDecrease}
                alt="change icon"
                className="w-[20px] h-[20px]"
              />
              <div>{Math.abs(temperatureChange)}% vs last reading</div>
            </div>

            <div className="absolute right-2 bottom-6">
              <img src={IconChart} alt="icon chart" />
            </div>
          </div>
        </div>

        {/* Air Humidity  */}
        <div className={`w-full h-[170px] bg-gradient-to-b from-[#64E39E] to-[#53ECE5] rounded relative ${airHumidityThresholdClass}`}>
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Air Humidity
                {(thresholdAlerts.airHumidity?.high || thresholdAlerts.airHumidity?.low) &&
                  <span className="ml-2 text-red-700 font-bold">⚠️ Quá ngưỡng!</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading ? "Loading..." : `${sensorData.airHumidity}%`}
            </div>
            <div className="text-white font-roboto text-[14px] font-normal leading-[20px] flex space-x-1">
              <img
                src={airHumidityChange >= 0 ? IconIncrease : IconDecrease}
                alt="change icon"
                className="w-[20px] h-[20px]"
              />
              <div>{Math.abs(airHumidityChange)}% vs last reading</div>
            </div>

            <div className="absolute right-2 bottom-6">
              <img src={IconChart} alt="icon chart" />
            </div>
          </div>
        </div>

        {/* Pump Water  */}
        <div className={`w-full h-[170px] bg-gradient-to-b from-[#8E7AFF] to-[#A682FF] rounded relative ${pumpSpeedThresholdClass}`}>
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Pump Water
                {(sensorData.pumpWater?.status === 'On') &&
                  <span className="ml-2 text-yellow-300 font-bold">⚠️ Đang hoạt động</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading
                ? "Loading..."
                : sensorData.pumpWater?.status === 'On'
                  ? `${sensorData.pumpWater.status} (${sensorData.pumpWater.speed}%)`
                  : `Off (0%)`
              }
            </div>
            <div className="text-white font-roboto text-[14px] font-normal leading-[20px] flex space-x-1">
              <img
                src={pumpSpeedChange >= 0 ? IconIncrease : IconDecrease}
                alt="change icon"
                className="w-[20px] h-[20px]"
              />
              <div>{Math.abs(pumpSpeedChange)}% speed vs last reading</div>
            </div>

            <div className="absolute right-2 bottom-6">
              <img src={IconChart} alt="icon chart" />
            </div>
          </div>
        </div>

        {/* Light Device  */}
        <div className="w-full h-[170px] bg-gradient-to-b from-[#FF6B6B] to-[#FF8E53] rounded relative">
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Light
                {(sensorData.light?.status === 'On') &&
                  <span className="ml-2 text-yellow-300 font-bold">⚠️ Đang hoạt động</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading ? "Loading..." : sensorData.light?.status || 'Off'}
            </div>
            <div className="text-white font-roboto text-[14px] font-normal leading-[20px]">
              Status: {sensorData.light?.status || 'Off'}
            </div>
          

            <div className="absolute right-2 bottom-6">
              <img src={IconChart} alt="icon chart" />
            </div>
          </div>
        </div>
      </div>

      {/* Device List section */}
      <div className="mt-8">
        <DeviceList />
      </div>

      {/* Debug section - only show when showDebug is true */}
      {/* {showDebug && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Debug Info</h3>
          <div className="mb-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
            >
              Refresh Page
            </button>
            <button
              onClick={handleClearData}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Clear Saved Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Current Sensor Data:</h4>
              <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify({
                  soilMoisture: sensorData.soilMoisture,
                  temperature: sensorData.temperature,
                  airHumidity: sensorData.airHumidity,
                  pumpWater: sensorData.pumpWater,
                  light: sensorData.light
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">Threshold Alerts (Status):</h4>
              <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40 border-2 border-blue-300">
                {JSON.stringify({
                  ...thresholdAlerts,
                  _explanation: 'HIGH/LOW: TRUE = Đang vượt ngưỡng, FALSE = OK'
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">Thresholds from Dashboard (Config):</h4>
              <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40 border-2 border-green-300">
                {JSON.stringify(thresholds, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">Thresholds in SensorContext:</h4>
              <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40 border-2 border-purple-300">
                {JSON.stringify({
                  ...thresholdConfig,
                  _info: 'Nên giống với Dashboard config nhưng định dạng khác'
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">Connection Status:</h4>
              <p className={socketConnected ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                Socket: {socketConnected ? "Connected ✅" : "Disconnected ❌"}
              </p>
              <button
                onClick={() => checkThresholds && checkThresholds(sensorData)}
                className="bg-gray-500 text-white px-3 py-1 rounded mt-2"
              >
                Force Check Thresholds
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Dashboard;
