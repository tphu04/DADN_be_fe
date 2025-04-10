import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DeviceServices from '../../services/DeviceServices';
import { useSensorData } from '../../context/SensorContext';

const DeviceDetail = () => {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sử dụng SensorContext để có thể truy cập vào trạng thái socket và sensor data toàn cục
  const { socketConnected } = useSensorData();

  useEffect(() => {
    const fetchDeviceDetails = async () => {
      try {
        setLoading(true);
        console.log('DeviceDetail: Fetching device with ID:', deviceId);

        // Lấy thông tin thiết bị
        const deviceData = await DeviceServices.getDeviceById(deviceId);
        console.log('DeviceDetail: Device data received:', deviceData);

        if (deviceData.device) {
          // API trả về dữ liệu trong cấu trúc { device, latestData, historicalData }
          setDevice(deviceData.device);

          // Xử lý dữ liệu cảm biến từ dữ liệu lịch sử
          if (deviceData.device.deviceType === 'temperature_humidity') {
            console.log('DeviceDetail: Temperature humidity historical data:', deviceData.historicalData);
            setSensorData({
              temperatureHumidity: deviceData.historicalData || []
            });
          } else if (deviceData.device.deviceType === 'soil_moisture') {
            console.log('DeviceDetail: Soil moisture historical data:', deviceData.historicalData);
            setSensorData({
              soilMoisture: deviceData.historicalData || []
            });
          } else if (deviceData.device.deviceType === 'pump_water') {
            console.log('DeviceDetail: Pump water historical data:', deviceData.historicalData);
            setSensorData({
              pumpData: deviceData.historicalData || []
            });
          } else if (deviceData.device.deviceType === 'light') {
            try {
              const lightResponse = await DeviceServices.getLightData(deviceId);
              console.log('DeviceDetail: Light data response:', lightResponse);

              const lightData = lightResponse.data || lightResponse;
              console.log('DeviceDetail: Processed light data:', lightData);
              setSensorData({
                lightData: lightData
              });
            } catch (err) {
              console.error('DeviceDetail: Error fetching light data:', err);
              setSensorData({
                lightData: []
              });
            }
          }
        } else {
          // Direct data structure (fallback if API doesn't return the expected format)
          setDevice(deviceData);

          // Lấy dữ liệu cảm biến bất kể trạng thái thiết bị
          if (deviceData.deviceType === 'temperature_humidity') {
            try {
              const tempHumidResponse = await DeviceServices.getTemperatureHumidityData(deviceId);
              console.log('DeviceDetail: Temperature humidity data response:', tempHumidResponse);

              // Check if the response contains a data property
              const tempHumidData = tempHumidResponse.data || tempHumidResponse;
              setSensorData({
                temperatureHumidity: tempHumidData
              });
            } catch (err) {
              console.error('DeviceDetail: Error fetching temperature humidity data:', err);
              setSensorData({
                temperatureHumidity: []
              });
            }
          } else if (deviceData.deviceType === 'soil_moisture') {
            try {
              const soilResponse = await DeviceServices.getSoilMoistureData(deviceId);
              console.log('DeviceDetail: Soil moisture data response:', soilResponse);

              const soilData = soilResponse.data || soilResponse;
              setSensorData({
                soilMoisture: soilData
              });
            } catch (err) {
              console.error('DeviceDetail: Error fetching soil moisture data:', err);
              setSensorData({
                soilMoisture: []
              });
            }
          } else if (deviceData.deviceType === 'pump_water') {
            try {
              const pumpResponse = await DeviceServices.getPumpWaterData(deviceId);
              console.log('DeviceDetail: Pump water data response:', pumpResponse);

              const pumpData = pumpResponse.data || pumpResponse;
              setSensorData({
                pumpData: pumpData
              });
            } catch (err) {
              console.error('DeviceDetail: Error fetching pump data:', err);
              setSensorData({
                pumpData: []
              });
            }
          } else if (deviceData.deviceType === 'light') {
            try {
              const lightResponse = await DeviceServices.getLightData(deviceId);
              console.log('DeviceDetail: Light data response:', lightResponse);

              const lightData = lightResponse.data || lightResponse;
              console.log('DeviceDetail: Processed light data:', lightData);
              setSensorData({
                lightData: lightData
              });
            } catch (err) {
              console.error('DeviceDetail: Error fetching light data:', err);
              setSensorData({
                lightData: []
              });
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('DeviceDetail: Error fetching device details:', error);
        setError('Failed to load device details: ' + (error.message || 'Unknown error'));
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
      case 'light':
        return 'Light';
      default:
        return deviceType;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-500 text-white';

    switch (status.toLowerCase()) {
      case 'On':
      case 'active':
        return 'bg-green-500 text-white';
      case 'Off':
      case 'inactive':
        return 'bg-red-500 text-white';
      case 'maintenance':
        return 'bg-yellow-500 text-white';
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
      {/* Socket connection status */}
      {/* <div className={`p-2 text-xs rounded mb-4 ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        <span className="font-medium">WebSocket:</span> {socketConnected ? 'Connected' : 'Disconnected'} 
      </div> */}

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
                    {(device.status === 'On' || device.status === 'active') && sensorData?.temperatureHumidity?.[0]?.temperature !== undefined ?
                      `${sensorData.temperatureHumidity[0].temperature}°C` : '0°C'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Humidity</h4>
                  <span className="text-3xl font-bold text-green-600">
                    {(device.status === 'On' || device.status === 'active') && sensorData?.temperatureHumidity?.[0]?.humidity !== undefined ?
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
                  {(device.status === 'On' || device.status === 'active') && sensorData?.soilMoisture?.[0]?.moistureValue !== undefined ?
                    `${sensorData.soilMoisture[0].moistureValue}%` : '0%'}
                </span>
              </div>
            </div>
          )}

          {device.deviceType === 'pump_water' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Pump Status</h4>
                  <span className="text-3xl font-bold text-blue-600">
                    {(device.status === 'On' || device.status === 'active') && sensorData?.pumpData?.[0]?.status ?
                      sensorData.pumpData[0].status : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Pump Speed</h4>
                  <span className="text-3xl font-bold text-green-600">
                    {(device.status === 'On' || device.status === 'active') && sensorData?.pumpData?.[0]?.pumpSpeed !== undefined ?
                      `${sensorData.pumpData[0].pumpSpeed}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {device.deviceType === 'light' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Light Status</h4>
                  <span className="text-3xl font-bold text-blue-600">
                    {(device.status === 'On' || device.status === 'active') && sensorData?.lightData?.[0]?.status ?
                      sensorData.lightData[0].status : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Light Intensity</h4>
                  <span className="text-3xl font-bold text-yellow-500">
                    {(device.status === 'On' || device.status === 'active') && sensorData?.lightData?.[0]?.brightness !== undefined ?
                      `${sensorData.lightData[0].brightness}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Light Data Section */}
      {sensorData && device.deviceType === 'light' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Light Data</h3>
          {console.log('DeviceDetail: Rendering light section, sensorData:', sensorData)}
          {console.log('DeviceDetail: Light data in sensorData:', sensorData.lightData)}
          {console.log('DeviceDetail: Light data length:', sensorData.lightData?.length)}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="font-bold mb-3">Light Operation History</h4>
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
                      Brightness
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sensorData.lightData && sensorData.lightData.length > 0 ? (
                    sensorData.lightData.slice(0, 5).map((data, index) => {
                      console.log('DeviceDetail: Rendering light data row:', data);
                      return (
                        <tr key={index}>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {data.readingTime ? new Date(data.readingTime).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {data.status || 'N/A'}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {data.brightness !== undefined ? `${data.brightness}%` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 px-4 text-center text-gray-500">
                        No light operation history available. Device may be inactive or data hasn't been received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Temperature & Humidity Data Section */}
      {sensorData && device?.deviceType === 'temperature_humidity' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Sensor Data</h3>

          {/* Temperature & Humidity Data */}
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
                  {sensorData.temperatureHumidity && sensorData.temperatureHumidity.length > 0 ? (
                    sensorData.temperatureHumidity.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.readingTime ? new Date(data.readingTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.temperature || 'N/A'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.humidity || 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 px-4 text-center text-gray-500">
                        No temperature & humidity data available. Device may be inactive or data hasn't been received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Soil Moisture Data */}
      {sensorData && device.deviceType === 'soil_moisture' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Sensor Data</h3>

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
                  {sensorData.soilMoisture && sensorData.soilMoisture.length > 0 ? (
                    sensorData.soilMoisture.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.readingTime ? new Date(data.readingTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.moistureValue !== undefined ? data.moistureValue : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="py-4 px-4 text-center text-gray-500">
                        No soil moisture data available. Device may be inactive or data hasn't been received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pump Data Section */}
      {sensorData && device.deviceType === 'pump_water' && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Pump Data</h3>

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
                  {sensorData.pumpData && sensorData.pumpData.length > 0 ? (
                    sensorData.pumpData.slice(0, 5).map((data, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.readingTime ? new Date(data.readingTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.status || 'N/A'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {data.pumpSpeed !== undefined ? `${data.pumpSpeed}%` : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 px-4 text-center text-gray-500">
                        No pump operation history available. Device may be inactive or data hasn't been received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDetail; 