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
    const { username, password, email, phone, fullname, address } = req.body;
    
    try {
        // Validate required fields
        if (!username || !password || !email || !phone || !fullname) {
            return res.status(400).json({ 
                success: false,
                message: 'Please fill in all required fields.' 
            });
        }

        // Validate email format
        const isValidEmail = await checkMailExist(email);
        if (!isValidEmail) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email format.' 
            });
        }

        // Check if email already exists
        const existingEmail = await findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already exists.' 
            });
        }
        
        // Check if username already exists
        const existingUsername = await findByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ 
                success: false,
                message: 'Username already exists.' 
            });
        }

        // Create new user
        const newUser = await createUser(fullname, username, password, email, phone, address);
        
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
    const { username, password } = req.body;

    try {
        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide both username and password.' 
            });
        }

        // Find user
        const user = await findByUsername(username);
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials.' 
            });
        }

        // Check password
        const isValidPassword = await checkPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials.' 
            });
        }

        // Generate token
        const token = generateToken(user);

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
                        