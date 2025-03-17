import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DeviceServices from '../../services/DeviceServices';

const DeviceDetail = () => {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeviceDetails = async () => {
      try {
        setLoading(true);
        // Lấy thông tin thiết bị
        const deviceData = await DeviceServices.getDeviceById(deviceId);
        setDevice(deviceData);

        // Lấy dữ liệu cảm biến tùy theo loại thiết bị
        // Chỉ lấy dữ liệu nếu thiết bị đang hoạt động (status = On)
        if (deviceData.status === 'On') {
          if (deviceData.deviceType === 'temperature_humidity') {
            // Lấy dữ liệu nhiệt độ và độ ẩm
            const tempHumidData = await DeviceServices.getTemperatureHumidityData(deviceId);
            setSensorData({
              temperatureHumidity: tempHumidData
            });
          } else if (deviceData.deviceType === 'soil_moisture') {
            // Lấy dữ liệu độ ẩm đất
            const soilData = await DeviceServices.getSoilMoistureData(deviceId);
            setSensorData({
              soilMoisture: soilData
            });
          } else if (deviceData.deviceType === 'pump_water') {
            // Lấy dữ liệu của máy bơm
            const pumpData = await DeviceServices.getPumpWaterData(deviceId);
            setSensorData({
              pumpData: pumpData
            });
          }
        } else {
          // Thiết bị không hoạt động, tạo dữ liệu trống hoặc 0
          if (deviceData.deviceType === 'temperature_humidity') {
            setSensorData({
              temperatureHumidity: []
            });
          } else if (deviceData.deviceType === 'soil_moisture') {
            setSensorData({
              soilMoisture: []
            });
          } else if (deviceData.deviceType === 'pump_water') {
            setSensorData({
              pumpData: []
            });
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching device details:', error);
        setError('Failed to load device details');
        setLoading(false);
      }
    };

    fetchDeviceDetails();
  }, [deviceId]);

  const getDeviceTypeName = (deviceType) => {
    switch (deviceType) {
      case 'temperature_humidity':
        return 'Temperature & Humidity Sensor';
      case 'soil_moisture':
        return 'Soil Moisture Sensor';
      case 'pump_water':
        return 'Water Pump';
      default:
        return deviceType;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-500 text-white';
    
    switch (status) {
      case 'On':
        return 'bg-green-500 text-white';
      case 'Off':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center">Loading device details...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!device) {
    return <div className="p-6">Device not found</div>;
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{device.deviceCode || 'Unnamed Device'}</h2>
          <span 
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(device.status)}`}
          >
            {device.status || 'Unknown'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-500">Device Type</p>
            <p className="font-semibold">{getDeviceTypeName(device.deviceType)}</p>
          </div>
          <div>
            <p className="text-gray-500">Description</p>
            <p className="font-semibold">{device.description || 'No description'}</p>
          </div>
          <div>
            <p className="text-gray-500">Created At</p>
            <p className="font-semibold">{new Date(device.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Latest Data */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">Latest Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {device.deviceType === 'temperature_humidity' && (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Temperature</h4>
                  <span className="text-3xl font-bold text-blue-600">
                    {device.status === 'On' && sensorData?.temperatureHumidity?.[0]?.temperature ? 
                      `${sensorData.temperatureHumidity[0].temperature}°C` : '0°C'}
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Humidity</h4>
                  <span className="text-3xl font-bold text-green-600">
                    {device.status === 'On' && sensorData?.temperatureHumidity?.[0]?.humidity ? 
                      `${sensorData.temperatureHumidity[0].humidity}%` : '0%'}
                  </span>
                </div>
              </div>
            </>
          )}
          
          {device.deviceType === 'soil_moisture' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                <h4 className="font-bold">Soil Moisture</h4>
                <span className="text-3xl font-bold text-green-600">
                  {device.status === 'On' && sensorData?.soilMoisture?.[0]?.moistureValue ? 
                    `${sensorData.soilMoisture[0].moistureValue}%` : '0%'}
                </span>
              </div>
            </div>
          )}
          
          {device.deviceType === 'pump_water' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                <h4 className="font-bold">Pump Status</h4>
                <span className="text-3xl font-bold text-blue-600">
                  {device.status === 'On' && sensorData?.pumpData?.[0]?.status ? 
                    sensorData.pumpData[0].status : 'Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Temperature & Humidity Data Section */}
      {sensorData && device.deviceType === 'temperature_humidity' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Sensor Data</h3>
          
          {/* Temperature & Humidity Data */}
          {sensorData.temperatureHumidity && sensorData.temperatureHumidity.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h4 className="font-bold mb-3">Temperature & Humidity</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Temperature (°C)
                      </th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Humidity (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorData.temperatureHumidity.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {new Date(data.readingTime).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.temperature}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.humidity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sensorData.temperatureHumidity && sensorData.temperatureHumidity.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p>No temperature & humidity data available.</p>
            </div>
          )}
        </div>
      )}

      {/* Soil Moisture Data */}
      {sensorData && device.deviceType === 'soil_moisture' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Sensor Data</h3>
          
          {sensorData.soilMoisture && sensorData.soilMoisture.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-bold mb-3">Soil Moisture</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Moisture Value (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorData.soilMoisture.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {new Date(data.readingTime).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.moistureValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sensorData.soilMoisture && sensorData.soilMoisture.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p>No soil moisture data available.</p>
            </div>
          )}
        </div>
      )}

      {/* Pump Data Section */}
      {sensorData && device.deviceType === 'pump_water' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Pump Data</h3>
          
          {sensorData.pumpData && sensorData.pumpData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-bold mb-3">Pump Operation History</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pump Speed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorData.pumpData.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {new Date(data.readingTime).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.status}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.pumpSpeed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sensorData.pumpData && sensorData.pumpData.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p>No pump operation history available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeviceDetail; 