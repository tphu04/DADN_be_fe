const express = require('express');

const { logIn, signUp, logOut } = require('../controllers/auth/authController');

const router = express.Router();

// Route test GET
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working!' });
});

// Public routes
router.post('/login', logIn);
router.post('/register', signUp);
router.post('/logout', logOut);

module.exports = router;