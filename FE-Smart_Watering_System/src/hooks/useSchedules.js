import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../services/CustomizeAxios';
import API_ENDPOINTS from '../services/ApiEndpoints';

export const useSchedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);

    const fetchSchedules = async () => {
        setSchedulesLoading(true);
        try {
            const response = await axios.get(API_ENDPOINTS.SCHEDULES.GET_ALL);
            
            // Debug logging
            console.log('API Schedule response raw:', response);
            console.log('API Schedule data:', response.data);
            console.log('API Schedule data.data:', response.data?.data);

            if (response.data && response.data.success) {
                let allSchedules = response.data.data || [];
                console.log('All schedules before processing:', allSchedules);
                console.log('All schedules count:', allSchedules.length);

                // Đảm bảo allSchedules luôn là một mảng
                if (!Array.isArray(allSchedules)) {
                    console.warn('Schedule data is not an array, converting to array:', allSchedules);
                    // Nếu là 1 object đơn lẻ, chuyển thành mảng với 1 phần tử
                    if (allSchedules && typeof allSchedules === 'object') {
                        allSchedules = [allSchedules];
                    } else {
                        allSchedules = [];
                    }
                }

                const schedulesWithDeviceInfo = await Promise.all(
                    allSchedules.map(async (schedule, index) => {
                        console.log(`Processing schedule ${index}:`, schedule);
                        try {
                            if (schedule && schedule.deviceId) {
                                try {
                                    const deviceResponse = await axios.get(
                                        API_ENDPOINTS.DEVICES.GET_BY_ID(schedule.deviceId)
                                    );
    
                                    if (deviceResponse.data && deviceResponse.data.success && deviceResponse.data.data) {
                                        const deviceInfo = deviceResponse.data.data;
                                        return {
                                            ...schedule,
                                            deviceName: deviceInfo.deviceName || deviceInfo.deviceCode,
                                            deviceType: deviceInfo.deviceType
                                        };
                                    }
                                } catch (deviceError) {
                                    console.error(`Error fetching device info for schedule ${schedule.id}:`, deviceError);
                                    // Vẫn giữ lại lịch trình, chỉ không có thông tin thiết bị
                                }
                            }
                            return schedule;
                        } catch (error) {
                            console.error(`Error processing schedule ${index}:`, error);
                            return schedule; // Đảm bảo luôn trả về schedule để không bị mất
                        }
                    })
                );

                // Lọc bỏ các mục null/undefined nếu có
                const validSchedules = schedulesWithDeviceInfo.filter(schedule => schedule);
                
                console.log('Schedules with device info:', validSchedules);
                console.log('Schedules with device info count:', validSchedules.length);
                
                setSchedules(validSchedules);
            }
        } catch (error) {
            console.error("Error fetching schedules:", error);
            toast.error("Không thể tải danh sách lịch trình: " + (error.response?.data?.message || error.message));
        } finally {
            setSchedulesLoading(false);
        }
    };

    const fetchAllDeviceSchedules = async () => {
        console.log('Fetching schedules for all devices');
        setSchedulesLoading(true);
        try {
            // Lấy danh sách thiết bị trước
            const devicesResponse = await axios.get(API_ENDPOINTS.DEVICES.GET_ALL);
            if (devicesResponse.data && devicesResponse.data.success) {
                const devices = devicesResponse.data.data || [];
                console.log('Devices found:', devices.length);
                
                // Danh sách lịch trình tổng hợp
                let allSchedules = [];
                
                // Lấy lịch trình cho từng thiết bị
                for (const device of devices) {
                    try {
                        console.log(`Fetching schedules for device ${device.id} (${device.deviceCode})`);
                        const scheduleResponse = await axios.get(
                            API_ENDPOINTS.SCHEDULES.GET_BY_DEVICE(device.id)
                        );
                        
                        if (scheduleResponse.data && scheduleResponse.data.success) {
                            const deviceSchedules = scheduleResponse.data.data || [];
                            console.log(`Found ${deviceSchedules.length} schedules for device ${device.id}`);
                            
                            // Thêm thông tin thiết bị vào mỗi lịch trình
                            const schedulesWithDeviceInfo = deviceSchedules.map(schedule => ({
                                ...schedule,
                                deviceName: device.deviceName || device.deviceCode,
                                deviceType: device.deviceType
                            }));
                            
                            // Thêm vào danh sách tổng hợp
                            allSchedules = [...allSchedules, ...schedulesWithDeviceInfo];
                        }
                    } catch (error) {
                        console.error(`Error fetching schedules for device ${device.id}:`, error);
                    }
                }
                
                console.log('All device schedules found:', allSchedules.length);
                setSchedules(allSchedules);
            }
        } catch (error) {
            console.error("Error fetching all device schedules:", error);
            toast.error("Không thể tải danh sách lịch trình: " + (error.response?.data?.message || error.message));
        } finally {
            setSchedulesLoading(false);
        }
    };

    // Phương thức mới để bật/tắt lịch trình
    const setScheduleEnabled = async (scheduleId, enabled) => {
        console.log(`Setting schedule ${scheduleId} enabled status to ${enabled}`);
        
        try {
            // Sử dụng phương thức GET có tham số query
            const endpoint = API_ENDPOINTS.SCHEDULES.SET_ENABLED(scheduleId, enabled);
            console.log(`Calling endpoint: ${endpoint}`);
            
            const response = await axios.get(endpoint);
            console.log('Set enabled response:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error("Error setting schedule enabled status:", error);
            throw error;
        }
    };

    const handleToggleSchedule = async (schedule) => {
        try {
            console.log(`Trying to toggle schedule ${schedule.id} from ${schedule.enabled} to ${!schedule.enabled}`);
            
            // Thử phương thức mới trước
            const result = await setScheduleEnabled(schedule.id, !schedule.enabled);
            
            if (result.success) {
                console.log("Toggle succeeded using new method");
                toast.success(`Lịch trình đã được ${!schedule.enabled ? 'bật' : 'tắt'}`);
                fetchAllDeviceSchedules();
                return;
            }
            
            // Nếu không thành công, thử phương thức cũ
            // Chỉ gửi trường enabled mà chúng ta muốn thay đổi
            const updateData = {
                enabled: !schedule.enabled
            };

            // Hiển thị thông tin endpoint được gọi
            const endpoint = API_ENDPOINTS.SCHEDULES.UPDATE(schedule.id);
            console.log(`Calling endpoint: ${endpoint}`);
            
            // Thêm timeout dài hơn cho request
            const response = await axios.put(
                endpoint,
                updateData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 giây
                }
            );
            
            console.log('Toggle schedule response:', response.data);

            toast.success(`Lịch trình đã được ${!schedule.enabled ? 'bật' : 'tắt'}`);

            // Tải lại danh sách lịch trình
            fetchAllDeviceSchedules();
        } catch (error) {
            console.error("Error toggling schedule:", error);
            
            // Hiển thị thông tin chi tiết về lỗi
            if (error.response) {
                // Máy chủ trả về response với mã lỗi
                console.log("Error response status:", error.response.status);
                console.log("Error response headers:", error.response.headers);
                console.log("Error response data:", error.response.data);
            } else if (error.request) {
                // Request đã được gửi nhưng không nhận được response
                console.log("Error request:", error.request);
                // Kiểm tra xem có phải là lỗi timeout không
                if (error.code === 'ECONNABORTED') {
                    toast.error("Không thể kết nối đến máy chủ, yêu cầu đã hết thời gian chờ");
                    return;
                }
            } else {
                // Lỗi khi thiết lập request
                console.log("Error message:", error.message);
            }
            
            toast.error("Không thể thay đổi trạng thái lịch trình: " + (error.response?.data?.message || error.message));
            
            // Thử lại với PATCH method nếu PUT thất bại
            try {
                console.log("Retrying with PATCH method to toggle endpoint");
                await axios.patch(
                    API_ENDPOINTS.SCHEDULES.TOGGLE(schedule.id)
                );
                console.log("PATCH method succeeded");
                toast.success(`Lịch trình đã được ${!schedule.enabled ? 'bật' : 'tắt'}`);
                fetchAllDeviceSchedules();
            } catch (retryError) {
                console.error("Retry also failed:", retryError);
            }
        }
    };

    const handleDeleteSchedule = async (schedule) => {
        try {
            console.log(`Trying to delete schedule ${schedule.id}`);
            
            // Hiển thị thông tin endpoint được gọi
            const endpoint = API_ENDPOINTS.SCHEDULES.DELETE(schedule.id);
            console.log(`Calling endpoint: ${endpoint}`);
            
            // Thêm timeout dài hơn cho request
            const response = await axios.delete(
                endpoint,
                {
                    timeout: 10000 // 10 giây
                }
            );
            
            console.log('Delete schedule response:', response.data);

            toast.success("Lịch trình đã được xóa");

            // Tải lại danh sách lịch trình
            fetchAllDeviceSchedules();
        } catch (error) {
            console.error("Error deleting schedule:", error);
            
            // Hiển thị thông tin chi tiết về lỗi
            if (error.response) {
                // Máy chủ trả về response với mã lỗi
                console.log("Error response status:", error.response.status);
                console.log("Error response headers:", error.response.headers);
                console.log("Error response data:", error.response.data);
            } else if (error.request) {
                // Request đã được gửi nhưng không nhận được response
                console.log("Error request:", error.request);
                // Kiểm tra xem có phải là lỗi timeout không
                if (error.code === 'ECONNABORTED') {
                    toast.error("Không thể kết nối đến máy chủ, yêu cầu đã hết thời gian chờ");
                    return;
                }
            } else {
                // Lỗi khi thiết lập request
                console.log("Error message:", error.message);
            }
            
            toast.error("Không thể xóa lịch trình: " + (error.response?.data?.message || error.message));
        }
    };

    return {
        schedules,
        schedulesLoading,
        fetchSchedules,
        fetchAllDeviceSchedules,
        handleToggleSchedule,
        handleDeleteSchedule,
        setScheduleEnabled
    };
};