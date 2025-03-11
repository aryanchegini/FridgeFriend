const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const barcodeSchema = new Schema({
    barcode: {
        type: String,
        required: true,
        unique: true,
    },
    productName: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Barcode", barcodeSchema);