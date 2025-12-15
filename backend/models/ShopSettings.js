
const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    name: String,
    primary: String,
    secondary: String,
    accent: String,
    text: String
});

const settingsSchema = new mongoose.Schema({
    shopName: { type: String, default: 'Imani Shop' },
    phoneNumbers: [String],
    logoUrl: String,
    fobPaybill: String,
    fobAccountNumber: String,
    freightPaybill: String,
    freightAccountNumber: String,
    theme: themeSchema
});

module.exports = mongoose.model('ShopSettings', settingsSchema);
