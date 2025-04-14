import { useState, useEffect } from "react";
import { message, Typography } from "antd"; // Import Typography
import { SaveOutlined } from "@ant-design/icons";

// Component
import SliderCard from "../../components/SliderCard/SliderCard";
import ToggleCard from "../../components/ToggleCard/ToggleCard";
import './DeviceSetting.css'; 

const { Title, Paragraph } = Typography; 

const DeviceSetting = () => {
  const [configs, setConfigs] = useState({
    soilMoisture: { min: 0, max: 100 },
    temperature: { min: 0, max: 100 },
    airHumidity: { min: 0, max: 100 },
    pumpWaterSpeed: 50,
    light: true,
  });

  const handleRangeChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSingleValueChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = () => {
    console.log("Saved configs:", configs);
    message.success("Device settings saved successfully!");
  };
  const [animationKey, setAnimationKey] = useState(0);

  return (
    // Container chính với nền màu xám nhạt
    <div className="devicesetting-page-container">

      {/* Phần Header giống trang Notification */}
      <div className="devicesetting-header">
         <img
            src="../src/assets/images/Bg-device.jpg" 
            alt="Device Setting background"
            className="devicesetting-header-bg"
         />
         <div className="devicesetting-header-content">
            {/* Sử dụng Title và Paragraph của Ant Design */}
            <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
                Device Settings
            </Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 600 }}>
                Customize your device settings for optimal performance and personalized experience.
            </Paragraph>
         </div>
      </div>

      {/* Phần thân nội dung */}
      <div className="devicesetting-body-content">
        <div className="title-container">
            <Title level={3} className="typewriter-gradient-title"> Customize Your Device Settings </Title>
        </div>

        {/* Grid chứa các card cài đặt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SliderCard
                title="Soil Moisture Threshold"
                unit="%"
                maxLimit={100}
                value={configs.soilMoisture}
                onChange={(val) => handleRangeChange("soilMoisture", val)}
                marks={{ 0: "0%", 100: "100%" }}
                step={1}
            />
            <SliderCard
                title="Temperature Threshold"
                unit="°C"
                maxLimit={100}
                value={configs.temperature}
                onChange={(val) => handleRangeChange("temperature", val)}
                marks={{ 0: "0°", 100: "100°" }}
                step={1}
            />
            <SliderCard
                title="Air Humidity Threshold"
                unit="%"
                maxLimit={100}
                value={configs.airHumidity}
                onChange={(val) => handleRangeChange("airHumidity", val)}
                marks={{ 0: "0%", 100: "100%" }}
                step={1}
            />
            <SliderCard
                title="Pump Water Speed"
                unit="%"
                maxLimit={100}
                value={configs.pumpWaterSpeed}
                onChange={(val) => handleSingleValueChange("pumpWaterSpeed", val)}
                isSingleValue={true}
                hideInput={false}
                marks={{ 0: "Off", 50: "Normal", 100: "Max" }}
                step={50}
            />
            <ToggleCard
                toggles={[
                    {
                        title: "Light Control",
                        value: configs.light,
                        onChange: (val) => handleToggleChange("light", val),
                    },
                    {
                        title: "Pump Water Control",
                        value: configs.pumpWaterSpeed > 0,
                        onChange: (val) => handleSingleValueChange("pumpWaterSpeed", val ? 50 : 0),
                    },
                ]}
            />
        </div>
        {/* Nút Lưu */}
        <div className="mt-10 flex justify-center md:justify-end">
            <button
                onClick={handleSaveAll}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition duration-300 ease-in-out"
            >
                <SaveOutlined />
                Save All Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceSetting;