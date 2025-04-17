import { useEffect } from "react";
import { Card, Table, Tag, Button, Space, Tooltip, Alert, message } from "antd";
import { WifiOutlined, ReloadOutlined, SettingOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  ActiveSchedulesList,
  PumpControls,
  LightControls,
  DeviceConfigModal
} from "../../components/DeviceControl";
import { useDeviceControl } from "../../hooks/useDeviceControl";
import { useSchedules } from "../../hooks/useSchedules";
import { useDeviceConfig } from "../../hooks/useDeviceConfig";
import { useAuth } from "../../context/AuthContext";

const ControlDevice = () => {
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

  // Custom hooks
  const {
    loading,
    deviceList,
    controlStates,
    displayStates,
    deviceLoadingStatus,
    fetchDeviceList,
    handlePumpSpeedChange,
    handleToggleLight,
    fetchDeviceStatus,
    isDeviceOnline
  } = useDeviceControl();

  const {
    schedules,
    schedulesLoading,
    fetchSchedules,
    fetchAllDeviceSchedules,
    handleToggleSchedule,
    handleDeleteSchedule
  } = useSchedules();

  const {
    selectedDevice,
    deviceConfig,
    savingConfig,
    handleSelectDevice,
    handleCloseConfig,
    handleAutoModeChange,
    handleScheduleChange,
    handleSaveConfig
  } = useDeviceConfig();

  // Effects
  useEffect(() => {
    // Load initial data
    fetchDeviceList();
    fetchAllDeviceSchedules();
  }, []);

  // Render functions
  const renderPumpControls = (device) => {
    if (!device || device.deviceType !== 'pump_water') return null;

    const isCurrentDevice = selectedDevice && selectedDevice.id === device.id;
    const isAutoMode = isCurrentDevice && deviceConfig.autoMode;
    const isWateringScheduleEnabled = isCurrentDevice && deviceConfig.wateringSchedule?.enabled;
    const isInAutoMode = isAutoMode && isWateringScheduleEnabled;
    const isDeviceLoading = deviceLoadingStatus[device.id] === true;
    const displayState = displayStates[device.id] || {};
    const pumpSpeed = displayState.pumpWaterSpeed !== undefined ? displayState.pumpWaterSpeed : 0;

    return (
      <PumpControls
        device={device}
        isDeviceLoading={isDeviceLoading}
        pumpSpeed={pumpSpeed}
        isInAutoMode={isInAutoMode}
        onSpeedChange={(deviceId, value) => {
          if (!checkPermission()) return;
          handlePumpSpeedChange(deviceId, value);
        }}
        isDeviceOnline={isDeviceOnline}
        disabled={!hasPermission}
      />
    );
  };

  const renderLightControls = (device) => {
    if (!device || device.deviceType !== 'light') return null;

    const isCurrentDevice = selectedDevice && selectedDevice.id === device.id;
    const isAutoMode = isCurrentDevice && deviceConfig.autoMode;
    const isLightScheduleEnabled = isCurrentDevice && deviceConfig.lightSchedule?.enabled;
    const isInAutoMode = isAutoMode && isLightScheduleEnabled;
    const isDeviceLoading = deviceLoadingStatus[device.id] === true;
    const displayState = displayStates[device.id] || {};
    const lightValue = displayState.light !== undefined ? displayState.light : false;

    return (
      <LightControls
        device={device}
        isDeviceLoading={isDeviceLoading}
        isLightOn={lightValue}
        isInAutoMode={isInAutoMode}
        onToggleLight={(deviceId) => {
          if (!checkPermission()) return;
          handleToggleLight(deviceId);
        }}
        isDeviceOnline={isDeviceOnline}
        disabled={!hasPermission}
      />
    );
  };

  const renderConfigButton = (device) => (
    <Tooltip title={!hasPermission ? "Tài khoản đang chờ phê duyệt" : "Cấu hình thiết bị"}>
      <Button
        size="small"
        icon={<SettingOutlined />}
        onClick={() => {
          if (!checkPermission()) return;
          handleSelectDevice(device);
        }}
        disabled={!hasPermission}
      >
        Cấu hình
      </Button>
    </Tooltip>
  );

  // Table columns configuration
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
        const config = {
          'pump_water': { color: 'cyan', text: 'Máy bơm' },
          'light': { color: 'gold', text: 'Đèn' },
          default: { color: 'default', text: type }
        };
        const { color, text } = config[type] || config.default;
        return <Tag color={color}>{text}</Tag>;
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

      {!hasPermission && (
        <Alert
          message="Tài khoản đang chờ phê duyệt"
          description="Tài khoản của bạn đang chờ phê duyệt. Bạn có thể xem thiết bị nhưng không thể điều khiển cho đến khi được quản trị viên duyệt."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="mb-6"
        />
      )}

      {/* Device list */}
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

      {/* Active schedules */}
      <Card
        title="Danh sách lịch trình"
        className="mb-6 shadow-md"
      >
        <ActiveSchedulesList
          schedules={schedules}
          onToggle={(schedule) => {
            if (!checkPermission()) return;
            handleToggleSchedule(schedule);
          }}
          onDelete={(schedule) => {
            if (!checkPermission()) return;
            handleDeleteSchedule(schedule);
          }}
          disabled={!hasPermission}
        />
      </Card>

      {/* Device configuration modal */}
      {selectedDevice && (
        <DeviceConfigModal
          device={selectedDevice}
          config={deviceConfig}
          onClose={handleCloseConfig}
          onAutoModeChange={(enabled) => {
            if (!checkPermission()) return;
            handleAutoModeChange(enabled);
          }}
          onScheduleChange={(scheduleType, data) => {
            if (!checkPermission()) return;
            handleScheduleChange(scheduleType, data);
          }}
          onSave={() => {
            if (!checkPermission()) return;
            handleSaveConfig();
          }}
          saving={savingConfig}
          disabled={!hasPermission}
        />
      )}
    </div>
  );
};

export default ControlDevice;