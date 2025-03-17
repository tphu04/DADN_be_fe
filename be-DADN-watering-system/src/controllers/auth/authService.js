const prisma = require('../../../config/database');
// const bcrypt = require('bcryptjs'); // Không cần bcrypt nữa
const jwt = require('jsonwebtoken');
const mailChecker = require('mailchecker');

async function findByUsername(username) {
    console.log('Tìm kiếm người dùng theo username:', username);
    const user = await prisma.user.findFirst({
        where: {
            username: username
        }
    });
    console.log('Kết quả tìm kiếm:', user ? 'Tìm thấy' : 'Không tìm thấy');
    return user;
}

async function findByEmail(email) {
    console.log('Tìm kiếm người dùng theo email:', email);
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
        role: user.role || 'USER'
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