require('dotenv').config();
const prisma = require('../config/database');

async function insertTestData() {
    try {
        // Lấy thiết bị đầu tiên trong database
        const device = await prisma.ioTDevice.findFirst();
        
        if (!device) {
            console.error("Không có thiết bị nào trong database");
            return;
        }
        
        console.log("Đang sử dụng thiết bị:", device);
        
        // Tạo user và notification nếu cần
        let notification = await prisma.notification.findFirst();
        
        if (!notification) {
            // Tạo user trước
            let user = await prisma.user.findFirst();
            
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        fullname: "Test User",
                        username: "testuser",
                        password: "password123",
                        email: "test@example.com",
                        phone: "0123456789",
                        address: "Test Address"
                    }
                });
                console.log("Đã tạo user mới:", user);
            }
            
            // Tạo notification
            notification = await prisma.notification.create({
                data: {
                    message: "Test notification",
                    type: "info",
                    userId: user.id
                }
            });
            console.log("Đã tạo notification mới:", notification);
        }
        
        // Thêm dữ liệu vào bảng temperatureHumidityData
        const temperature = (20 + Math.random() * 10).toFixed(1);
        const humidity = (40 + Math.random() * 30).toFixed(1);
        
        const tempHumidData = await prisma.temperatureHumidityData.create({
            data: {
                temperature: parseFloat(temperature),
                humidity: parseFloat(humidity),
                deviceId: device.id
            }
        });
        
        console.log("Đã thêm dữ liệu nhiệt độ và độ ẩm:", tempHumidData);
        
        // Thêm log
        const log = await prisma.logData.create({
            data: {
                value: `Test data: Temperature=${temperature}°C, Humidity=${humidity}%`,
                deviceId: device.id,
                notificationId: notification.id
            }
        });
        
        console.log("Đã thêm log:", log);
        
        // Kiểm tra lại dữ liệu
        const allTempData = await prisma.temperatureHumidityData.findMany({
            orderBy: {
                readingTime: 'desc'
            }
        });
        
        console.log("Tất cả dữ liệu nhiệt độ và độ ẩm:", allTempData);
        
    } catch (error) {
        console.error("Lỗi khi thêm dữ liệu test:", error);
    } finally {
        await prisma.$disconnect();
    }
}

insertTestData().catch(console.error);
