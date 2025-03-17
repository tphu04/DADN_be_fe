import React, { useState, useEffect } from "react";
import SensorServices from "../../services/SensorServices";
import DeviceServices from "../../services/DeviceServices";
import DeviceList from "../../components/DeviceList/DeviceList";

// Icon
import IconIncrease from "../../assets/images/icon-increase.svg";
import Icon3Dots from "../../assets/images/icon-3dots.svg";
import IconChart from "../../assets/images/icon-chart.svg";
import IconDecrease from "../../assets/images/icon-decrease.svg";

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    soilMoisture: 0,
    temperature: 0,
    airHumidity: 0,
    loading: true,
    error: null
  });

  const [prevData, setPrevData] = useState({
    soilMoisture: 0,
    temperature: 0,
    airHumidity: 0
  });

  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Hàm tính phần trăm thay đổi
  const calculatePercentChange = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Lấy dữ liệu cảm biến từ API
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const result = await SensorServices.getLatestSensorData();
        
        // Nếu có dữ liệu
        if (result.success && result.data.length > 0) {
          // Lưu dữ liệu trước đó
          setPrevData({
            soilMoisture: sensorData.soilMoisture || 0,
            temperature: sensorData.temperature || 0,
            airHumidity: sensorData.airHumidity || 0
          });
          
          // Khởi tạo giá trị mặc định
          let newSensorData = {
            soilMoisture: 0,
            temperature: 0,
            airHumidity: 0,
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
            }
          }
          
          setSensorData(newSensorData);
        }
      } catch (error) {
        setSensorData({
          ...sensorData,
          loading: false,
          error: "Failed to fetch sensor data"
        });
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

    // Gọi hàm lấy dữ liệu
    fetchSensorData();
    fetchDevices();

    // Thiết lập interval để cập nhật dữ liệu mỗi 30 giây
    const interval = setInterval(fetchSensorData, 30000);

    // Xóa interval khi component unmount
    return () => clearInterval(interval);
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

  return (
    <div className="flex flex-col space-y-6">
      {/* Sensor Data cards */}
      <div className="flex space-x-[20px]">
        {/* Soil Moisture  */}
        <div className="w-[344px] h-[170px] bg-gradient-to-b from-[#0093E9] to-[#80D0C7] rounded relative">
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
        <div className="w-[344px] h-[170px] bg-gradient-to-b from-[#FF55AACD] to-[#FBDA61] rounded relative">
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
        <div className="w-[344px] h-[170px] bg-gradient-to-b from-[#64E39E] to-[#53ECE5] rounded relative">
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
      </div>

      {/* Device List section */}
      <div className="mt-8">
        <DeviceList />
      </div>
    </div>
  );
};

export default Dashboard;
