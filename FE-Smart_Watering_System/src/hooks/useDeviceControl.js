import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from '../services/CustomizeAxios';
import API_ENDPOINTS from '../services/ApiEndpoints';

export const useDeviceControl = () => {
    const [loading, setLoading] = useState(true);
    const [deviceList, setDeviceList] = useState([]);
    const [controlStates, setControlStates] = useState({});
    const [displayStates, setDisplayStates] = useState({});
    const [deviceLoadingStatus, setDeviceLoadingStatus] = useState({});
    const deviceStateCache = useRef({});

    const fetchDeviceList = async () => {
        try {
            console.log("Fetching device list...");
            setLoading(true);
            // Reset loading status for all devices first
            setDeviceLoadingStatus({});

            const response = await axios.get(API_ENDPOINTS.DEVICES.GET_ALL);

            if (response.data.success) {
                const devices = response.data.data || [];
                const filteredDevices = devices.filter(device =>
                    device.deviceType === 'pump_water' || device.deviceType === 'light'
                );

                console.log(`Found ${filteredDevices.length} supported devices out of ${devices.length} total devices`);

                const newControlStates = { ...controlStates };
                const newDisplayStates = { ...displayStates };
                const loadingStates = {};

                // Initialize states for each device
                filteredDevices.forEach(device => {
                    // Initially set loading to false for all devices
                    loadingStates[device.id] = false;

                    if (device.deviceType === 'pump_water') {
                        const pumpSpeed = deviceStateCache.current[device.id]?.pumpSpeed ?? 0;
                        newControlStates[device.id] = {
                            ...newControlStates[device.id],
                            pumpWaterOn: pumpSpeed > 0,
                            pumpWaterSpeed: pumpSpeed
                        };
                        newDisplayStates[device.id] = {
                            ...newDisplayStates[device.id],
                            pumpWaterOn: pumpSpeed > 0,
                            pumpWaterSpeed: pumpSpeed
                        };
                    } else if (device.deviceType === 'light') {
                        const isLightOn = deviceStateCache.current[device.id]?.isLightOn ?? false;
                        newControlStates[device.id] = {
                            ...newControlStates[device.id],
                            light: isLightOn
                        };
                        newDisplayStates[device.id] = {
                            ...newDisplayStates[device.id],
                            light: isLightOn
                        };
                    }
                });

                setDeviceLoadingStatus(loadingStates);
                setControlStates(newControlStates);
                setDisplayStates(newDisplayStates);
                setDeviceList(filteredDevices);

                // Fetch initial status for each device
                filteredDevices.forEach(device => {
                    fetchDeviceStatus(device.id);
                });
            } else {
                console.error("Error fetching device list:", response.data.message);
                toast.error("Không thể tải danh sách thiết bị: " + response.data.message);
            }
        } catch (error) {
            console.error("Error fetching device list:", error);
            toast.error("Không thể tải danh sách thiết bị: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const sendDeviceCommand = async (deviceId, type, data) => {
        try {
            const commandData = {
                type: type,
                ...data,
                timestamp: new Date().getTime()
            };

            const response = await axios.post(
                API_ENDPOINTS.DEVICES.COMMAND(deviceId),
                commandData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data || !response.data.success) {
                throw new Error(response.data?.message || "Lỗi khi gửi lệnh điều khiển");
            }

            return response.data;
        } catch (error) {
            console.error("Error sending device command:", error);
            throw new Error(error.response?.data?.message || error.message);
        }
    };

    const handlePumpSpeedChange = async (value, deviceId) => {
        const speedValue = parseInt(value, 10);
        console.log(`handlePumpSpeedChange: deviceId=${deviceId}, speed=${speedValue}, type=${typeof speedValue}`);

        // Cache giá trị hiện tại trước khi thay đổi
        const currentState = {
            pumpSpeed: displayStates[deviceId]?.pumpWaterSpeed ?? controlStates[deviceId]?.pumpWaterSpeed ?? 0
        };
        deviceStateCache.current[deviceId] = currentState;

        setDeviceLoadingStatus(prev => ({
            ...prev,
            [deviceId]: true
        }));

        // Cập nhật UI ngay lập tức với giá trị mới
        setControlStates(prev => ({
            ...prev,
            [deviceId]: {
                ...prev[deviceId],
                pumpWaterSpeed: speedValue,
                pumpWaterOn: speedValue > 0
            }
        }));

        setDisplayStates(prev => ({
            ...prev,
            [deviceId]: {
                ...prev[deviceId],
                pumpWaterSpeed: speedValue,
                pumpWaterOn: speedValue > 0
            }
        }));

        try {
            await sendDeviceCommand(deviceId, 'pumpWater', {
                status: speedValue > 0 ? 'On' : 'Off',
                speed: speedValue
            });

            // Cập nhật cache sau khi thành công
            deviceStateCache.current[deviceId] = {
                pumpSpeed: speedValue
            };

            if (speedValue === 0) {
                toast.success('Đã tắt máy bơm');
            } else {
                toast.success(`Tốc độ máy bơm đã được đặt: ${speedValue}%`);
            }

            // Chỉ fetch lại trạng thái nếu cần
            // await fetchDeviceStatus(deviceId);
        } catch (error) {
            console.error("Error setting pump speed:", error);
            toast.error("Không thể điều chỉnh tốc độ máy bơm: " + error.message);

            // Khôi phục giá trị từ cache nếu có lỗi
            const previousSpeed = deviceStateCache.current[deviceId]?.pumpSpeed;
            if (previousSpeed !== undefined) {
                setControlStates(prev => ({
                    ...prev,
                    [deviceId]: {
                        ...prev[deviceId],
                        pumpWaterSpeed: previousSpeed,
                        pumpWaterOn: previousSpeed > 0
                    }
                }));

                setDisplayStates(prev => ({
                    ...prev,
                    [deviceId]: {
                        ...prev[deviceId],
                        pumpWaterSpeed: previousSpeed,
                        pumpWaterOn: previousSpeed > 0
                    }
                }));
            }
        } finally {
            setDeviceLoadingStatus(prev => ({
                ...prev,
                [deviceId]: false
            }));
        }
    };

    const handleToggleLight = async (checked, deviceId) => {
        // Special case for when only deviceId is passed (toggle current state)
        if (deviceId === undefined && typeof checked === 'number') {
            deviceId = checked;
            const currentState = displayStates[deviceId]?.light ?? false;
            checked = !currentState;
        }

        console.log(`handleToggleLight: deviceId=${deviceId}, checked=${checked}, type=${typeof checked}`);

        // Validate deviceId
        if (!deviceId || isNaN(parseInt(deviceId))) {
            console.error('Invalid deviceId:', deviceId);
            toast.error('ID thiết bị không hợp lệ');
            return;
        }

        // Ensure deviceId is a number
        deviceId = parseInt(deviceId);

        // Cache giá trị hiện tại trước khi thay đổi
        const currentState = {
            isLightOn: displayStates[deviceId]?.light ?? controlStates[deviceId]?.light ?? false
        };
        deviceStateCache.current[deviceId] = currentState;

        setDeviceLoadingStatus(prev => ({
            ...prev,
            [deviceId]: true
        }));

        // Cập nhật UI ngay lập tức với giá trị mới
        setControlStates(prev => ({
            ...prev,
            [deviceId]: {
                ...prev[deviceId],
                light: checked
            }
        }));

        setDisplayStates(prev => ({
            ...prev,
            [deviceId]: {
                ...prev[deviceId],
                light: checked
            }
        }));

        try {
            await sendDeviceCommand(deviceId, 'light', {
                status: checked ? 'On' : 'Off'
            });

            // Cập nhật cache sau khi thành công
            deviceStateCache.current[deviceId] = {
                isLightOn: checked
            };

            toast.success(`Đèn đã ${checked ? 'bật' : 'tắt'}`);

            // Bỏ việc fetch lại trạng thái để tránh reset không mong muốn
            // await fetchDeviceStatus(deviceId);
        } catch (error) {
            console.error("Error toggling light:", error);
            toast.error(`Không thể ${checked ? 'bật' : 'tắt'} đèn: ` + error.message);

            // Khôi phục giá trị từ cache nếu có lỗi
            const previousState = deviceStateCache.current[deviceId]?.isLightOn;
            if (previousState !== undefined) {
                setControlStates(prev => ({
                    ...prev,
                    [deviceId]: {
                        ...prev[deviceId],
                        light: previousState
                    }
                }));

                setDisplayStates(prev => ({
                    ...prev,
                    [deviceId]: {
                        ...prev[deviceId],
                        light: previousState
                    }
                }));
            }
        } finally {
            setDeviceLoadingStatus(prev => ({
                ...prev,
                [deviceId]: false
            }));
        }
    };

    const fetchDeviceStatus = async (deviceId) => {
        setDeviceLoadingStatus(prev => ({
            ...prev,
            [deviceId]: true
        }));

        try {
            const response = await axios.get(API_ENDPOINTS.DEVICES.GET_BY_ID(deviceId));

            if (response.data && response.data.success) {
                const deviceData = response.data.device || response.data.data;
                if (deviceData) {
                    if (deviceData.deviceType === 'pump_water') {
                        let pumpSpeed = 0;
                        const dataSource = deviceData.lastValue !== undefined ? deviceData.lastValue :
                            (deviceData.lastData ? deviceData.lastData.pumpSpeed || deviceData.lastData.value : null);

                        if (dataSource !== undefined && dataSource !== null) {
                            try {
                                if (typeof dataSource === 'string') {
                                    const trimmedValue = dataSource.trim();
                                    pumpSpeed = trimmedValue === '' || trimmedValue.toLowerCase() === 'off' || trimmedValue === '0'
                                        ? 0
                                        : parseInt(trimmedValue, 10);
                                } else if (typeof dataSource === 'number') {
                                    pumpSpeed = dataSource;
                                } else if (typeof dataSource === 'boolean') {
                                    pumpSpeed = dataSource ? 100 : 0;
                                }

                                pumpSpeed = Math.max(0, Math.min(100, pumpSpeed));
                            } catch (e) {
                                console.warn(`Không thể chuyển đổi giá trị máy bơm: ${dataSource}`, e);
                                pumpSpeed = 0;
                            }
                        }

                        deviceStateCache.current[deviceId] = {
                            pumpSpeed,
                            isLightOn: false
                        };

                        setControlStates(prev => ({
                            ...prev,
                            [deviceId]: {
                                ...prev[deviceId],
                                pumpWaterOn: pumpSpeed > 0,
                                pumpWaterSpeed: pumpSpeed
                            }
                        }));

                        setDisplayStates(prev => ({
                            ...prev,
                            [deviceId]: {
                                ...prev[deviceId],
                                pumpWaterOn: pumpSpeed > 0,
                                pumpWaterSpeed: pumpSpeed
                            }
                        }));
                    } else if (deviceData.deviceType === 'light') {
                        const lightValue = deviceData.lastValue !== undefined ? deviceData.lastValue :
                            (deviceData.lastData ? deviceData.lastData.status || deviceData.lastData.value : null);

                        let isLightOn = false;

                        if (lightValue !== undefined && lightValue !== null) {
                            if (typeof lightValue === 'string') {
                                const normalizedValue = lightValue.toLowerCase().trim();
                                isLightOn = normalizedValue === 'on' ||
                                    normalizedValue === 'true' ||
                                    normalizedValue === '1' ||
                                    normalizedValue === 'yes' ||
                                    normalizedValue === 'bật';
                            } else if (typeof lightValue === 'boolean') {
                                isLightOn = lightValue;
                            } else if (typeof lightValue === 'number') {
                                isLightOn = lightValue > 0;
                            }
                        }

                        deviceStateCache.current[deviceId] = {
                            pumpSpeed: 0,
                            isLightOn
                        };

                        setControlStates(prev => ({
                            ...prev,
                            [deviceId]: {
                                ...prev[deviceId],
                                light: isLightOn
                            }
                        }));

                        setDisplayStates(prev => ({
                            ...prev,
                            [deviceId]: {
                                ...prev[deviceId],
                                light: isLightOn
                            }
                        }));
                    }
                }
            }
        } catch (error) {
            console.error(`Lỗi khi lấy trạng thái thiết bị ${deviceId}:`, error);
            toast.error("Không thể lấy trạng thái thiết bị: " + error.message);
        } finally {
            setDeviceLoadingStatus(prev => ({
                ...prev,
                [deviceId]: false
            }));
        }
    };

    const isDeviceOnline = (device) => {
        return true; // Tạm thời coi tất cả thiết bị là online
    };

    return {
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
    };
};