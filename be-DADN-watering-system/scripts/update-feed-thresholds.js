require('dotenv').config();
const prisma = require('../config/database');

/**
 * Script cập nhật ngưỡng cho các feeds
 */
async function updateFeedThresholds() {
    try {
        console.log('===== BẮT ĐẦU CẬP NHẬT NGƯỠNG CHO FEEDS =====\n');
        
        // Lấy danh sách feeds từ database
        const feeds = await prisma.feed.findMany({
            include: { device: true }
        });
        
        if (feeds.length === 0) {
            console.log('Không tìm thấy feed nào trong database.');
            return;
        }
        
        console.log(`Tìm thấy ${feeds.length} feeds trong database.`);
        
        for (const feed of feeds) {
            console.log(`\nĐang cập nhật ngưỡng cho feed ${feed.name} (${feed.feedKey}) của thiết bị ${feed.device.deviceCode}:`);
            
            let minValue = null;
            let maxValue = null;
            
            // Thiết lập ngưỡng dựa vào loại feed
            if (feed.feedKey.includes('nhietdo') || feed.feedKey.includes('temp')) {
                // Nhiệt độ: 15°C - 35°C
                minValue = 15;
                maxValue = 35;
                console.log(`Thiết lập ngưỡng nhiệt độ: ${minValue}°C - ${maxValue}°C`);
            }
            else if (feed.feedKey.includes('doam') && !feed.feedKey.includes('dat')) {
                // Độ ẩm không khí: 30% - 70%
                minValue = 30;
                maxValue = 70;
                console.log(`Thiết lập ngưỡng độ ẩm không khí: ${minValue}% - ${maxValue}%`);
            }
            else if (feed.feedKey.includes('dat') || feed.feedKey.includes('soil')) {
                // Độ ẩm đất: 20% - 60%
                minValue = 20;
                maxValue = 60;
                console.log(`Thiết lập ngưỡng độ ẩm đất: ${minValue}% - ${maxValue}%`);
            }
            else if (feed.feedKey.includes('bom') || feed.feedKey.includes('pump')) {
                // Máy bơm: 0% - 100%
                minValue = 0;
                maxValue = 100;
                console.log(`Thiết lập ngưỡng máy bơm: ${minValue}% - ${maxValue}%`);
            }
            
            // Cập nhật ngưỡng cho feed
            await prisma.feed.update({
                where: { id: feed.id },
                data: {
                    minValue,
                    maxValue
                }
            });
            
            console.log(`✅ Đã cập nhật ngưỡng cho feed ${feed.name}`);
        }
        
        // Hiển thị thông tin sau khi cập nhật
        console.log('\n===== THÔNG TIN SAU KHI CẬP NHẬT =====');
        
        const updatedFeeds = await prisma.feed.findMany({
            include: { device: true }
        });
        
        for (const feed of updatedFeeds) {
            console.log(`Feed: ${feed.name} (${feed.feedKey}) của thiết bị ${feed.device.deviceCode}`);
            console.log(`  - Ngưỡng tối thiểu: ${feed.minValue === null ? 'Không có' : feed.minValue}`);
            console.log(`  - Ngưỡng tối đa: ${feed.maxValue === null ? 'Không có' : feed.maxValue}`);
        }
        
        console.log('\n===== HOÀN THÀNH CẬP NHẬT =====');
    } catch (error) {
        console.error('Lỗi khi cập nhật ngưỡng cho feeds:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Chạy script
updateFeedThresholds(); 