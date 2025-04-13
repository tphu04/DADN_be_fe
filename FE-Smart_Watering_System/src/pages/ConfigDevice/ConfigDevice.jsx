import { useState, useEffect } from "react";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

// Component
import SliderCard from "../../components/SliderCard/SliderCard";
import ToggleCard from "../../components/ToggleCard/ToggleCard";

const ConfigDevice = () => {
  const [configs, setConfigs] = useState({
    soilMoisture: { min: 0, max: 100 },
    temperature: { min: 0, max: 100 },
    airHumidity: { min: 0, max: 100 },
    pumpWaterSpeed: 50,
    light: true,
  });

  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const navigate = useNavigate();
  
  // Lấy deviceId từ URL params hoặc từ localStorage
  const { deviceId: paramDeviceId } = useParams();
  const deviceId = paramDeviceId || localStorage.getItem("selectedDeviceId");

  // Redirect về trang danh sách thiết bị nếu không có deviceId
  useEffect(() => {
    if (!deviceId) {
      message.error("Không tìm thấy thiết bị");
      navigate("/device-setting");
    }
  }, [deviceId, navigate]);

  // Fetch thông tin thiết bị và cấu hình
  useEffect(() => {
    if (deviceId) {
      fetchDeviceInfo();
      fetchDeviceConfig();
    }
  }, [deviceId]);

  const fetchDeviceInfo = async () => {
    try {
      const response = await axios.get(`/api/devices/${deviceId}`);
      setDeviceInfo(response.data);
    } catch (error) {
      console.error("Error fetching device info:", error);
    }
  };

  const fetchDeviceConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/device-config/${deviceId}`);
      setConfigs(response.data);
    } catch (error) {
      console.error("Error fetching device config:", error);
      // Sử dụng giá trị mặc định từ state nếu API gặp lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSingleValueChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      await axios.put(`/api/device-config/${deviceId}`, configs);
      message.success("Cấu hình thiết bị đã được lưu thành công!");
    } catch (error) {
      console.error("Error saving device config:", error);
      message.error("Không thể lưu cấu hình thiết bị");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 text-center">
        Cấu hình thiết bị {deviceInfo?.deviceName || `#${deviceId}`}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <SliderCard
          title="Độ ẩm đất"
          unit="%"
          maxLimit={100}
          value={configs.soilMoisture}
          onChange={(val) => handleRangeChange("soilMoisture", val)}
          hideInput={false}
          marks={{ 0: "0%", 50: "50%", 100: "100%" }}
        />
        <SliderCard
          title="Nhiệt độ"
          unit="°C"
          maxLimit={100}
          value={configs.temperature}
          onChange={(val) => handleRangeChange("temperature", val)}
          hideInput={false}
          marks={{ 0: "0°C", 50: "50°C", 100: "100°C" }}
        />
        <SliderCard
          title="Độ ẩm không khí"
          unit="%"
          maxLimit={100}
          value={configs.airHumidity}
          onChange={(val) => handleRangeChange("airHumidity", val)}
          hideInput={false}
          marks={{ 0: "0%", 50: "50%", 100: "100%" }}
        />
        <SliderCard
          title="Tốc độ máy bơm"
          unit="%"
          maxLimit={100}
          value={configs.pumpWaterSpeed}
          onChange={(val) => handleSingleValueChange("pumpWaterSpeed", val)}
          hideInput={false}
          marks={{ 0: "0%", 50: "50%", 100: "100%" }}
          step={10}
          isSingleValue
        />
        <ToggleCard
          toggles={[
            {
              title: "Đèn",
              value: configs.light,
              onChange: (val) => handleToggleChange("light", val),
            },
            {
              title: "Máy bơm nước",
              value: configs.pumpWaterSpeed > 0,
              onChange: (val) =>
                handleSingleValueChange("pumpWaterSpeed", val ? 50 : 0),
            },
          ]}
        />
      </div>

      <div className="mt-10 flex justify-center md:justify-end">
        <button
          onClick={handleSaveAll}
          className={`bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-md transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          <SaveOutlined />
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
};

export default ConfigDevice;
