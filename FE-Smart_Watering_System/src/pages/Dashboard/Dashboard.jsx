import React, { useState, useEffect } from "react";
import SensorServices from "../../services/SensorServices";
import DeviceServices from "../../services/DeviceServices";
import socketService from "../../services/socketService";
import DeviceList from "../../components/DeviceList/DeviceList";

// Icon
import IconIncrease from "../../assets/images/icon-increase.svg";
import Icon3Dots from "../../assets/images/icon-3dots.svg";
import IconChart from "../../assets/images/icon-chart.svg";
import IconDecrease from "../../assets/images/icon-decrease.svg";

const SENSOR_DATA_KEY = 'smart_watering_sensor_data';
const PREV_DATA_KEY = 'smart_watering_prev_data';

// Lấy dữ liệu cảm biến đã lưu từ localStorage
const getSavedSensorData = () => {
  try {
    const savedData = localStorage.getItem(SENSOR_DATA_KEY);
    console.log('Trying to load saved data:', savedData);
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('Successfully loaded saved sensor data:', parsedData);
      
      // Kiểm tra xem dữ liệu có hợp lệ không
      if (parsedData && typeof parsedData === 'object' && 'soilMoisture' in parsedData) {
        return {
          ...parsedData,
          loading: false
        };
      }
    }
  } catch (e) {
    console.error('Error loading saved sensor data:', e);
  }
  
  console.log('Using default sensor data');
  // Trả về giá trị mặc định nếu không có dữ liệu lưu trữ
  return {
    soilMoisture: 0,
    temperature: 0,
    airHumidity: 0,
    pumpWater: {
      status: 'Inactive',
      speed: 0
    },
    loading: true,
    error: null
  };
};

// Lấy dữ liệu cảm biến trước đó từ localStorage
const getSavedPrevData = () => {
  try {
    const savedData = localStorage.getItem(PREV_DATA_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('Successfully loaded previous sensor data:', parsedData);
      
      // Kiểm tra xem dữ liệu có hợp lệ không
      if (parsedData && typeof parsedData === 'object' && 'soilMoisture' in parsedData) {
        return parsedData;
      }
    }
  } catch (e) {
    console.error('Error loading saved previous data:', e);
  }
  
  console.log('Using default previous data');
  // Trả về giá trị mặc định nếu không có dữ liệu lưu trữ
  return {
    soilMoisture: 0,
    temperature: 0,
    airHumidity: 0,
    pumpWater: {
      speed: 0
    }
  };
};

// Kiểm tra khả năng sử dụng localStorage
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test_key__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage not available:', e);
    return false;
  }
};

