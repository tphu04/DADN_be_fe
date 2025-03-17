require('dotenv').config();
const axios = require('axios');

const API_URL = `http://localhost:${process.env.PORT}/api`;

async function testAPI() {
    try {
        // Test device creation
        console.log('Testing device creation...');
        const newDevice = {
            name: "API Test DHT20 Device",
            description: "Device for API testing",
            status: "ACTIVE",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Temperature",
                    feedKey: "dht20-nhietdo",
                    unit: "°C",
                    minValue: 0,
                    maxValue: 50
                },
                {
                    name: "Humidity",
                    feedKey: "dht20-doam",
                    unit: "%",
                    minValue: 0,
                    maxValue: 100
                },
                {
                    name: "Soil Moisture",
                    feedKey: "doamdat",
                    unit: "%",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        };

        const createResponse = await axios.post(`${API_URL}/devices`, newDevice);
        console.log('Device created:', createResponse.data);
        const deviceId = createResponse.data.id;

        // Test get all devices
        console.log('\nTesting get all devices...');
        const getAllResponse = await axios.get(`${API_URL}/devices`);
        console.log('All devices:', getAllResponse.data);

        // Test get single device
        console.log('\nTesting get single device...');
        const getOneResponse = await axios.get(`${API_URL}/devices/${deviceId}`);
        console.log('Single device:', getOneResponse.data);

        // Test update device
        console.log('\nTesting device update...');
        const updateData = {
            name: "Updated Test Device",
            description: "Updated description"
        };
        const updateResponse = await axios.put(`${API_URL}/devices/${deviceId}`, updateData);
        console.log('Updated device:', updateResponse.data);

        // Wait for some MQTT data
        console.log('\nWaiting for MQTT data (30 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Test get sensor data
        console.log('\nTesting get sensor data...');
        const sensorDataResponse = await axios.get(`${API_URL}/devices/${deviceId}/sensor-data`);
        console.log('Sensor data:', sensorDataResponse.data);

        // Test get abnormal readings
        console.log('\nTesting get abnormal readings...');
        const abnormalResponse = await axios.get(`${API_URL}/devices/${deviceId}/abnormal`);
        console.log('Abnormal readings:', abnormalResponse.data);

        // Test device deletion
        console.log('\nTesting device deletion...');
        const deleteResponse = await axios.delete(`${API_URL}/devices/${deviceId}`);
        console.log('Device deleted:', deleteResponse.status === 204 ? 'Success' : 'Failed');

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

// Run the tests
testAPI(); 