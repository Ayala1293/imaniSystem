
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

module.exports = router;
