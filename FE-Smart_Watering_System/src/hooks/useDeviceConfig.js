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
        console.log(`handleScheduleChange called with:`, { scheduleType, field, value });
        
        // Case 1: Called with (scheduleType, field, value)
        if (typeof scheduleType === 'string' && typeof field === 'string' && value !== undefined) {
            console.log(`Setting ${scheduleType}.${field} to:`, value);
            setDeviceConfig(prev => ({
                ...prev,
                [scheduleType]: {
                    ...prev[scheduleType],
                    [field]: value
                }
            }));
            return;
        }
        
        // Case 2: Called with object format { scheduleType, field, value }
        if (typeof scheduleType === 'object' && field === undefined && value === undefined) {
            const { scheduleType: type, field: fieldName, value: fieldValue } = scheduleType;
            if (type && fieldName) {
                console.log(`Legacy format detected - Setting ${type}.${fieldName} to:`, fieldValue);
                setDeviceConfig(prev => ({
                    ...prev,
                    [type]: {
                        ...prev[type],
                        [fieldName]: fieldValue
                    }
                }));
                return;
            }
        }
        
        // Case 3: Called with old API (scheduleType, propertyName)
        if (typeof scheduleType === 'string' && typeof field === 'string' && value === undefined) {
            console.log(`Old format detected - Handling "${scheduleType}" with data:`, field);
            setDeviceConfig(prev => ({
                ...prev,
                [scheduleType]: {
                    ...prev[scheduleType],
                    ...field
                }
            }));
            return;
        }
        
        console.error('Unsupported parameter format for handleScheduleChange:', { scheduleType, field, value });
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
            if (deviceType === 'pump_water' && deviceConfig.autoMode) {
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

                console.log('Sending watering schedule data:', JSON.stringify(waterScheduleData, null, 2));

                try {
                    const response = await axios.post(
                        API_ENDPOINTS.SCHEDULES.CREATE,
                        waterScheduleData,
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000 // 15 second timeout
                        }
                    );

                    console.log('Watering schedule creation response:', response.data);
                    if (response.data && response.data.success) {
                        console.log('Đã tạo lịch trình tưới nước thành công:', response.data);
                        hasCreatedSchedule = true;
                    } else {
                        console.error('Server returned unsuccessful response:', response.data);
                        toast.error("Lỗi tạo lịch trình tưới nước: " + (response.data?.message || "Phản hồi không thành công từ máy chủ"));
                    }
                } catch (error) {
                    console.error('Error creating watering schedule:', error);
                    toast.error("Lỗi tạo lịch trình tưới nước: " + (error.response?.data?.message || error.message));
                }
            }

            // Tạo lịch trình chiếu sáng nếu thiết bị là đèn và lịch trình đã được bật
            if (deviceType === 'light' && deviceConfig.autoMode) {
                const lightScheduleData = {
                    deviceId: selectedDevice.id,
                    scheduleType: 'lighting',
                    enabled: deviceConfig.lightSchedule.enabled,
                    startTime: deviceConfig.lightSchedule.onTime,
                    endTime: deviceConfig.lightSchedule.offTime,
                    days: deviceConfig.lightSchedule.days,
                    autoMode: deviceConfig.autoMode
                };

                console.log('Sending lighting schedule data:', JSON.stringify(lightScheduleData, null, 2));

                try {
                    const response = await axios.post(
                        API_ENDPOINTS.SCHEDULES.CREATE,
                        lightScheduleData,
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000 // 15 second timeout
                        }
                    );

                    console.log('Lighting schedule creation response:', response.data);
                    if (response.data && response.data.success) {
                        console.log('Đã tạo lịch trình chiếu sáng thành công:', response.data);
                        hasCreatedSchedule = true;
                    } else {
                        console.error('Server returned unsuccessful response:', response.data);
                        toast.error("Lỗi tạo lịch trình chiếu sáng: " + (response.data?.message || "Phản hồi không thành công từ máy chủ"));
                    }
                } catch (error) {
                    console.error('Error creating lighting schedule:', error);
                    toast.error("Lỗi tạo lịch trình chiếu sáng: " + (error.response?.data?.message || error.message));
                }
            }

            // Nếu không tạo lịch trình nào (chỉ bật/tắt autoMode), thông báo cho người dùng
            if (!hasCreatedSchedule && deviceConfig.autoMode) {
                toast.info("Bạn đã bật chế độ tự động nhưng chưa bật lịch trình nào. Vui lòng bật ít nhất một lịch trình.");
            } else if (!hasCreatedSchedule && !deviceConfig.autoMode) {
                toast.info("Chế độ tự động đã tắt. Thiết bị sẽ hoạt động ở chế độ thủ công.");
            } else {
                toast.success("Lịch trình đã được tạo thành công");
                // Đóng modal cấu hình sau khi lưu thành công
                handleCloseConfig();
            }
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