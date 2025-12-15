
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    const clients = await Client.find({});
    res.json(clients);
});

router.post('/', protect, async (req, res) => {
    try {
        const client = new Client(req.body);
        const createdClient = await client.save();
        res.status(201).json(createdClient);
    } catch (error) {
        res.status(400).json({ message: 'Error creating client' });
    }
});

module.exports = router;
