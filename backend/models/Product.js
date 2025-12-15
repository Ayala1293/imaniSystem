
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    catalogId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    imageUrl: String,
    category: String,
    fobPrice: { type: Number, required: true },
    freightCharge: { type: Number, default: 0 },
    attributes: [{
        key: String,
        value: String
    }],
    stockStatus: { type: String, enum: ['PENDING', 'ARRIVED'], default: 'PENDING' },
    stockCounts: { type: Map, of: Number }, // Map of "VariantKey" -> Quantity
    stockSold: { type: Map, of: Number }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
