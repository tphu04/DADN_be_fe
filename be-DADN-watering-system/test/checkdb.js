// Tạo file test/checkDatabase.js
require('dotenv').config();
const prisma = require('../config/database');

async function checkDatabase() {
    try {
        // Kiểm tra thiết bị
        const devices = await prisma.ioTDevice.findMany();
        console.log("Devices in database:", devices);
        
        // Kiểm tra dữ liệu nhiệt độ và độ ẩm
        const tempHumidData = await prisma.temperatureHumidityData.findMany({
            take: 10,
            orderBy: {
                readingTime: 'desc'
            }
        });
        
        console.log("Latest temperature and humidity data:", tempHumidData);
        
        // Kiểm tra log
        const logs = await prisma.logData.findMany({
            take: 10,
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        console.log("Latest logs:", logs);
    } catch (error) {
        console.error("Error checking database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase().catch(console.error);