
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    const payments = await Payment.find({}).sort({ date: -1 });
    res.json(payments);
});

router.post('/', protect, async (req, res) => {
    try {
        const payment = await Payment.create(req.body);
        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
