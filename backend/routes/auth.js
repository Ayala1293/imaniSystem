
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
};

// @route   GET /api/auth/init
// @desc    Check if any users exist (to trigger setup mode)
router.get('/init', async (req, res) => {
    // Fail fast if DB not connected yet
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

// @route   GET /api/auth/users
// @desc    List all users (Admin only)
router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
router.delete('/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            // Prevent deleting self
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

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    
    // Normalize input
    const normalizedUsername = username ? username.toLowerCase().trim() : '';
    
    // --- DEBUG LOGGING ---
    console.log("\n--- LOGIN ATTEMPT ---");
    console.log(`Input Username: '${username}' -> Normalized: '${normalizedUsername}'`);
    console.log(`Input Password: '${password}'`);
    console.log(`Target Role:    '${role}'`);
    // ---------------------

    try {
        const user = await User.findOne({ username: normalizedUsername });

        if (user) {
            const isMatch = await user.matchPassword(password);
            console.log(`User Found in DB. Password Match: ${isMatch ? "YES" : "NO"}`);
            
            if (isMatch) {
                if (user.role !== role) {
                    console.log(`Role Mismatch: DB has '${user.role}', User selected '${role}'`);
                    return res.status(401).json({ message: `Account exists but is not a ${role} account.` });
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
        } else {
            console.log("User NOT found in database.");
        }
        
        res.status(401).json({ message: 'Invalid username or password' });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/register
// @desc    Register user. SECURED: Only allowed if 0 users exist OR if request is from Admin.
router.post('/register', async (req, res) => {
    const { name, username, password, role } = req.body;

    // Normalize input
    const normalizedUsername = username ? username.toLowerCase().trim() : '';

    try {
        const count = await User.countDocuments();

        // SECURITY CHECK: If system is already set up (users > 0), ensure request is from Admin
        if (count > 0) {
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

        const user = await User.create({ 
            name, 
            username: normalizedUsername, 
            password, 
            role 
        });

        if (user) {
            console.log(`[AUTH] New User Registered: ${normalizedUsername} (${role})`);
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

// @route   POST /api/auth/factory-reset
// @desc    EMERGENCY ONLY: Deletes all users to reset to setup mode
router.post('/factory-reset', async (req, res) => {
    try {
        await User.deleteMany({});
        console.log("⚠️ SYSTEM FACTORY RESET: All users deleted.");
        res.json({ success: true, message: 'System reset. All users deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
