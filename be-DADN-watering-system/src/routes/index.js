const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const sensorRoutes = require('./sensorRoutes');
const deviceRoutes = require('./deviceRoutes');
const deviceConfigRoutes = require('./deviceConfigRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const automationRoutes = require('./automationRoutes');

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
routes.use('/device-config', deviceConfigRoutes);
routes.use('/notifications', notificationRoutes);
routes.use('/admin', adminRoutes);
routes.use('/schedules', scheduleRoutes);
routes.use('/automation', automationRoutes);

module.exports = routes;