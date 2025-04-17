import React, { useState, useEffect } from 'react';
import DeviceServices from '../../services/DeviceServices';
import { useNavigate } from 'react-router-dom';

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const result = await DeviceServices.getDevices();
        
        // Kiểm tra cấu trúc dữ liệu
        console.log('DeviceList received user devices:', result);
        
        if (Array.isArray(result)) {
          setDevices(result);
        } else if (result && result.data && Array.isArray(result.data)) {
          setDevices(result.data);
        } else {
          console.error('Unexpected data format from API:', result);
          setDevices([]);
          setError('Invalid data format received from server');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching devices:', error);
        setError('Failed to load devices');
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const getDeviceTypeIcon = (deviceType) => {
    switch (deviceType) {
      case 'temperature_humidity':
        return '🌡️';
      case 'soil_moisture':
        return '💧';
      case 'pump_water':
        return '⚙️';
      default:
        return '📱';
    }
  };

  const getDeviceTypeName = (deviceType) => {
    switch (deviceType) {
      case 'temperature_humidity':
        return 'Temperature & Humidity';
      case 'soil_moisture':
        return 'Soil Moisture';
      case 'pump_water':
        return 'Water Pump';
      default:
        return deviceType;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'Off':
        return 'bg-gray-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDeviceClick = (deviceId) => {
    navigate(`/dashboard/device/${deviceId}`);
  };

  if (loading) {
    return <div className="p-4 flex justify-center">Loading devices...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Bạn chưa có thiết bị nào</h3>
          <p className="text-gray-600 mb-4">Hãy thêm thiết bị mới trong mục Quản lý thiết bị để bắt đầu</p>
          <button 
            onClick={() => navigate('/device-setting')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Thêm thiết bị mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Devices</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => (
          <div
            key={device.id}
            className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleDeviceClick(device.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">{getDeviceTypeIcon(device.deviceType)}</div>
              <div className={`h-3 w-3 rounded-full ${getStatusColor(device.status)}`}></div>
            </div>
            <h3 className="text-lg font-semibold">{device.deviceCode || 'Unnamed Device'}</h3>
            <p className="text-gray-600">{device.description || 'No description'}</p>
            <div className="flex justify-between mt-4">
              <span className="text-sm text-gray-500">
                {getDeviceTypeName(device.deviceType)}
              </span>
              <span className="text-sm text-gray-500">
                Added: {new Date(device.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceList; 