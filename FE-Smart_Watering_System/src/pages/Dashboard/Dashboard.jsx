import React, { useState, useEffect } from "react";
import SensorServices from "../../services/SensorServices";
import DeviceServices from "../../services/DeviceServices";
import DeviceList from "../../components/DeviceList/DeviceList";
import { useSensorData } from "../../context/SensorContext";
import socketService from '../../services/socketService';

// Icon
import IconIncrease from "../../assets/images/icon-increase.svg";
import Icon3Dots from "../../assets/images/icon-3dots.svg";
import IconChart from "../../assets/images/icon-chart.svg";
import IconDecrease from "../../assets/images/icon-decrease.svg";

// Ngưỡng tối đa cho mỗi loại sensor
const THRESHOLD = {
  SOIL_MOISTURE: 100, // Độ ẩm đất tối đa (%)
  TEMPERATURE: 40,    // Nhiệt độ tối đa (°C)
  AIR_HUMIDITY: 100,  // Độ ẩm không khí tối đa (%)
  PUMP_SPEED: 100     // Tốc độ máy bơm tối đa (%)
};

const Dashboard = () => {
  // Sử dụng context để lấy dữ liệu sensor thay vì quản lý state riêng
  const { 
    sensorData, 
    prevData, 
    socketConnected, 
    calculatePercentChange,
    updateFromAPI,
    forceSaveData,
    clearSavedData
  } = useSensorData();
  
  // State cho danh sách thiết bị
  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [showDebug, setShowDebug] = useState(true);

  // Đăng ký lắng nghe sự kiện cập nhật từ socket
  useEffect(() => {
    const handleSensorUpdate = (data) => {
      console.log('Dashboard received sensor update:', data);
      // Xử lý cập nhật dữ liệu...
    };

    // Đăng ký lắng nghe cả hai event (sensor-update và sensor_update)
    socketService.on('sensor-update', handleSensorUpdate);
    socketService.on('sensor_update', handleSensorUpdate);

    // Ensure socket is connected
    socketService.getSocket();

    return () => {
      // Hủy đăng ký khi component unmount
      socketService.off('sensor-update', handleSensorUpdate);
      socketService.off('sensor_update', handleSensorUpdate);
    };
  }, []);

  // Lấy dữ liệu từ API khi component mount
  useEffect(() => {
    console.log('Dashboard: Component mounted');
    
    // Fetch dữ liệu mới từ API mỗi khi component mount
    const fetchInitialData = async () => {
      try {
        console.log('Dashboard: Fetching fresh sensor data from API on mount');
        // Luôn cập nhật dữ liệu mới từ API khi vào Dashboard
        await updateFromAPI(SensorServices);
      } catch (error) {
        console.error('Dashboard: Error fetching sensor data:', error);
        // Nếu có lỗi, vẫn sử dụng dữ liệu đã lưu
        console.log('Dashboard: Using existing sensor data due to error');
        forceSaveData();
      }
    };

    // Lấy danh sách thiết bị
    const fetchDevices = async () => {
      try {
        setIsLoadingDevices(true);
        // Lấy thiết bị của người dùng hiện tại
        const result = await DeviceServices.getUserDevices();
        console.log('Dashboard: User devices:', result);
        setDevices(result);
        
        setIsLoadingDevices(false);
      } catch (error) {
        console.error("Dashboard: Error fetching devices:", error);
        setIsLoadingDevices(false);
      }
    };

    // Thực hiện fetch dữ liệu
    fetchInitialData();
    fetchDevices();
    
    // Thiết lập interval để cập nhật dữ liệu định kỳ nếu không có socket
    const intervalId = !socketConnected ? 
      setInterval(() => {
        console.log('Dashboard: Updating sensor data periodically');
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
    sensorData.pumpWater?.speed || 0,
    prevData.pumpWater?.speed || 0
  );

  // Xử lý nút xoá dữ liệu
  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá dữ liệu đã lưu? Trang sẽ tải lại sau khi xoá.')) {
      clearSavedData();
      window.location.reload();
    }
  };

  // Kiểm tra xem giá trị có vượt ngưỡng không và trả về class tương ứng
  const getThresholdClass = (value, threshold) => {
    return value > threshold ? 'bg-red-200 border-2 border-red-500' : '';
  };

  // Kiểm tra từng loại dữ liệu
  const soilMoistureThresholdClass = getThresholdClass(sensorData.soilMoisture, THRESHOLD.SOIL_MOISTURE);
  const temperatureThresholdClass = getThresholdClass(sensorData.temperature, THRESHOLD.TEMPERATURE);
  const airHumidityThresholdClass = getThresholdClass(sensorData.airHumidity, THRESHOLD.AIR_HUMIDITY);
  const pumpSpeedThresholdClass = getThresholdClass(sensorData.pumpWater?.speed || 0, THRESHOLD.PUMP_SPEED);

  return (
    <div className="flex flex-col space-y-6">
      {/* Socket connection status */}
      {/* <div className={`p-2 text-xs rounded ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        <span className="font-medium">WebSocket:</span> {socketConnected ? 'Connected' : 'Disconnected'} 
        {!socketConnected && ' - Using periodic updates'}
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="ml-2 px-2 bg-blue-500 text-white rounded text-xs"
        >
          {showDebug ? 'Ẩn' : 'Hiện'} Debug
        </button>
      </div> */}
      
      {/* Debug info */}
      {/* {showDebug && (
        <div className="text-xs bg-blue-50 p-2 rounded mb-2">
          <div>Soil: {sensorData.soilMoisture}%, Temp: {sensorData.temperature}°C, Humidity: {sensorData.airHumidity}%</div>
          <div>Pump: {sensorData.pumpWater?.status} ({sensorData.pumpWater?.speed}%)</div>
          <div>State: {sensorData.loading ? 'Loading' : 'Loaded'}</div>
          <div className="flex space-x-2 mt-1">
            <button 
              onClick={forceSaveData}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              Lưu Dữ Liệu
            </button>
            <button 
              onClick={handleClearData}
              className="px-2 py-1 bg-red-500 text-white rounded"
            >
              Xoá Dữ Liệu
            </button>
          </div>
          <div className="mt-1">
            <span className="font-semibold">Ngưỡng tối đa:</span> Đất: {THRESHOLD.SOIL_MOISTURE}%, 
            Nhiệt độ: {THRESHOLD.TEMPERATURE}°C, 
            Độ ẩm: {THRESHOLD.AIR_HUMIDITY}%, 
            Bơm: {THRESHOLD.PUMP_SPEED}%
          </div>
        </div>
      )} */}
      
      {/* Sensor Data cards - hiển thị cho tất cả người dùng đã đăng nhập */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Soil Moisture  */}
        <div className={`w-full h-[170px] bg-gradient-to-b from-[#0093E9] to-[#80D0C7] rounded relative ${soilMoistureThresholdClass}`}>
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>
                Soil Moisture
                {sensorData.soilMoisture > THRESHOLD.SOIL_MOISTURE && 
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
                {sensorData.temperature > THRESHOLD.TEMPERATURE && 
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
                {sensorData.airHumidity > THRESHOLD.AIR_HUMIDITY && 
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
                {(sensorData.pumpWater?.speed || 0) > THRESHOLD.PUMP_SPEED && 
                  <span className="ml-2 text-red-700 font-bold">⚠️ Quá ngưỡng!</span>
                }
              </div>
              <button className="w-[20px] h-[20px]">
                <img src={Icon3Dots} alt="icon 3 dots" />
              </button>
            </div>
            <div className="font-roboto text-[28px] font-bold text-white leading-[42px] my-[8px]">
              {sensorData.loading 
                ? "Loading..." 
                : `${sensorData.pumpWater?.status || 'Inactive'} (${sensorData.pumpWater?.speed || 0}%)`}
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
    </div>
  );
};

export default Dashboard;
