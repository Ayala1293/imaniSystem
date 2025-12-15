
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    transactionCode: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    payerName: String,
    date: { type: Date, default: Date.now },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    rawMessage: String
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