const Dashboard = () => {
  // Khởi tạo state với dữ liệu từ localStorage
  const [sensorData, setSensorData] = useState(getSavedSensorData());
  const [prevData, setPrevData] = useState(getSavedPrevData());
  const [storageAvailable, setStorageAvailable] = useState(true);

  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Kiểm tra localStorage
  useEffect(() => {
    setStorageAvailable(isLocalStorageAvailable());
  }, []);

  // Lưu dữ liệu cảm biến vào localStorage khi có thay đổi
  useEffect(() => {
    if (!storageAvailable) return;
    
    // Chỉ lưu khi đã tải xong dữ liệu và không có lỗi
    if (!sensorData.loading && !sensorData.error) {
      try {
        const dataToSave = {
          soilMoisture: sensorData.soilMoisture,
          temperature: sensorData.temperature,
          airHumidity: sensorData.airHumidity,
          pumpWater: sensorData.pumpWater,
          loading: false,
          error: null
        };
        
        localStorage.setItem(SENSOR_DATA_KEY, JSON.stringify(dataToSave));
        console.log('Saved sensor data to localStorage:', dataToSave);
      } catch (e) {
        console.error('Error saving sensor data to localStorage:', e);
      }
    }
  }, [sensorData, storageAvailable]);

  // Lưu dữ liệu trước đó vào localStorage
  useEffect(() => {
    if (!storageAvailable) return;
    
    try {
      localStorage.setItem(PREV_DATA_KEY, JSON.stringify(prevData));
      console.log('Saved previous sensor data to localStorage');
    } catch (e) {
      console.error('Error saving previous data to localStorage:', e);
    }
  }, [prevData, storageAvailable]);

  // Hàm tính phần trăm thay đổi
  const calculatePercentChange = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Xử lý dữ liệu từ WebSocket
  const handleSensorUpdate = (data) => {
    console.log('Received sensor update:', data);
    
    // Lưu dữ liệu cũ trước khi cập nhật
    setPrevData({
      soilMoisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      pumpWater: {
        speed: sensorData.pumpWater.speed
      }
    });

    // Cập nhật dữ liệu mới dựa trên loại cảm biến
    if (data.type === 'temperature_humidity') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          temperature: data.data.temperature || prev.temperature,
          airHumidity: data.data.humidity || prev.airHumidity,
          loading: false
        };
        return updated;
      });
    } 
    else if (data.type === 'soil_moisture') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          soilMoisture: data.data.soilMoisture || prev.soilMoisture,
          loading: false
        };
        return updated;
      });
    }
    else if (data.type === 'pump_water') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          pumpWater: {
            ...prev.pumpWater,
            status: data.data.status || prev.pumpWater.status,
            speed: data.data.pumpSpeed || prev.pumpWater.speed
          },
          loading: false
        };
        return updated;
      });
    }
  };

  // Lấy dữ liệu cảm biến từ API
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        console.log('Fetching sensor data from API...');
        const result = await SensorServices.getLatestSensorData();
        console.log('API result:', result);
        
        // Nếu có dữ liệu
        if (result.success && result.data.length > 0) {
          // Lưu dữ liệu trước đó
          setPrevData({
            soilMoisture: sensorData.soilMoisture || 0,
            temperature: sensorData.temperature || 0,
            airHumidity: sensorData.airHumidity || 0,
            pumpWater: {
              speed: sensorData.pumpWater?.speed || 0
            }
          });
          
          // Khởi tạo giá trị mặc định
          let newSensorData = {
            soilMoisture: 0,
            temperature: 0,
            airHumidity: 0,
            pumpWater: {
              status: 'Inactive',
              speed: 0
            },
            loading: false,
            error: null
          };
          
          // Xử lý từng loại cảm biến
          for (const sensor of result.data) {
            if (sensor.deviceType === 'soil_moisture' && 'soilMoisture' in sensor) {
              newSensorData.soilMoisture = sensor.soilMoisture;
            } else if (sensor.deviceType === 'temperature_humidity') {
              if ('temperature' in sensor) {
                newSensorData.temperature = sensor.temperature;
              }
              if ('airHumidity' in sensor) {
                newSensorData.airHumidity = sensor.airHumidity;
              }
            } else if (sensor.deviceType === 'pump_water') {
              if ('status' in sensor) {
                newSensorData.pumpWater.status = sensor.status;
              }
              if ('pumpSpeed' in sensor) {
                newSensorData.pumpWater.speed = sensor.pumpSpeed;
              }
            }
          }
          
          console.log('Updating state with new sensor data:', newSensorData);
          setSensorData(newSensorData);
          
          // Lưu ngay lập tức vào localStorage
          if (storageAvailable) {
            localStorage.setItem(SENSOR_DATA_KEY, JSON.stringify(newSensorData));
            console.log('Immediately saved new sensor data to localStorage');
          }
        }
      } catch (error) {
        setSensorData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch sensor data"
        }));
        console.error("Error fetching sensor data:", error);
      }
    };

    // Lấy danh sách thiết bị
    const fetchDevices = async () => {
      try {
        setIsLoadingDevices(true);
        const result = await DeviceServices.getAllDevices();
        setDevices(result);
        setIsLoadingDevices(false);
      } catch (error) {
        console.error("Error fetching devices:", error);
        setIsLoadingDevices(false);
      }
    };

    // Kết nối WebSocket
    try {
      socketService.connect();
      
      // Kiểm tra trạng thái kết nối
      const checkSocketConnection = setInterval(() => {
        const connected = socketService.isSocketConnected();
        setSocketConnected(connected);
        console.log('Socket connected:', connected);
      }, 5000);
      
      // Đăng ký lắng nghe sự kiện cập nhật từ server
      socketService.on('sensor-update', handleSensorUpdate);
      
      // Lắng nghe sự kiện chào mừng từ server
      socketService.getSocket().on('welcome', (data) => {
        console.log('Welcome message:', data);
      });

      // Lấy dữ liệu ban đầu và danh sách thiết bị
      // Chỉ fetch dữ liệu mới nếu không có dữ liệu trong localStorage hoặc đang loading
      if (sensorData.loading) {
        fetchSensorData();
      } else {
        console.log('Using cached sensor data from localStorage:', sensorData);
      }
      fetchDevices();

      // Cleanup khi component unmount
      return () => {
        clearInterval(checkSocketConnection);
        socketService.off('sensor-update', handleSensorUpdate);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      
      // Nếu không kết nối được WebSocket, vẫn lấy dữ liệu từ API theo định kỳ
      if (sensorData.loading) {
        fetchSensorData();
      }
      fetchDevices();
      
      // Thiết lập interval để cập nhật dữ liệu mỗi 30 giây
      const interval = setInterval(fetchSensorData, 30000);
      
      // Xóa interval khi component unmount
      return () => clearInterval(interval);
    }
  }, []);

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

  return (
    <div className="flex flex-col space-y-6">
      {/* Socket connection status */}
      {/* <div className={`p-2 text-sm rounded ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        <span className="font-medium">WebSocket:</span> {socketConnected ? 'Connected' : 'Disconnected'} 
        {!socketConnected && ' - Using periodic updates'}
      </div> */}
      
      {/* Sensor Data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Soil Moisture  */}
        <div className="w-full h-[170px] bg-gradient-to-b from-[#0093E9] to-[#80D0C7] rounded relative">
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>Soil Moisture</div>
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
        <div className="w-full h-[170px] bg-gradient-to-b from-[#FF55AACD] to-[#FBDA61] rounded relative">
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>Temperature</div>
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
        <div className="w-full h-[170px] bg-gradient-to-b from-[#64E39E] to-[#53ECE5] rounded relative">
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>Air Humidity</div>
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
        <div className="w-full h-[170px] bg-gradient-to-b from-[#8E7AFF] to-[#A682FF] rounded relative">
          <div className="p-[12px]">
            <div className="font-poppins text-[14px] font-semibold flex justify-between items-center">
              <div>Pump Water</div>
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
      </div>

      {/* Device List section */}
      <div className="mt-8">
        <DeviceList />
      </div>
    </div>
  );
};

export default Dashboard;
