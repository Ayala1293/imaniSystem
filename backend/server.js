
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User'); // Import User model for logging

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const catalogRoutes = require('./routes/catalogs');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

// 1. Request Logging (Helps debug if requests are reaching the server)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 2. CORS - Explicit Configuration
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle preflight requests for all routes
app.options('*', cors());

// Increased limit to 200mb
app.use(express.json({ limit: '200mb' })); 
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imani_shop';

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log(`✅ MongoDB Connected successfully to ${mongoURI}`);
        
        // --- DB MIGRATION / CLEANUP ---
        // Fix for E11000 duplicate key error on email: null
        // This drops the old index if it exists from a previous schema version
        try {
            const collection = mongoose.connection.collection('users');
            const indexes = await collection.indexes();
            const emailIndex = indexes.find(idx => idx.key.email === 1);
            
            if (emailIndex) {
                await collection.dropIndex('email_1');
                console.log("🛠️  FIX APPLIED: Dropped legacy 'email_1' unique index.");
            }
        } catch (e) {
            // Index doesn't exist or other error, which is fine as we only want to fix if it's broken
        }
        // -----------------------------
        
        // LOG USERS FOR DEBUGGING
        const users = await User.find({});
        console.log("\n==================== USER DATABASE DUMP ====================");
        if(users.length > 0) {
            const tableData = users.map(u => ({
                ID: u._id.toString(),
                Username: u.username,
                Role: u.role,
                PasswordStatus: "🔒 ENCRYPTED (Bcrypt Hash)"
            }));
            console.table(tableData);
        } else {
            console.log("⚠️  NO USERS FOUND. App will default to 'SYSTEM SETUP' mode.");
        }
        console.log("============================================================\n");

    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log('   -> Retrying in 2 seconds...');
        setTimeout(connectDB, 2000);
    }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Imani Shop API is running...');
});

// BIND TO 0.0.0.0 for maximum compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// Handle "Port in use" errors gracefully
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
    } else {
        console.error(e);
    }
});
