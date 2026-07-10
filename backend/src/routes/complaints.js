const express = require('express');
const router = express.Router();
const { getComplaints, createComplaint, updateComplaint, deleteComplaint } = require('../controllers/complaintsController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticate, getComplaints);
router.post('/', authenticate, authorize('resident'), upload.single('image'), createComplaint);
router.put('/:id', authenticate, authorize('admin', 'staff'), updateComplaint);
router.delete('/:id', authenticate, authorize('admin'), deleteComplaint);

module.exports = router;
