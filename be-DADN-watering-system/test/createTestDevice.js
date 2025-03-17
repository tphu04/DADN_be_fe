require('dotenv').config();
const prisma = require('../config/database');

/**
 * Script này tạo một thiết bị test với các feed tương ứng để chuẩn bị cho việc test MQTT
 */

async function createTestUser() {
    try {
        // Kiểm tra xem đã có user test chưa
        let testUser = await prisma.user.findFirst({
            where: {
                username: 'testuser'
            }
        });

        if (!testUser) {
            testUser = await prisma.user.create({
                data: {
                    fullname: 'Test User',
                    username: 'testuser',
                    password: 'testpassword',
                    email: 'test@example.com',
                    phone: '0123456789',
                    address: 'Test Address'
                }
            });
            console.log('Đã tạo user test:', testUser);
        } else {
            console.log('Đã tìm thấy user test:', testUser);
        }

        return testUser;
    } catch (error) {
        console.error('Lỗi khi tạo user test:', error);
        throw error;
    }
}

async function createTestNotification(userId) {
    try {
        // Kiểm tra xem đã có notification test chưa
        let testNotification = await prisma.notification.findFirst();

        if (!testNotification) {
            testNotification = await prisma.notification.create({
                data: {
                    message: 'Test Notification',
                    type: 'info',
                    userId: userId
                }
            });
            console.log('Đã tạo notification test:', testNotification);
        } else {
            console.log('Đã tìm thấy notification test:', testNotification);
        }

        return testNotification;
    } catch (error) {
        console.error('Lỗi khi tạo notification test:', error);
        throw error;
    }
}

async function createTestDevice() {
    try {
        // 1. Tạo user test
        const testUser = await createTestUser();
        
        // 2. Tạo notification test
        const testNotification = await createTestNotification(testUser.id);
        
        // 3. Kiểm tra xem đã có thiết bị test chưa
        let testDevice = await prisma.ioTDevice.findFirst({
            where: {
                deviceCode: 'TEST_DEVICE_' + Date.now()
            },
            include: {
                feeds: true
            }
        });

        // 4. Tạo thiết bị mới nếu chưa tìm thấy
        if (!testDevice) {
            const deviceCode = 'TemperatureHumiditySensor_' + Date.now();
            
            // Chọn loại thiết bị (temperature_humidity, soil_moisture, pump_water)
            const deviceType = 'temperature_humidity';
            
            testDevice = await prisma.ioTDevice.create({
                data: {
                    deviceCode: deviceCode,
                    deviceType: deviceType,
                    status: 'On',
                    description: 'Thiết bị đo nhiệt độ và độ ẩm',
                    mqttUsername: process.env.MQTT_USERNAME,
                    mqttApiKey: process.env.MQTT_API_KEY,
                    isOnline: false,
                    feeds: {
                        create: [
                            // Các feed phụ thuộc vào loại thiết bị
                            {
                                name: 'Nhiệt độ',
                                feedKey: 'dht20-nhietdo',
                                minValue: 0,
                                maxValue: 50
                            },
                            {
                                name: 'Độ ẩm không khí',
                                feedKey: 'dht20-doam',
                                minValue: 0,
                                maxValue: 100
                            }
                        ]
                    },
                    // Tạo một configuration để liên kết thiết bị với user
                    configurations: {
                        create: [
                            {
                                value: 'default',
                                userId: testUser.id
                            }
                        ]
                    }
                },
                include: {
                    feeds: true,
                    configurations: true
                }
            });
            
            console.log('Đã tạo thiết bị test:', testDevice);
        } else {
            console.log('Đã tìm thấy thiết bị test:', testDevice);
        }

        return testDevice;
    } catch (error) {
        console.error('Lỗi khi tạo thiết bị test:', error);
        throw error;
    }
}

// Chạy script
createTestDevice()
    .then(device => {
        console.log('Thiết bị test đã được tạo thành công:', device.deviceCode);
        process.exit(0);
    })
    .catch(error => {
        console.error('Lỗi:', error);
        process.exit(1);
    }); 