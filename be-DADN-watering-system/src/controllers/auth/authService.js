const prisma = require('../../../config/database');
// const bcrypt = require('bcryptjs'); // Không cần bcrypt nữa
const jwt = require('jsonwebtoken');
const mailChecker = require('mailchecker');

async function findByUsername(username) {
    console.log('Tìm kiếm người dùng theo username:', username);
    
    // First, check if the username exists in the Admin table
    console.log('Kiểm tra trong bảng Admin trước...');
    const admin = await prisma.admin.findFirst({
        where: {
            username: username
        }
    });
    
    if (admin) {
        console.log('Tìm thấy admin:', admin.username);
        // Convert admin to the format expected by the rest of the code
        return {
            id: admin.id,
            username: admin.username,
            password: admin.password,
            email: admin.email,
            fullname: admin.fullname,
            phone: admin.phone,
            role: 'ADMIN', // Always set admin role
            isAdmin: true,  // Add a flag to indicate this is an admin
            isAccepted: true // Admins are always accepted
        };
    }
    
    // If not found in Admin table, check User table
    console.log('Không tìm thấy trong bảng Admin, kiểm tra trong bảng User...');
    
    try {
        // Check if the required columns exist in the User table
        const columnsResult = await prisma.$queryRaw`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'User' 
            AND COLUMN_NAME IN ('isAccepted')
        `;
        const existingColumns = columnsResult.map(row => row.COLUMN_NAME);
        
        // Find user with basic info
        const user = await prisma.user.findFirst({
            where: {
                username: username
            }
        });
        
        if (user) {
            // If user exists, get additional fields if columns exist
            if (existingColumns.includes('isAccepted')) {
                const userData = await prisma.$queryRaw`SELECT isAccepted FROM User WHERE id = ${user.id}`;
                if (userData && userData.length > 0) {
                    user.isAccepted = userData[0].isAccepted || false;
                }
            }
        }
        
        console.log('Kết quả tìm kiếm User:', user ? 'Tìm thấy' : 'Không tìm thấy');
        return user;
    } catch (error) {
        console.error('Lỗi khi tìm kiếm user:', error);
        // If error occurs, still return basic user info without additional fields
        const user = await prisma.user.findFirst({
            where: {
                username: username
            }
        });
        console.log('Kết quả tìm kiếm User (fallback):', user ? 'Tìm thấy' : 'Không tìm thấy');
        return user;
    }
}

async function findByEmail(email) {
    console.log('Tìm kiếm người dùng theo email:', email);
    
    // First check Admin table
    const admin = await prisma.admin.findFirst({
        where: {
            email: email
        }
    });
    
    if (admin) {
        console.log('Tìm thấy admin với email:', email);
        return {
            id: admin.id,
            username: admin.username,
            password: admin.password,
            email: admin.email,
            fullname: admin.fullname,
            phone: admin.phone,
            role: 'ADMIN',
            isAdmin: true
        };
    }
    
    // Then check User table
    const user = await prisma.user.findFirst({
        where: {
            email: email
        }
    });
    
    console.log('Kết quả tìm kiếm:', user ? 'Tìm thấy' : 'Không tìm thấy');
    return user;
}   

async function createUser(fullname, username, password, email, phone, address) {
    console.log('Tạo người dùng mới:', { fullname, username, email, phone, address });
    // Không còn mã hóa mật khẩu
    const newUser = await prisma.user.create({
        data: {
            fullname,
            username,
            password: password, // Lưu trực tiếp password không mã hóa
            email,
            phone,
            address: address || ""
        }
    });
    console.log('Đã tạo người dùng với ID:', newUser.id);
    return newUser;
}

async function checkMailExist(email) {
    console.log('Kiểm tra email hợp lệ:', email);
    const isValid = mailChecker.isValid(email);
    console.log('Kết quả kiểm tra email:', isValid ? 'Hợp lệ' : 'Không hợp lệ');
    return isValid;
}

async function checkPassword(password, storedPassword) {
    console.log('Kiểm tra mật khẩu');
    // So sánh trực tiếp mật khẩu thay vì sử dụng bcrypt.compare
    const isValid = password === storedPassword;
    console.log('Kết quả kiểm tra mật khẩu:', isValid ? 'Chính xác' : 'Không chính xác');
    return isValid;
}

function generateToken(user) {
    console.log('Tạo token cho user:', user.id);
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'USER',
        isAdmin: user.isAdmin || false,
        userType: user.isAdmin ? 'admin' : 'user' // Add userType to distinguish between tables
    };
    
    // Token expires in 24 hours
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    console.log('Đã tạo token thành công');
    return token;
}

async function changePassword(id, password) {
    console.log('Thay đổi mật khẩu cho user ID:', id);
    // Không còn mã hóa mật khẩu khi thay đổi
    const user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            password: password // Lưu trực tiếp password không mã hóa
        }
    });
    console.log('Đã thay đổi mật khẩu thành công');
    return user;
}

// Giải mã JWT token
const decodeJWT = (token) => {
    // console.log('Giải mã JWT token');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // console.log('Giải mã token thành công:', decoded.id);
        return decoded;
    } catch (error) {
        console.error('Lỗi giải mã token:', error.message);
        throw error;
    }
};

module.exports = {
    findByUsername,
    findByEmail,
    createUser,
    checkMailExist,
    checkPassword,
    generateToken,
    changePassword,
    decodeJWT
};