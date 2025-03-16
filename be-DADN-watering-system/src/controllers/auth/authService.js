const prisma = require('../../../config/database');
// const bcrypt = require('bcryptjs'); // Không cần bcrypt nữa
const jwt = require('jsonwebtoken');
const mailChecker = require('mailchecker');

async function findByUsername(username) {
    return await prisma.user.findFirst({
        where: {
            username: username
        }
    });
}

async function findByEmail(email) {
    return await prisma.user.findFirst({
        where: {
            email: email
        }
    });
}   

async function createUser(fullname, username, password, email, phone, address) {
    // Không còn mã hóa mật khẩu
    return await prisma.user.create({
        data: {
            fullname,
            username,
            password: password, // Lưu trực tiếp password không mã hóa
            email,
            phone,
            address: address || ""
        }
    });
}

async function checkMailExist(email) {
    return mailChecker.isValid(email);
}

async function checkPassword(password, storedPassword) {
    // So sánh trực tiếp mật khẩu thay vì sử dụng bcrypt.compare
    return password === storedPassword;
}

function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    
    // Token expires in 24 hours
    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
}

async function changePassword(id, password) {
    // Không còn mã hóa mật khẩu khi thay đổi
    return await prisma.user.update({
        where: {
            id: id
        },
        data: {
            password: password // Lưu trực tiếp password không mã hóa
        }
    });
}

async function decodeJWT(token) {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
}

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