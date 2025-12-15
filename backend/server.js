require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Database Connection
// We use 127.0.0.1 instead of localhost to avoid Node.js v17+ IPv6 resolution issues
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imani_shop';

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB Connected successfully to', mongoURI))
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    console.log('Ensure your MongoDB service is running via Task Manager > Services');
});

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});