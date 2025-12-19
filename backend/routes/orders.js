
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    const orders = await Order.find({});
    res.json(orders);
});

router.post('/', protect, async (req, res) => {
    try {
        const order = new Order(req.body);
        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(400).json({ message: 'Error creating order' });
    }
});

router.put('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            // Stripping metadata and client-side IDs
            const { id, _id, createdAt, updatedAt, __v, ...updateData } = req.body;
            Object.assign(order, updateData);
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        console.error("Backend Order Update Error:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
