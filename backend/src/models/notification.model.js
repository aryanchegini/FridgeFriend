
// models/notification.model.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['FOOD_EXPIRY', 'LEADERBOARD_UPDATE'], required: true },
  title: String,
  body: String,
  data: Object,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
