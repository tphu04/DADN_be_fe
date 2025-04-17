import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../services/CustomizeAxios';
import API_ENDPOINTS from '../services/ApiEndpoints';

const defaultConfig = {
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
};

export const useDeviceConfig = () => {
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [deviceConfig, setDeviceConfig] = useState(defaultConfig);
    const [savingConfig, setSavingConfig] = useState(false);

    const handleSelectDevice = (device) => {
        setSelectedDevice(device);

        // Reset về cấu hình mặc định khi chọn thiết bị mới
        setDeviceConfig(defaultConfig);
    };

    const handleCloseConfig = () => {
        setSelectedDevice(null);
        setDeviceConfig(defaultConfig);
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
        if (!selectedDevice) {
            toast.error("Vui lòng chọn thiết bị");
            return;
        }

        setSavingConfig(true);
        try {
            const deviceType = selectedDevice.deviceType;
            let hasCreatedSchedule = false;

            // Tạo lịch trình tưới nước nếu thiết bị là máy bơm và lịch trình đã được bật
            if (deviceType === 'pump_water' && deviceConfig.wateringSchedule.enabled) {
                const waterScheduleData = {
                    deviceId: selectedDevice.id,
                    scheduleType: 'watering',
                    enabled: deviceConfig.wateringSchedule.enabled,
                    startTime: deviceConfig.wateringSchedule.startTime,
                    duration: deviceConfig.wateringSchedule.duration,
                    speed: deviceConfig.wateringSchedule.speed,
                    days: deviceConfig.wateringSchedule.days,
                    autoMode: deviceConfig.autoMode
                };

                await axios.post(
                    API_ENDPOINTS.SCHEDULES.CREATE,
                    waterScheduleData,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('Đã tạo lịch trình tưới nước:', waterScheduleData);
                hasCreatedSchedule = true;
            }

            // Tạo lịch trình chiếu sáng nếu thiết bị là đèn và lịch trình đã được bật
            if (deviceType === 'light' && deviceConfig.lightSchedule.enabled) {
                const lightScheduleData = {
                    deviceId: selectedDevice.id,
                    scheduleType: 'lighting',
                    enabled: deviceConfig.lightSchedule.enabled,
                    startTime: deviceConfig.lightSchedule.onTime,  // Sửa tên trường từ onTime sang startTime
                    endTime: deviceConfig.lightSchedule.offTime,   // Sửa tên trường từ offTime sang endTime
                    days: deviceConfig.lightSchedule.days,
                    autoMode: deviceConfig.autoMode
                };

                await axios.post(
                    API_ENDPOINTS.SCHEDULES.CREATE,
                    lightScheduleData,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('Đã tạo lịch trình chiếu sáng:', lightScheduleData);
                hasCreatedSchedule = true;
            }

            // Nếu không tạo lịch trình nào (chỉ bật/tắt autoMode), thông báo cho người dùng
            if (!hasCreatedSchedule) {
                toast.info("Không có lịch trình nào được tạo vì bạn chưa bật lịch trình nào.");
            } else {
                toast.success("Lịch trình đã được tạo thành công");
            }

            // Đóng modal cấu hình
            handleCloseConfig();
        } catch (error) {
            console.error("Error saving schedule:", error);
            toast.error("Lỗi khi lưu lịch trình: " + (error.response?.data?.message || error.message));
        } finally {
            setSavingConfig(false);
        }
    };

    return {
        selectedDevice,
        deviceConfig,
        savingConfig,
        handleSelectDevice,
        handleCloseConfig,
        handleAutoModeChange,
        handleScheduleChange,
        handleSaveConfig
    };
};