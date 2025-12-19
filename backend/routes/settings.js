
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ShopSettings = require('../models/ShopSettings');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { protect, admin } = require('../middleware/auth');

// GET Shop Settings
router.get('/', async (req, res) => {
    try {
        let settings = await ShopSettings.findOne();
        if (!settings) {
            settings = await ShopSettings.create({
                shopName: "Imani Homes & Imports",
                phoneNumbers: ["+254 700 000 000"],
                fobPaybill: "247247",
                theme: { 
                    name: "Gold", 
                    primary: "#C49A46", 
                    secondary: "#111111", 
                    accent: "#DAA520", 
                    text: "#F3F4F6" 
                }
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings", error: error.message });
    }
});

// UPDATE Shop Settings
router.put('/', protect, admin, async (req, res) => {
    try {
        let settings = await ShopSettings.findOne();
        if (settings) {
            Object.assign(settings, req.body);
            const updated = await settings.save();
            res.json(updated);
        } else {
            // Create if missing
            const newSettings = await ShopSettings.create(req.body);
            res.status(201).json(newSettings);
        }
    } catch (error) {
        res.status(400).json({ message: "Error updating settings", error: error.message });
    }
});

const mapToMongo = (items, idMap = {}) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
        const newItem = { ...item };
        const originalId = newItem.id || newItem._id;
        if (originalId) {
            if (!idMap[originalId]) idMap[originalId] = new mongoose.Types.ObjectId();
            newItem._id = idMap[originalId];
            delete newItem.id;
        } else {
            newItem._id = new mongoose.Types.ObjectId();
        }
        return newItem;
    });
};

// IMPORT DATABASE
router.post('/import', protect, admin, async (req, res) => {
    console.log("📥 [RESTORE] Database Reconstruction Protocol Started...");
    try {
        const { catalogs, products, clients, orders, payments, shopSettings } = req.body;
        
        // 1. Clear current database
        await Promise.all([
            Catalog.deleteMany({}),
            Product.deleteMany({}),
            Client.deleteMany({}),
            Order.deleteMany({}),
            Payment.deleteMany({}),
            ShopSettings.deleteMany({})
        ]);

        const idMap = {};

        // 2. Map core entities to new ObjectIds
        const mCatalogs = mapToMongo(catalogs, idMap);
        const mClients = mapToMongo(clients, idMap);
        const mProducts = mapToMongo(products, idMap);

        // 3. Resolve Relationships
        mProducts.forEach(p => {
            if (p.catalogId && idMap[p.catalogId]) {
                p.catalogId = idMap[p.catalogId].toString();
            }
        });

        const mOrders = mapToMongo(orders, idMap).map(o => {
            if (o.clientId && idMap[o.clientId]) {
                o.clientId = idMap[o.clientId];
            }
            if (o.items && Array.isArray(o.items)) {
                o.items = o.items.map(i => ({
                    ...i,
                    productId: idMap[i.productId] || i.productId
                }));
            }
            return o;
        });

        const mPayments = mapToMongo(payments, idMap).map(p => {
            if (p.clientId && idMap[p.clientId]) {
                p.clientId = idMap[p.clientId];
            }
            return p;
        });

        // 4. Batch Commit
        const writeOperations = [];
        
        if (shopSettings) {
            const { _id, id, ...cleanSettings } = shopSettings;
            writeOperations.push(ShopSettings.create(cleanSettings));
        }
        
        if (mCatalogs.length) writeOperations.push(Catalog.insertMany(mCatalogs));
        if (mProducts.length) writeOperations.push(Product.insertMany(mProducts));
        if (mClients.length) writeOperations.push(Client.insertMany(mClients));
        if (mOrders.length) writeOperations.push(Order.insertMany(mOrders));
        if (mPayments.length) writeOperations.push(Payment.insertMany(mPayments));

        await Promise.all(writeOperations);

        res.json({ success: true, message: "Database reconstruction complete" });
    } catch (error) {
        console.error("❌ RESTORE FAILURE:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
