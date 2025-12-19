
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists.' });
            }
            next();
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        const userRole = req.user ? req.user.role : 'No User';
        console.warn(`[Auth Warning] Access Denied: User role is '${userRole}', but 'ADMIN' is required.`);
        res.status(401).json({ 
            message: 'Access Denied: You do not have Administrator privileges.',
            currentRole: userRole 
        });
    }
};

module.exports = { protect, admin };
