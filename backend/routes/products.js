
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    const products = await Product.find({});
    res.json(products);
});

// @route   POST /api/products/:id/stock
// @desc    Update stock levels (Allowed for Staff)
router.post('/:id/stock', protect, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            if (req.body.stockCounts) product.stockCounts = req.body.stockCounts;
            if (req.body.stockSold) product.stockSold = req.body.stockSold;
            if (req.body.stockStatus) product.stockStatus = req.body.stockStatus;
            
            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error updating stock: ' + error.message });
    }
});

router.post('/', protect, admin, async (req, res) => {
    try {
        const product = new Product(req.body);
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product' });
    }
});

router.put('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            // Destructure to remove client-side 'id' and avoid overwriting '_id' or internal timestamps
            const { id, _id, createdAt, updatedAt, __v, ...updateData } = req.body;
            Object.assign(product, updateData);
            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        console.error("Backend Product Update Error:", err);
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, admin, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

module.exports = router;
