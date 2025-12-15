
const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema({
    name: { type: String, required: true },
    closingDate: { type: Date, required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Catalog', catalogSchema);
