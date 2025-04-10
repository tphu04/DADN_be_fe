require('dotenv').config();
const iotDeviceService = require('../src/services/iotDeviceService');
const { DeviceFactoryCreator } = require('../src/factory/DevicePatternFactory');

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
        
        // Test data cho thiết bị mới - máy bơm nước
        const deviceData = {
            deviceCode: "PumpWater_" + Date.now(),
            deviceType: "pump_water",
            description: "Máy bơm nước",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Máy bơm nước",
                    feedKey: "maybom",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        };

        console.log('Tạo thiết bị mới sử dụng Factory Pattern...');
        
        // Cách 1: Sử dụng trực tiếp Factory Pattern
        console.log('Phương pháp 1: Sử dụng Factory Pattern trực tiếp');
        const factory = DeviceFactoryCreator.getFactory(deviceData.deviceType);
        const device1 = await factory.createDevice(deviceData);
        console.log('Thiết bị đã được tạo thành công:', device1);
        
        // Cách 2: Sử dụng qua IoTDeviceService (đã được cập nhật để sử dụng Factory Pattern)
        console.log('Phương pháp 2: Sử dụng qua IoTDeviceService');
        const deviceData2 = {
            ...deviceData,
            deviceCode: "PumpWater_" + Date.now() // Đổi deviceCode để tránh trùng lặp
        };
        const device2 = await iotDeviceService.createDevice(deviceData2);
        console.log('Thiết bị đã được tạo thành công:', device2);

        // Đợi một khoảng thời gian để nhận dữ liệu MQTT
        console.log('Đợi nhận dữ liệu MQTT...');
        await new Promise(resolve => setTimeout(resolve, 20000)); // Đợi 20 giây

        // Lấy dữ liệu độ ẩm đất
        console.log('Lấy dữ liệu máy bơm nước...');
        const pumpWaterData = await iotDeviceService.getPumpWaterData(device2.id);
        console.log('Dữ liệu máy bơm nước:', pumpWaterData);

        // Xóa thiết bị test
        console.log('Dọn dẹp - xóa thiết bị test...');
        await iotDeviceService.deleteDevice(device1.id);
        await iotDeviceService.deleteDevice(device2.id);
        console.log('Thiết bị test đã được xóa thành công');

    } catch (error) {
        console.error('Test thất bại:', error);
    }
}

testIoTDevice()
// async function testdeleteDevice() {
//     await iotDeviceService.deleteDevice(3)
// }
// // Chạy test
// testdeleteDevice()