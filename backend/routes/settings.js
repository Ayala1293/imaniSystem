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

// Get Settings (Create default if not exists)
router.get('/', async (req, res) => {
    let settings = await ShopSettings.findOne();
    if (!settings) {
        settings = await ShopSettings.create({
            shopName: "Imani Homes & Imports",
            phoneNumbers: ["+254 700 000 000"],
            fobPaybill: "000000",
            fobAccountNumber: "00000000",
            freightPaybill: "000000",
            freightAccountNumber: "00000000",
            theme: {
                name: "Imani Gold",
                primary: "#C49A46",
                secondary: "#111111",
                accent: "#DAA520",
                text: "#F3F4F6"
            }
        });
    }
    res.json(settings);
});

router.put('/', protect, admin, async (req, res) => {
    let settings = await ShopSettings.findOne();
    if (settings) {
        Object.assign(settings, req.body);
        const updated = await settings.save();
        res.json(updated);
    }
});

// @route   POST /api/settings/import
// @desc    Full Data Restore / Demo Data Load
// NOTE: Transactions removed to support standalone MongoDB (Desktop installation)
router.post('/import', protect, admin, async (req, res) => {
    try {
        const { catalogs, products, clients, orders, payments, shopSettings } = req.body;

        // 1. Clear existing data
        await Catalog.deleteMany({});
        await Product.deleteMany({});
        await Client.deleteMany({});
        await Order.deleteMany({});
        await Payment.deleteMany({});
        
        // Update Settings if provided
        if (shopSettings) {
            await ShopSettings.findOneAndUpdate({}, shopSettings, { upsert: true });
        }

        // Mappings to track old IDs -> new Mongo ObjectIds
        const mapCatalog = {};
        const mapProduct = {};
        const mapClient = {};

        // 2. Import Catalogs
        if (catalogs && catalogs.length > 0) {
            for (const cat of catalogs) {
                const newCat = new Catalog({ ...cat, _id: new mongoose.Types.ObjectId() });
                mapCatalog[cat.id] = newCat._id;
                await newCat.save();
            }
        }

        // 3. Import Products (Link to Catalogs)
        if (products && products.length > 0) {
            for (const prod of products) {
                const newProd = new Product({
                    ...prod,
                    _id: new mongoose.Types.ObjectId(),
                    catalogId: mapCatalog[prod.catalogId] || prod.catalogId 
                });
                mapProduct[prod.id] = newProd._id;
                await newProd.save();
            }
        }

        // 4. Import Clients
        if (clients && clients.length > 0) {
            for (const cli of clients) {
                const newCli = new Client({ ...cli, _id: new mongoose.Types.ObjectId() });
                mapClient[cli.id] = newCli._id;
                await newCli.save();
            }
        }

        // 5. Import Orders (Link to Clients and Products)
        if (orders && orders.length > 0) {
            for (const ord of orders) {
                const newItems = ord.items.map(item => {
                    const { _id, id, ...rest } = item;
                    return {
                        ...rest,
                        productId: mapProduct[item.productId] || item.productId
                    };
                });

                const newOrd = new Order({
                    ...ord,
                    clientId: mapClient[ord.clientId] || ord.clientId,
                    items: newItems
                });
                await newOrd.save();
            }
        }

        // 6. Import Payments (Link to Clients)
        if (payments && payments.length > 0) {
            for (const pay of payments) {
                const newPay = new Payment({
                    ...pay,
                    clientId: mapClient[pay.clientId] || pay.clientId
                });
                await newPay.save();
            }
        }

        res.json({ success: true, message: 'Data imported successfully' });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ message: 'Import failed: ' + error.message });
    }
});

module.exports = router;