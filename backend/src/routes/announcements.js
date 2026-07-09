const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getAnnouncements);
router.post('/', authenticate, authorize('admin', 'staff'), createAnnouncement);
router.put('/:id', authenticate, authorize('admin', 'staff'), updateAnnouncement);
router.delete('/:id', authenticate, authorize('admin'), deleteAnnouncement);

module.exports = router;
