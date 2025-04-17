import React from 'react';
import { Switch } from 'antd';

const LightControls = ({
    device,
    isDeviceLoading,
    isLightOn,
    isInAutoMode,
    onToggleLight,
    isDeviceOnline
}) => {
    return (
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center">
                <span className="font-medium">Đèn chiếu sáng</span>
                <div className={`p-1 rounded-full transition-all duration-300 ease-in-out ${isLightOn ? 'bg-yellow-100 shadow-md' : ''}`}>
                    <Switch
                        checked={isLightOn}
                        onChange={(checked) => onToggleLight(checked, device.id)}
                        className={`transition-colors duration-300 ease-in-out ${isLightOn ? '!bg-yellow-500 !bg-opacity-100' : ''}`}
                        disabled={!isDeviceOnline(device) || isInAutoMode || isDeviceLoading}
                    />
                </div>
            </div>

            {isDeviceLoading && (
                <div className="flex justify-center p-3">
                    <div className="animate-pulse flex space-x-2">
                        <div className="rounded-full bg-gray-200 h-2 w-2"></div>
                        <div className="rounded-full bg-gray-200 h-2 w-2"></div>
                        <div className="rounded-full bg-gray-200 h-2 w-2"></div>
                    </div>
                </div>
            )}

            {!isDeviceLoading && isDeviceOnline(device) && !isInAutoMode && (
                <div className="mt-2 text-center">
                    <div className={`text-sm font-medium transition-colors duration-300 ease-in-out ${isLightOn ? 'text-yellow-500' : 'text-gray-400'}`}>
                        {isLightOn ? '☀️ Đèn đang bật' : '🌙 Đèn đang tắt'}
                    </div>
                </div>
            )}

            {isInAutoMode && !isDeviceLoading && (
                <div className="text-yellow-600 text-xs bg-yellow-50 p-2 mt-2 rounded">
                    Đang ở chế độ lịch trình tự động. Hãy tắt lịch trình để điều khiển thủ công.
                </div>
            )}

            {!isDeviceOnline(device) && !isDeviceLoading && (
                <div className="text-red-500 text-xs mt-2">
                    Thiết bị offline. Không thể điều khiển.
                </div>
            )}
        </div>
    );
};

export default LightControls;