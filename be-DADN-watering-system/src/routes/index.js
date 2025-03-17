const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const sensorRoutes = require('./sensorRoutes');
const deviceRoutes = require('./deviceRoutes');

const routes = express.Router();

// Route test trực tiếp
routes.get('/test-route', (req, res) => {
    res.json({ message: 'Routes module is working!' });
});

// Các routes không cần xác thực
routes.use('/auth', authRoutes);

// Các routes cần xác thực
routes.use('/users', userRoutes);
routes.use('/sensors', sensorRoutes);
routes.use('/devices', deviceRoutes);

module.exports = routes;