const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userInventorySchema = new Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true
  },
  score: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('UserInventory', userInventorySchema);