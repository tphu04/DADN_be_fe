require('dotenv').config();
const prisma = require('../config/database');

/**
 * Script sửa cấu hình feeds cho thiết bị
 */
async function fixDeviceFeeds() {
    try {
        console.log('===== BẮT ĐẦU SỬA CẤU HÌNH FEEDS CHO THIẾT BỊ =====\n');
        
        // Lấy danh sách thiết bị từ database
        const devices = await prisma.ioTDevice.findMany({
            include: { feeds: true }
        });
        
        if (devices.length === 0) {
            console.log('Không tìm thấy thiết bị nào trong database.');
            return;
        }
        
        console.log(`Tìm thấy ${devices.length} thiết bị trong database.`);
        
        // Cập nhật từng thiết bị
        for (const device of devices) {
            console.log(`\nĐang cập nhật thiết bị: ${device.deviceCode} (${device.deviceType})`);
            
            // Xóa tất cả feeds hiện tại
            if (device.feeds && device.feeds.length > 0) {
                console.log(`Xóa ${device.feeds.length} feeds hiện tại...`);
                
                await prisma.feed.deleteMany({
                    where: { deviceId: device.id }
                });
            }
            
            // Thêm feeds mới dựa vào loại thiết bị và định dạng topic trong .env
            const newFeeds = [];
            
            if (device.deviceType === 'temperature_humidity') {
                newFeeds.push(
                    {
                        name: "Nhiệt độ",
                        feedKey: "dht20-nhietdo",
                        minValue: -10,
                        maxValue: 100,
                        deviceId: device.id
                    },
                    {
                        name: "Độ ẩm",
                        feedKey: "dht20-doam",
                        minValue: 0,
                        maxValue: 100,
                        deviceId: device.id
                    }
                );
            }
            else if (device.deviceType === 'soil_moisture') {
                newFeeds.push({
                    name: "Độ ẩm đất",
                    feedKey: "doamdat",
                    minValue: 0,
                    maxValue: 100,
                    deviceId: device.id
                });
            }
            else if (device.deviceType === 'pump_water') {
                newFeeds.push({
                    name: "Máy bơm",
                    feedKey: "maybom",
                    minValue: 0,
                    maxValue: 100,
                    deviceId: device.id
                });
            }
            
            // Tạo các feeds mới
            if (newFeeds.length > 0) {
                console.log(`Thêm ${newFeeds.length} feeds mới...`);
                
                for (const feed of newFeeds) {
                    await prisma.feed.create({
                        data: feed
                    });
                }
            }
            
            // Cập nhật thiết bị
            await prisma.ioTDevice.update({
                where: { id: device.id },
                data: {
                    isOnline: true,
                    lastSeen: new Date(),
                    lastSeenAt: new Date()
                }
            });
            
            console.log(`Đã cập nhật thành công thiết bị ${device.deviceCode}!`);
        }
        
        // Hiển thị thông tin sau khi cập nhật
        console.log('\n===== THÔNG TIN SAU KHI CẬP NHẬT =====');
        
        const updatedDevices = await prisma.ioTDevice.findMany({
            include: { feeds: true }
        });
        
        for (const device of updatedDevices) {
            console.log(`\nThiết bị ID ${device.id}:`);
            console.log(`Mã thiết bị: ${device.deviceCode}`);
            console.log(`Loại thiết bị: ${device.deviceType}`);
            
            if (device.feeds && device.feeds.length > 0) {
                console.log(`Feeds (${device.feeds.length}):`);
                device.feeds.forEach((feed, index) => {
                    console.log(`  ${index + 1}. ${feed.name} (${feed.feedKey})`);
                });
            } else {
                console.log('Thiết bị không có feeds.');
            }
        }
        
        console.log('\n===== HOÀN THÀNH CẬP NHẬT =====');
    } catch (error) {
        console.error('Lỗi khi cập nhật feeds cho thiết bị:', error);
    }
}

// Chạy script
fixDeviceFeeds(); 