const express = require('express');
const router = express.Router();
const { getAnalytics, getResidents, toggleUserStatus, getNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/analytics', authenticate, authorize('admin', 'staff'), getAnalytics);
router.get('/residents', authenticate, authorize('admin', 'staff'), getResidents);
router.put('/residents/:id/toggle', authenticate, authorize('admin'), toggleUserStatus);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationRead);
router.put('/notifications/read-all', authenticate, markAllNotificationsRead);

module.exports = router;
