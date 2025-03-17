// const bcrypt = require('bcryptjs'); // Không cần bcrypt nữa
const jwt = require('jsonwebtoken');
const { 
    findByUsername,
    findByEmail,
    createUser,
    checkMailExist,
    checkPassword,
    generateToken
} = require('./authService');

require('dotenv').config();

// sign up
const signUp = async (req, res) => { 
    console.log('Đang xử lý đăng ký:', req.body);
    const { username, password, email, phone, fullname, address } = req.body;
    
    try {
        // Validate required fields
        if (!username || !password || !email || !phone || !fullname) {
            console.log('Thiếu thông tin đăng ký');
            return res.status(400).json({ 
                success: false,
                message: 'Please fill in all required fields.' 
            });
        }

        // Validate email format
        const isValidEmail = await checkMailExist(email);
        if (!isValidEmail) {
            console.log('Email không hợp lệ:', email);
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email format.' 
            });
        }

        // Check if email already exists
        const existingEmail = await findByEmail(email);
        if (existingEmail) {
            console.log('Email đã tồn tại:', email);
            return res.status(400).json({ 
                success: false,
                message: 'Email already exists.' 
            });
        }
        
        // Check if username already exists
        const existingUsername = await findByUsername(username);
        if (existingUsername) {
            console.log('Username đã tồn tại:', username);
            return res.status(400).json({ 
                success: false,
                message: 'Username already exists.' 
            });
        }

        // Create new user
        console.log('Tạo người dùng mới');
        const newUser = await createUser(fullname, username, password, email, phone, address);
        console.log('Đã tạo người dùng:', newUser.id);
        
        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    fullname: newUser.fullname
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred during registration.' 
        });
    }
}

// log in
const logIn = async (req, res) => {
    console.log('Đang xử lý đăng nhập:', req.body);
    const { username, password } = req.body;

    try {
        // Validate required fields
        if (!username || !password) {
            console.log('Thiếu thông tin đăng nhập');
            return res.status(400).json({ 
                success: false,
                message: 'Please provide both username and password.' 
            });
        }

        // Find user
        console.log('Tìm kiếm người dùng với username:', username);
        const user = await findByUsername(username);
        if (!user) {
            console.log('Không tìm thấy người dùng:', username);
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials.' 
            });
        }

        // Check password
        console.log('Kiểm tra mật khẩu');
        const isValidPassword = await checkPassword(password, user.password);
        if (!isValidPassword) {
            console.log('Mật khẩu không chính xác');
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials.' 
            });
        }

        // Generate token
        console.log('Tạo token đăng nhập');
        const token = generateToken(user);
        console.log('Đăng nhập thành công, user ID:', user.id);

        res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullname: user.fullname
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred during login.' 
        });
    }
}

// log out
const logOut = async (req, res) => {
    try {
        // Không cần thực hiện bất kỳ thao tác nào trên server
        // vì token được lưu ở phía client
        console.log('Xử lý đăng xuất');
        res.status(200).json({ 
            success: true,
            message: 'Logout successful.' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred during logout.' 
        });
    }
}

module.exports = {
    logIn,
    signUp,
    logOut
}
                        