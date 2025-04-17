import React from 'react';
import { Button } from 'antd';

const PumpControls = ({
    device,
    isDeviceLoading,
    pumpSpeed,
    isInAutoMode,
    onSpeedChange,
    isDeviceOnline
}) => {
    const isSpeedActive = (speed) => {
        return Math.abs(pumpSpeed - speed) < 0.1;
    };

    return (
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Tốc độ máy bơm</span>
                <span className={`text-sm ${isDeviceLoading ? 'text-gray-500' : 'text-blue-500 font-medium'}`}>
                    {isDeviceLoading ? 'Đang cập nhật...' : `${pumpSpeed}%`}
                </span>
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
                <div className="flex justify-between space-x-4">
                    <Button
                        className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-300 ${isSpeedActive(0)
                                ? 'bg-blue-500 text-white font-medium border-blue-600 shadow-md hover:bg-blue-600'
                                : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                            }`}
                        onClick={() => onSpeedChange(0, device.id)}
                        disabled={isInAutoMode || isDeviceLoading}
                    >
                        Tắt (0%)
                    </Button>
                    <Button
                        className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-300 ${isSpeedActive(50)
                                ? 'bg-blue-500 text-white font-medium border-blue-600 shadow-md hover:bg-blue-600'
                                : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                            }`}
                        onClick={() => onSpeedChange(50, device.id)}
                        disabled={isInAutoMode || isDeviceLoading}
                    >
                        Vừa (50%)
                    </Button>
                    <Button
                        className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-300 ${isSpeedActive(100)
                                ? 'bg-blue-500 text-white font-medium border-blue-600 shadow-md hover:bg-blue-600'
                                : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                            }`}
                        onClick={() => onSpeedChange(100, device.id)}
                        disabled={isInAutoMode || isDeviceLoading}
                    >
                        Cao (100%)
                    </Button>
                </div>
            )}

            {isInAutoMode && !isDeviceLoading && (
                <div className="text-yellow-600 text-xs bg-yellow-50 p-2 rounded">
                    Đang ở chế độ tự động. Hãy tắt chế độ tự động để điều khiển thủ công.
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

export default PumpControls;