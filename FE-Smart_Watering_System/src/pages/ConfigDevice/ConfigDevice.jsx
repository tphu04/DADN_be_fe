import { useState, useEffect } from "react";
import { message, Tabs, Select, Card, Switch, Form, Input, Slider, Button, Tooltip, Alert } from "antd";
import { SaveOutlined, SettingOutlined, BulbOutlined, WifiOutlined, SyncOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../../services/ApiEndpoints";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

// Component
import SliderCard from "../../components/SliderCard/SliderCard";
import ToggleCard from "../../components/ToggleCard/ToggleCard";

const { TabPane } = Tabs;
const { Option } = Select;

const ConfigDevice = () => {
  // Cấu hình mặc định
  const defaultConfig = {
    soilMoisture: { min: 20, max: 80 },
    temperature: { min: 20, max: 35 },
    airHumidity: { min: 40, max: 80 }
  };

  const [configs, setConfigs] = useState(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Kiểm tra tài khoản đã được chấp nhận chưa
  const hasPermission = user && user.isAccepted === true;

  // Hàm kiểm tra quyền và hiển thị thông báo
  const checkPermission = () => {
    if (!hasPermission) {
      message.warning("Your account is pending approval. Some features are restricted until an admin approves your account");
      return false;
    }
    return true;
  };

  // Lấy cấu hình hiện tại từ API khi component mount
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      try {
        setFetchingConfig(true);
        const response = await axios.get(
          API_ENDPOINTS.DEVICES.GET_CONFIG('current'),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        console.log('Cấu hình nhận được từ API:', response.data);
        
        if (response.data && response.data.success && response.data.config) {
          const configData = response.data.config;
          setConfigs({
            soilMoisture: {
              min: configData.soilMoisture?.min || defaultConfig.soilMoisture.min,
              max: configData.soilMoisture?.max || defaultConfig.soilMoisture.max
            },
            temperature: {
              min: configData.temperature?.min || defaultConfig.temperature.min,
              max: configData.temperature?.max || defaultConfig.temperature.max
            },
            airHumidity: {
              min: configData.airHumidity?.min || defaultConfig.airHumidity.min,
              max: configData.airHumidity?.max || defaultConfig.airHumidity.max
            }
          });
          console.log('Đã cập nhật cấu hình từ API');
        } else {
          console.warn('Không tìm thấy cấu hình từ API, sử dụng cấu hình mặc định');
          setConfigs(defaultConfig);
        }
      } catch (error) {
        console.error("Lỗi khi lấy cấu hình:", error);
        toast.error("Không thể lấy cấu hình từ server: " + (error.response?.data?.message || error.message));
        setConfigs(defaultConfig);
      } finally {
        setFetchingConfig(false);
      }
    };

    fetchCurrentConfig();
  }, []);

  const handleRangeChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSingleValueChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    if (!checkPermission()) {
      return;
    }

    try {
      setLoading(true);
      
      // Lưu cấu hình vào hệ thống (chỉ lưu một lần)
      console.log('Lưu cấu hình:', configs);
      const saveConfigResponse = await axios.post(
        API_ENDPOINTS.DEVICES.SAVE_CONFIG, // Sử dụng endpoint đã định nghĩa
        configs,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!saveConfigResponse.data || !saveConfigResponse.data.success) {
        throw new Error(saveConfigResponse.data?.message || "Không thể lưu cấu hình");
      }
      
      toast.success("Đã lưu cấu hình thành công");
      
      // Nếu muốn áp dụng cấu hình cho các thiết bị, có thể thêm code ở đây
      // Ví dụ: gọi API áp dụng cấu hình cho các thiết bị
      
    } catch (error) {
      console.error("Error saving device configs:", error);
      toast.error("Lỗi khi lưu cấu hình thiết bị: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    if (!checkPermission()) {
      return;
    }
    
    setConfigs(defaultConfig);
    toast.info("Đã khôi phục về cấu hình mặc định");
  };

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Cấu hình thiết bị cảm biến
        </h1>
      </div>

      {!hasPermission && (
        <Alert
          message="Tài khoản đang chờ phê duyệt"
          description="Tài khoản của bạn đang chờ phê duyệt. Bạn có thể xem cấu hình nhưng không thể thay đổi cho đến khi được quản trị viên duyệt."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="mb-6"
        />
      )}

      <Card title="Cấu hình ngưỡng cảm biến" className="mb-6" loading={fetchingConfig}>
        <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
          <div className="font-medium text-blue-700 mb-1">Hướng dẫn:</div>
          <div className="text-blue-600 text-sm">
            Thiết lập các thông số ngưỡng bên dưới và nhấn "Lưu cấu hình" để áp dụng cho tất cả thiết bị cảm biến online.
            Các ngưỡng này sẽ được sử dụng để giám sát và điều khiển hệ thống tưới tự động.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Độ ẩm đất */}
          <SliderCard
            title="Ngưỡng độ ẩm đất (%)"
            value={configs.soilMoisture}
            onChange={(value) => hasPermission && handleRangeChange('soilMoisture', value)}
            min={0}
            max={100}
            step={1}
            unit="%"
            maxLimit={100}
            description="Thiết lập ngưỡng độ ẩm đất tối thiểu và tối đa. Nếu độ ẩm thấp hơn ngưỡng tối thiểu, máy bơm sẽ được kích hoạt. Nếu cao hơn ngưỡng tối đa, đèn sẽ được kích hoạt."
            disabled={!hasPermission}
          />

          {/* Nhiệt độ */}
          <SliderCard 
            title="Ngưỡng nhiệt độ (°C)"
            value={configs.temperature}
            onChange={(value) => hasPermission && handleRangeChange('temperature', value)}
            min={0}
            max={50}
            step={1}
            unit="°C"
            maxLimit={50}
            description="Thiết lập ngưỡng nhiệt độ tối thiểu và tối đa. Nếu nhiệt độ thấp hơn ngưỡng tối thiểu, đèn sẽ được kích hoạt. Nếu cao hơn ngưỡng tối đa, máy bơm sẽ được kích hoạt."
            disabled={!hasPermission}
          />

          {/* Độ ẩm không khí */}
          <SliderCard 
            title="Ngưỡng độ ẩm không khí (%)"
            value={configs.airHumidity}
            onChange={(value) => hasPermission && handleRangeChange('airHumidity', value)}
            min={0}
            max={100}
            step={1}
            unit="%"
            maxLimit={100}
            description="Thiết lập ngưỡng độ ẩm không khí tối thiểu và tối đa. Nếu độ ẩm thấp hơn ngưỡng tối thiểu, máy bơm sẽ được kích hoạt. Nếu cao hơn ngưỡng tối đa, đèn sẽ được kích hoạt."
            disabled={!hasPermission}
          />
        </div>
      </Card>

      <div className="mt-10 flex flex-wrap gap-3 justify-center md:justify-end">
        <Tooltip title={!hasPermission ? "Tài khoản đang chờ phê duyệt" : "Khôi phục về cấu hình mặc định"}>
          <Button
            onClick={handleResetToDefault}
            className="min-w-[120px]"
            disabled={loading || fetchingConfig || !hasPermission}
          >
            Khôi phục mặc định
          </Button>
        </Tooltip>
        
        <Tooltip title={!hasPermission ? "Tài khoản đang chờ phê duyệt" : "Lưu cấu hình hiện tại"}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={loading}
            disabled={loading || fetchingConfig || !hasPermission}
            className="min-w-[150px]"
          >
            {loading ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ConfigDevice;
