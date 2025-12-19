
const express = require('express');
const router = express.Router();
const Catalog = require('../models/Catalog');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    const catalogs = await Catalog.find({}).sort({ createdAt: -1 });
    res.json(catalogs);
});

router.post('/', protect, admin, async (req, res) => {
    try {
        const catalog = await Catalog.create(req.body);
        res.status(201).json(catalog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', protect, admin, async (req, res) => {
    try {
        const catalog = await Catalog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(catalog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Fix: Added missing DELETE route for catalogs
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const catalog = await Catalog.findById(req.params.id);
        if (catalog) {
            await catalog.deleteOne();
            res.json({ message: 'Catalog removed' });
        } else {
            res.status(404).json({ message: 'Catalog not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
