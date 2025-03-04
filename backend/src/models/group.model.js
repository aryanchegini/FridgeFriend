const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  groupCode: {
    type: String,
    required: true,
    unique: true
  },
  groupName: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Group', groupSchema);
