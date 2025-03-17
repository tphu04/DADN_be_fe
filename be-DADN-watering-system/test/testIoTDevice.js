require('dotenv').config();
const iotDeviceService = require('../src/services/iotDeviceService');

async function createNotificationForTest() {
    const prisma = require('../config/database');
    
    try {
        // Kiểm tra xem đã có notification với ID 1 chưa
        const existingNotification = await prisma.notification.findUnique({
            where: { id: 1 }
        });
        
        if (!existingNotification) {
            // Tạo user trước
            let testUser = await prisma.user.findFirst();
            
            if (!testUser) {
                testUser = await prisma.user.create({
                    data: {
                        fullname: "Test User",
                        username: "testuser",
                        password: "password123",
                        email: "test@example.com",
                        phone: "0123456789",
                        address: "Test Address"
                    }
                });
            }
            
            // Tạo notification với ID 1
            await prisma.notification.create({
                data: {
                    id: 1,
                    message: "Test notification for MQTT",
                    type: "info",
                    userId: testUser.id
                }
            });
            
            console.log("Created test notification");
        }
    } catch (error) {
        console.error("Error creating test notification:", error);
    }
}

async function testIoTDevice() {
    try {
        // Tạo notification để test
        await createNotificationForTest();
        
        // Test data cho thiết bị mới - cảm biến đo độ ẩm đất
        
        const newDevice = {
            deviceCode: "SoilMoistureSensor_" + Date.now(),
            deviceType: "soil_moisture",
            description: "Cảm biến đo độ ẩm đất",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Độ ẩm đất",
                    feedKey: "doamdat",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        };


        

        console.log('Tạo thiết bị mới...');
        const device = await iotDeviceService.createDevice(newDevice);
        console.log('Thiết bị đã được tạo thành công:', device);

        // Đợi một khoảng thời gian để nhận dữ liệu MQTT
        console.log('Đợi nhận dữ liệu MQTT...');
        await new Promise(resolve => setTimeout(resolve, 20000)); // Đợi 20 giây

        // Lấy dữ liệu độ ẩm đất
        console.log('Lấy dữ liệu độ ẩm đất...');
        const soilMoistureData = await iotDeviceService.getSoilMoistureData(device.id);
        console.log('Dữ liệu độ ẩm đất:', soilMoistureData);

        // Xóa thiết bị test
        // console.log('Dọn dẹp - xóa thiết bị test...');
        // await iotDeviceService.deleteDevice(device.id);
        // console.log('Thiết bị test đã được xóa thành công');

    } catch (error) {
        console.error('Test thất bại:', error);
    }
}


async function testdeleteDevice() {
    await iotDeviceService.deleteDevice(3)
}
// Chạy test
testdeleteDevice()