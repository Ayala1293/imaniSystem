
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ShopSettings = require('../models/ShopSettings');
const { protect, admin } = require('../middleware/auth');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
};

// @route   GET /api/auth/init
router.get('/init', async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: 'Database connecting...' });
    }
    try {
        const count = await User.countDocuments();
        res.json({ hasUsers: count > 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ message: 'Cannot delete your own admin account.' });
            }
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    const normalizedUsername = username ? username.toLowerCase().trim() : '';
    try {
        const user = await User.findOne({ username: normalizedUsername });
        if (user) {
            const isMatch = await user.matchPassword(password);
            if (isMatch) {
                // Check if requested role matches DB role (to prevent staff from logging as admin or vice versa)
                if (user.role !== role) {
                    return res.status(401).json({ message: `Account exists but your assigned role is '${user.role}', not '${role}'.` });
                }
                res.json({
                    _id: user._id,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                    token: generateToken(user._id),
                });
                return;
            }
        }
        res.status(401).json({ message: 'Invalid username or password' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/register', async (req, res) => {
    const { name, username, password, role } = req.body;
    const normalizedUsername = username ? username.toLowerCase().trim() : '';
    try {
        const count = await User.countDocuments();
        let finalRole = role;

        // If this is the FIRST user, ALWAYS make them an ADMIN to prevent system lockouts
        if (count === 0) {
            finalRole = 'ADMIN';
            console.log("🛠️  First user registration detected. Forcing role to 'ADMIN'.");
        } else {
            // If not the first user, require authorization
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }
            if (!token) {
                return res.status(401).json({ message: 'Authorization required to create new users.' });
            }
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
                const adminUser = await User.findById(decoded.id);
                if (!adminUser || adminUser.role !== 'ADMIN') {
                    return res.status(403).json({ message: 'Only Admins can create additional users.' });
                }
            } catch (e) {
                return res.status(401).json({ message: 'Invalid Admin Token.' });
            }
        }

        const userExists = await User.findOne({ username: normalizedUsername });
        if (userExists) {
            return res.status(400).json({ message: 'Username already registered' });
        }

        const user = await User.create({ name, username: normalizedUsername, password, role: finalRole });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Full System Wipe
router.post('/factory-reset', async (req, res) => {
    console.log("⚠️ RECEIVED FACTORY RESET REQUEST");
    try {
        // Execute deletions sequentially to ensure stability on some systems
        await User.deleteMany({});
        await Catalog.deleteMany({});
        await Product.deleteMany({});
        await Client.deleteMany({});
        await Order.deleteMany({});
        await Payment.deleteMany({});
        await ShopSettings.deleteMany({});
        
        console.log("✅ SYSTEM WIPE SUCCESSFUL: All database collections cleared.");
        res.json({ success: true, message: 'System reset. All data deleted.' });
    } catch (err) {
        console.error("❌ FACTORY RESET ERROR:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
