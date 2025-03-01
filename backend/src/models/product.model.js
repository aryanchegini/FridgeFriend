const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: String,
    required: true
  },
  dateLogged: {
    type: Date,
    default: Date.now
  },
  dateOfExpiry: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['not_expired', 'expired', 'consumed'],
    default: 'not_expired'
  },
  inventoryId: {
    type: Schema.Types.ObjectId,
    ref: 'UserInventory'
  }
});

module.exports = mongoose.model('Product', productSchema);