const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupMembershipSchema = new Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for uniqueness
groupMembershipSchema.index({ userId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('GroupMembership', groupMembershipSchema);