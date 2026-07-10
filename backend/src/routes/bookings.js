const express = require('express');
const router = express.Router();
const { getBookings, createBooking, updateBooking, cancelBooking } = require('../controllers/bookingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getBookings);
router.post('/', authenticate, authorize('resident'), createBooking);
router.put('/:id', authenticate, authorize('admin', 'staff'), updateBooking);
router.put('/:id/cancel', authenticate, authorize('resident'), cancelBooking);

module.exports = router;
