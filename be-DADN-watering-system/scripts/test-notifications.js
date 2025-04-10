require('dotenv').config();
const prisma = require('../config/database');
const notificationService = require('../src/services/notificationService');

/**
 * Script test các loại thông báo
 */
async function testNotifications() {
    try {
        console.log('===== BẮT ĐẦU TEST THÔNG BÁO =====\n');
        
        // Lấy danh sách thiết bị từ database
        const devices = await prisma.ioTDevice.findMany({
            include: { feeds: true }
        });
        
        if (devices.length === 0) {
            console.log('Không tìm thấy thiết bị nào trong database.');
            return;
        }
        
        console.log(`Tìm thấy ${devices.length} thiết bị trong database.`);
        
        // Chọn một thiết bị cho mỗi loại để test
        const tempHumidDevice = devices.find(d => d.deviceType === 'temperature_humidity');
        const soilDevice = devices.find(d => d.deviceType === 'soil_moisture');
        const pumpDevice = devices.find(d => d.deviceType === 'pump_water');
        
        // 1. Test thông báo kết nối
        console.log('\n1. Test thông báo kết nối:');
        
        if (tempHumidDevice) {
            console.log(`Tạo thông báo kết nối cho thiết bị ${tempHumidDevice.deviceCode}`);
            await notificationService.createConnectionNotification(tempHumidDevice, true);
            console.log(`Tạo thông báo ngắt kết nối cho thiết bị ${tempHumidDevice.deviceCode}`);
            await notificationService.createConnectionNotification(tempHumidDevice, false);
        } else {
            console.log('Không tìm thấy thiết bị nhiệt độ/độ ẩm để test thông báo kết nối.');
        }
        
        // 2. Test thông báo ngưỡng
        console.log('\n2. Test thông báo ngưỡng:');
        
        if (tempHumidDevice && tempHumidDevice.feeds.length > 0) {
            const tempFeed = tempHumidDevice.feeds.find(f => f.name.includes('Nhiệt độ') || f.feedKey.includes('nhietdo'));
            
            if (tempFeed && tempFeed.maxValue) {
                console.log(`Tạo thông báo vượt ngưỡng nhiệt độ cho thiết bị ${tempHumidDevice.deviceCode}`);
                const highTemp = tempFeed.maxValue + 5;
                await notificationService.createThresholdNotification(tempHumidDevice, tempFeed, highTemp, true);
            }
            
            const humidityFeed = tempHumidDevice.feeds.find(f => f.name.includes('Độ ẩm') || f.feedKey.includes('doam'));
            
            if (humidityFeed && humidityFeed.minValue) {
                console.log(`Tạo thông báo dưới ngưỡng độ ẩm cho thiết bị ${tempHumidDevice.deviceCode}`);
                const lowHumidity = humidityFeed.minValue - 5;
                await notificationService.createThresholdNotification(tempHumidDevice, humidityFeed, lowHumidity, false);
            }
        } else if (soilDevice && soilDevice.feeds.length > 0) {
            const soilFeed = soilDevice.feeds[0];
            
            if (soilFeed && soilFeed.minValue) {
                console.log(`Tạo thông báo dưới ngưỡng độ ẩm đất cho thiết bị ${soilDevice.deviceCode}`);
                const lowSoil = soilFeed.minValue - 10;
                await notificationService.createThresholdNotification(soilDevice, soilFeed, lowSoil, false);
            }
        } else {
            console.log('Không tìm thấy thiết bị với feed phù hợp để test thông báo ngưỡng.');
        }
        
        // 3. Test thông báo máy bơm
        console.log('\n3. Test thông báo máy bơm:');
        
        if (pumpDevice) {
            console.log(`Tạo thông báo BẬT máy bơm cho thiết bị ${pumpDevice.deviceCode}`);
            await notificationService.createPumpNotification(pumpDevice, true, 80);
            
            console.log(`Tạo thông báo TẮT máy bơm cho thiết bị ${pumpDevice.deviceCode}`);
            await notificationService.createPumpNotification(pumpDevice, false);
        } else {
            console.log('Không tìm thấy thiết bị máy bơm để test thông báo.');
        }
        
        // 4. Test thông báo cập nhật thiết bị
        console.log('\n4. Test thông báo cập nhật thiết bị:');
        
        if (tempHumidDevice) {
            console.log(`Tạo thông báo cập nhật cho thiết bị ${tempHumidDevice.deviceCode}`);
            await notificationService.createUpdateNotification(tempHumidDevice, {
                name: 'Thiết bị nhiệt độ và độ ẩm chính',
                location: 'Phòng khách',
                firmware: 'v2.1.0'
            });
        } else {
            console.log('Không tìm thấy thiết bị để test thông báo cập nhật.');
        }
        
        // 5. Test thông báo tùy chỉnh
        console.log('\n5. Test thông báo tùy chỉnh:');
        
        if (devices.length > 0) {
            const device = devices[0];
            console.log(`Tạo thông báo test cho thiết bị ${device.deviceCode}`);
            await notificationService.createTestNotification(
                device,
                `Đây là thông báo test cho thiết bị ${device.deviceCode}`,
                'test_value_123'
            );
        }
        
        // Kiểm tra thông báo đã tạo
        console.log('\nKiểm tra thông báo đã tạo:');
        const notifications = await prisma.notification.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: { device: true }
        });
        
        console.log(`Đã tìm thấy ${notifications.length} thông báo mới nhất:`);
        notifications.forEach((notification, index) => {
            console.log(`${index + 1}. [${notification.type}] ${notification.message} (${notification.timestamp})`);
        });
        
        console.log('\n===== KẾT THÚC TEST THÔNG BÁO =====');
    } catch (error) {
        console.error('Lỗi khi test thông báo:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Chạy script
testNotifications(); 