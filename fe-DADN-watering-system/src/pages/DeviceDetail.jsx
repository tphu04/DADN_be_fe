import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const DeviceDetail = ({ id }) => {
  const [deviceData, setDeviceData] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/devices/${id}`);
        console.log('Device data:', response.data);
        setDeviceData(response.data);
        
        // Set latest data based on device type
        if (response.data.type === 'temperature_humidity') {
          setLatestData(response.data.temperatureHumidityData[0]);
        } else if (response.data.type === 'soil_moisture') {
          setLatestData(response.data.soilMoistureData[0]);
        } else if (response.data.type === 'pump') {
          setLatestData(response.data.pumpWaterData[0]);
        } else if (response.data.type === 'light') {
          setLatestData(response.data.lightData[0]);
        }

        // Set historical data based on device type
        if (response.data.type === 'temperature_humidity') {
          setHistoricalData(response.data.temperatureHumidityData);
        } else if (response.data.type === 'soil_moisture') {
          setHistoricalData(response.data.soilMoistureData);
        } else if (response.data.type === 'pump') {
          setHistoricalData(response.data.pumpWaterData);
        } else if (response.data.type === 'light') {
          setHistoricalData(response.data.lightData);
        }

        // Log để kiểm tra
        console.log('Historical data:', historicalData);
      } catch (err) {
        console.error('Error fetching device data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, [id]);

  const renderDeviceStatus = () => {
    if (!latestData) return null;

    switch (deviceData.type) {
      case 'temperature_humidity':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Temperature</h3>
              <p className="text-2xl">{latestData.temperature}°C</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Humidity</h3>
              <p className="text-2xl">{latestData.humidity}%</p>
            </div>
          </div>
        );
      case 'soil_moisture':
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Soil Moisture</h3>
            <p className="text-2xl">{latestData.moistureLevel}%</p>
          </div>
        );
      case 'pump':
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pump Status</h3>
            <p className="text-2xl">{latestData.pumpSpeed === 0 ? 'Off' : `Speed: ${latestData.pumpSpeed}%`}</p>
          </div>
        );
      case 'light':
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Light Status</h3>
            <p className="text-2xl">{latestData.status === 'On' ? 'On' : 'Off'}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderDataTable = () => {
    if (!historicalData.length) return null;

    const columns = {
      temperature_humidity: [
        { header: 'Time', accessor: 'readingTime' },
        { header: 'Temperature (°C)', accessor: 'temperature' },
        { header: 'Humidity (%)', accessor: 'humidity' }
      ],
      soil_moisture: [
        { header: 'Time', accessor: 'readingTime' },
        { header: 'Moisture Level (%)', accessor: 'moistureLevel' }
      ],
      pump: [
        { header: 'Time', accessor: 'readingTime' },
        { header: 'Pump Speed (%)', accessor: 'pumpSpeed' }
      ],
      light: [
        { header: 'Time', accessor: 'readingTime' },
        { header: 'Status', accessor: 'status' }
      ]
    };

    const deviceColumns = columns[deviceData.type] || [];

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {deviceData.type === 'light' ? 'Light Operation History' : 'Historical Data'}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                {deviceColumns.map((column) => (
                  <th key={column.accessor} className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {historicalData.map((data, index) => (
                <tr key={index}>
                  {deviceColumns.map((column) => (
                    <td key={column.accessor} className="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                      {column.accessor === 'readingTime' 
                        ? new Date(data[column.accessor]).toLocaleString()
                        : column.accessor === 'pumpSpeed'
                        ? data[column.accessor] === 0 ? 'Off' : `${data[column.accessor]}%`
                        : column.accessor === 'status'
                        ? data[column.accessor] === 'On' ? 'On' : 'Off'
                        : `${data[column.accessor]}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-500">Error: {error}</div>
      ) : deviceData ? (
        <div>
          <h1 className="text-2xl font-bold mb-6">{deviceData.name}</h1>
          {renderDeviceStatus()}
          {renderDataTable()}
        </div>
      ) : (
        <div className="text-center">No device data found</div>
      )}
    </div>
  );
};

export default DeviceDetail; 