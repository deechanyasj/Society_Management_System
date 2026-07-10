const express = require('express');
const router = express.Router();
const { getParcels, addParcel, markCollected } = require('../controllers/parcelsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getParcels);
router.post('/', authenticate, authorize('admin', 'staff'), addParcel);
router.put('/:id/collect', authenticate, authorize('admin', 'staff'), markCollected);

module.exports = router;
