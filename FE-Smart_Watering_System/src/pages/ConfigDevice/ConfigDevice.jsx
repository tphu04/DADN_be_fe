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
  const [lastUpdated, setLastUpdated] = useState(null);
  
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
        
        // Skip API call if user is not approved
        if (!hasPermission) {
          console.log('ConfigDevice: User not approved, skipping config fetch');
          setConfigs(defaultConfig);
          setFetchingConfig(false);
          return;
        }
        
        // Try to get the device-specific configuration if we have a deviceId
        const deviceId = localStorage.getItem("selectedDeviceId") || 'current';
        
        const response = await axios.get(
          API_ENDPOINTS.DEVICES.GET_CONFIG(deviceId),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        console.log('Cấu hình nhận được từ API:', response.data);
        
        if (response.data && response.data.success) {
          // Kiểm tra cấu trúc dữ liệu để xử lý phù hợp
          let configData;
          
          if (response.data.config) {
            // Cấu trúc mới
            configData = response.data.config;
            
            setConfigs({
              soilMoisture: {
                min: configData.soilMoisture?.min ?? defaultConfig.soilMoisture.min,
                max: configData.soilMoisture?.max ?? defaultConfig.soilMoisture.max
              },
              temperature: {
                min: configData.temperature?.min ?? defaultConfig.temperature.min,
                max: configData.temperature?.max ?? defaultConfig.temperature.max
              },
              airHumidity: {
                min: configData.airHumidity?.min ?? defaultConfig.airHumidity.min,
                max: configData.airHumidity?.max ?? defaultConfig.airHumidity.max
              }
            });
            console.log('Đã cập nhật cấu hình từ API (cấu trúc mới)');
            setLastUpdated(new Date().toLocaleString());
          } 
          else if (response.data.data) {
            // Cấu trúc cũ
            configData = response.data.data;
            
            setConfigs({
              soilMoisture: {
                min: configData.soilMoistureMin ?? defaultConfig.soilMoisture.min,
                max: configData.soilMoistureMax ?? defaultConfig.soilMoisture.max
              },
              temperature: {
                min: configData.temperatureMin ?? defaultConfig.temperature.min,
                max: configData.temperatureMax ?? defaultConfig.temperature.max
              },
              airHumidity: {
                min: configData.humidityMin ?? defaultConfig.airHumidity.min,
                max: configData.humidityMax ?? defaultConfig.airHumidity.max
              }
            });
            console.log('Đã cập nhật cấu hình từ API (cấu trúc cũ)');
            setLastUpdated(new Date().toLocaleString());
          } else {
            console.warn('Không tìm thấy dữ liệu cấu hình trong phản hồi API, sử dụng cấu hình mặc định');
            setConfigs(defaultConfig);
          }
        } else {
          console.warn('Không tìm thấy cấu hình từ API, sử dụng cấu hình mặc định');
          setConfigs(defaultConfig);
        }
      } catch (error) {
        console.error("Lỗi khi lấy cấu hình:", error);
        toast.error("Lỗi khi lấy cấu hình: " + (error.response?.data?.message || error.message));
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
      
      // Ensure all values are valid numbers
      const safeConfigs = {
        soilMoisture: {
          min: Number(configs.soilMoisture.min) || 20,
          max: Number(configs.soilMoisture.max) || 80
        },
        temperature: {
          min: Number(configs.temperature.min) || 20,
          max: Number(configs.temperature.max) || 35
        },
        airHumidity: {
          min: Number(configs.airHumidity.min) || 40,
          max: Number(configs.airHumidity.max) || 80
        }
      };
      
      // Format data for API - supporting both formats
      // Cấu trúc mới (khớp với Dashboard)
      const newFormatConfig = {
        soilMoisture: {
          min: safeConfigs.soilMoisture.min,
          max: safeConfigs.soilMoisture.max
        },
        temperature: {
          min: safeConfigs.temperature.min,
          max: safeConfigs.temperature.max
        },
        airHumidity: {
          min: safeConfigs.airHumidity.min,
          max: safeConfigs.airHumidity.max
        }
      };
      
      // Lưu cấu hình vào hệ thống
      console.log('Lưu cấu hình:', newFormatConfig);
      const saveConfigResponse = await axios.post(
        API_ENDPOINTS.DEVICES.SAVE_CONFIG,
        newFormatConfig,
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
      setLastUpdated(new Date().toLocaleString());
      
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

  // Thêm hàm refresh cấu hình
  const handleRefreshConfig = async () => {
    try {
      setFetchingConfig(true);
      
      // Skip API call if user is not approved
      if (!hasPermission) {
        console.log('ConfigDevice: User not approved, skipping config refresh');
        toast.info("Account is pending approval. Using default configuration.");
        setFetchingConfig(false);
        return;
      }
      
      toast.info("Đang tải lại cấu hình mới nhất...");
      
      // Try to get the device-specific configuration if we have a deviceId
      const deviceId = localStorage.getItem("selectedDeviceId") || 'current';
      
      const response = await axios.get(
        API_ENDPOINTS.DEVICES.GET_CONFIG(deviceId),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log('Đã tải lại cấu hình từ API:', response.data);
      
      if (response.data && response.data.success) {
        // Kiểm tra cấu trúc dữ liệu để xử lý phù hợp
        let configData;
        
        if (response.data.config) {
          // Cấu trúc mới
          configData = response.data.config;
          
          setConfigs({
            soilMoisture: {
              min: configData.soilMoisture?.min ?? defaultConfig.soilMoisture.min,
              max: configData.soilMoisture?.max ?? defaultConfig.soilMoisture.max
            },
            temperature: {
              min: configData.temperature?.min ?? defaultConfig.temperature.min,
              max: configData.temperature?.max ?? defaultConfig.temperature.max
            },
            airHumidity: {
              min: configData.airHumidity?.min ?? defaultConfig.airHumidity.min,
              max: configData.airHumidity?.max ?? defaultConfig.airHumidity.max
            }
          });
          toast.success("Đã tải cấu hình mới nhất từ server");
          setLastUpdated(new Date().toLocaleString());
        } 
        else if (response.data.data) {
          // Cấu trúc cũ
          configData = response.data.data;
          
          setConfigs({
            soilMoisture: {
              min: configData.soilMoistureMin ?? defaultConfig.soilMoisture.min,
              max: configData.soilMoistureMax ?? defaultConfig.soilMoisture.max
            },
            temperature: {
              min: configData.temperatureMin ?? defaultConfig.temperature.min,
              max: configData.temperatureMax ?? defaultConfig.temperature.max
            },
            airHumidity: {
              min: configData.humidityMin ?? defaultConfig.airHumidity.min,
              max: configData.humidityMax ?? defaultConfig.airHumidity.max
            }
          });
          toast.success("Đã tải cấu hình mới nhất từ server");
          setLastUpdated(new Date().toLocaleString());
        } else {
          console.warn('Không tìm thấy dữ liệu cấu hình trong phản hồi API');
          toast.warning("Không tìm thấy cấu hình từ server");
        }
      } else {
        console.warn('Không tìm thấy cấu hình từ API');
        toast.warning("Không tìm thấy cấu hình từ server");
      }
    } catch (error) {
      console.error("Lỗi khi tải lại cấu hình:", error);
      toast.error("Lỗi khi tải lại cấu hình: " + (error.response?.data?.message || error.message));
    } finally {
      setFetchingConfig(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Cấu hình thiết bị cảm biến
        </h1>
        
        {/* Thêm nút Refresh */}
        <Button 
          icon={<SyncOutlined />} 
          onClick={handleRefreshConfig}
          loading={fetchingConfig}
        >
          Tải lại cấu hình
        </Button>
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
            {lastUpdated && (
              <div className="mt-2 text-sm text-blue-800">
                <SyncOutlined className="mr-1" spin={fetchingConfig} /> Cập nhật lần cuối: {lastUpdated}
              </div>
            )}
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
            max={100}
            step={1}
            unit="°C"
            maxLimit={100}
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
