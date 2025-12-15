
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    fobTotal: Number,
    freightTotal: Number,
    selectedAttributes: [{ key: String, value: String }]
});

const orderSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    items: [orderItemSchema],
    orderDate: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['DRAFT', 'CONFIRMED', 'SHIPPED', 'ARRIVED', 'DELIVERED'], 
        default: 'CONFIRMED' 
    },
    fobPaymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
    freightPaymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
    totalFobPaid: { type: Number, default: 0 },
    totalFreightPaid: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
