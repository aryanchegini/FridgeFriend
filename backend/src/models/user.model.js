const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  pushTokens: [{
    token: {
      type: String,
      required: true
    },
    deviceId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationSettings: {
    expiryAlerts: {
      type: Boolean,
      default: true
    },
    leaderboardAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('User', userSchema);