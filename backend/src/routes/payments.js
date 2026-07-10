const express = require('express');
const router = express.Router();
const { getPayments, createPayment, processPayment, getPaymentStats } = require('../controllers/paymentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getPayments);
router.get('/stats', authenticate, authorize('admin', 'staff'), getPaymentStats);
router.post('/', authenticate, authorize('admin', 'staff'), createPayment);
router.put('/:id/pay', authenticate, authorize('resident'), processPayment);

module.exports = router;
