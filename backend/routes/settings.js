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
router.post('/import', protect, admin, async (req, res) => {
    try {
        const { catalogs, products, clients, orders, payments, shopSettings } = req.body;

        // Relaxed Check: ensure at least something is there. 
        // We check if the object is empty or if all key arrays are missing/empty.
        const hasData = (catalogs && catalogs.length) || (products && products.length) || (clients && clients.length) || (shopSettings);

        if (!hasData) {
             return res.status(400).json({ message: 'Import file appears empty or invalid.' });
        }

        // 1. Clear existing data
        await Catalog.deleteMany({});
        await Product.deleteMany({});
        await Client.deleteMany({});
        await Order.deleteMany({});
        await Payment.deleteMany({});
        
        // Update Settings if provided
        if (shopSettings) {
            const { _id, ...settingsData } = shopSettings;
            await ShopSettings.findOneAndUpdate({}, settingsData, { upsert: true });
        }

        // Mappings to track old IDs -> new Mongo ObjectIds
        const mapCatalog = {};
        const mapProduct = {};
        const mapClient = {};

        // 2. Import Catalogs
        if (catalogs && catalogs.length > 0) {
            for (const cat of catalogs) {
                const newId = new mongoose.Types.ObjectId();
                const sourceId = cat.id || cat._id;
                if(sourceId) mapCatalog[sourceId] = newId;

                const newCat = new Catalog({
                    _id: newId,
                    name: cat.name,
                    closingDate: cat.closingDate,
                    status: cat.status,
                    createdAt: cat.createdAt
                });
                await newCat.save();
            }
        }

        // 3. Import Products (Link to Catalogs)
        if (products && products.length > 0) {
            for (const prod of products) {
                const newId = new mongoose.Types.ObjectId();
                const sourceId = prod.id || prod._id;
                if(sourceId) mapProduct[sourceId] = newId;

                const newProd = new Product({
                    _id: newId,
                    catalogId: mapCatalog[prod.catalogId] ? mapCatalog[prod.catalogId].toString() : prod.catalogId,
                    name: prod.name,
                    description: prod.description,
                    imageUrl: prod.imageUrl,
                    category: prod.category,
                    fobPrice: prod.fobPrice,
                    freightCharge: prod.freightCharge,
                    attributes: prod.attributes,
                    stockStatus: prod.stockStatus,
                    stockCounts: prod.stockCounts,
                    stockSold: prod.stockSold
                });
                await newProd.save();
            }
        }

        // 4. Import Clients
        if (clients && clients.length > 0) {
            for (const cli of clients) {
                const newId = new mongoose.Types.ObjectId();
                const sourceId = cli.id || cli._id;
                if(sourceId) mapClient[sourceId] = newId;

                const newCli = new Client({
                    _id: newId,
                    name: cli.name,
                    phone: cli.phone,
                    email: cli.email
                });
                await newCli.save();
            }
        }

        // 5. Import Orders (Link to Clients and Products)
        if (orders && orders.length > 0) {
            for (const ord of orders) {
                const mappedClientId = mapClient[ord.clientId];
                // Skip if client reference is invalid to prevent CastError
                if (!mappedClientId) {
                    // console.warn(`Skipping order ${ord.id} - missing client ref`);
                    continue; 
                }

                const newItems = ord.items.map(item => {
                    const mappedProductId = mapProduct[item.productId];
                    return {
                        productId: mappedProductId || new mongoose.Types.ObjectId(), // Fallback to avoid schema validation error
                        quantity: item.quantity,
                        fobTotal: item.fobTotal,
                        freightTotal: item.freightTotal,
                        selectedAttributes: item.selectedAttributes
                    };
                });

                const newOrd = new Order({
                    clientId: mappedClientId,
                    items: newItems,
                    orderDate: ord.orderDate,
                    status: ord.status,
                    fobPaymentStatus: ord.fobPaymentStatus,
                    freightPaymentStatus: ord.freightPaymentStatus,
                    totalFobPaid: ord.totalFobPaid,
                    totalFreightPaid: ord.totalFreightPaid,
                    isLocked: ord.isLocked
                });
                await newOrd.save();
            }
        }

        // 6. Import Payments (Link to Clients)
        if (payments && payments.length > 0) {
            for (const pay of payments) {
                const mappedClientId = mapClient[pay.clientId];
                if (!mappedClientId) continue;

                const newPay = new Payment({
                    transactionCode: pay.transactionCode,
                    amount: pay.amount,
                    payerName: pay.payerName,
                    date: pay.date,
                    clientId: mappedClientId,
                    rawMessage: pay.rawMessage
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