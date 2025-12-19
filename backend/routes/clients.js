
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

// @route   POST /api/clients/bulk
// @desc    Import multiple clients at once
router.post('/bulk', protect, async (req, res) => {
    try {
        const clientsData = req.body; // Expects an array
        if (!Array.isArray(clientsData)) {
            return res.status(400).json({ message: 'Input must be an array of clients' });
        }
        
        // Basic validation or filtering can happen here
        // Using ordered: false ensures that if one duplicate fails, the rest still insert
        const result = await Client.insertMany(clientsData, { ordered: false });
        
        res.status(201).json(result);
    } catch (error) {
        // If it's a bulk write error (some succeeded, some failed), we still return success for the ones that worked
        if (error.name === 'BulkWriteError' || error.code === 11000) {
             return res.status(201).json({ 
                 message: 'Partial success', 
                 insertedCount: error.insertedCount, 
                 details: 'Some duplicates were skipped.' 
             });
        }
        res.status(400).json({ message: 'Bulk import failed: ' + error.message });
    }
});

// Fix: Added missing PUT route for client updates
router.put('/:id', protect, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (client) {
            // Stripping metadata and client-side IDs
            const { id, _id, createdAt, updatedAt, __v, ...updateData } = req.body;
            Object.assign(client, updateData);
            const updatedClient = await client.save();
            res.json(updatedClient);
        } else {
            res.status(404).json({ message: 'Client not found' });
        }
    } catch (err) {
        console.error("Backend Client Update Error:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
