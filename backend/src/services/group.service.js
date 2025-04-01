const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const Group = require("../models/group.model");
const UserInventory = require("../models/userInventory.model");
const GroupMembership = require("../models/groupMembership.model");

/**
 * Get groups with leaderboard data for a user
 * @param {String} userId - User ID
 * @param {String} [groupId] - Optional specific group ID
 * @returns {Promise<Array>} - Groups with leaderboard data
 */
const getGroups = async (userId, groupId = null) => {
  try {
    let groupQuery = {};

    if (groupId) {
      groupQuery._id = groupId; // Filter by specific group
    } else {
      // Get all groups the user is a member of
      const memberships = await GroupMembership.find({ userId }).select(
        "groupId"
      );
      const groupIds = memberships.map((membership) => membership.groupId);
      groupQuery._id = { $in: groupIds };
    }

    const groups = await Group.find(groupQuery);

    // Build detailed group data with leaderboards
    const groupData = await Promise.all(
      groups.map(async (group) => {
        // Get all members in this group
        const memberships = await GroupMembership.find({
          groupId: group._id,
        }).populate("userId", "name");

        const userIds = memberships.map((membership) => membership.userId._id);

        // Get scores for all members
        const scores = await UserInventory.find({
          userId: { $in: userIds },
        }).select("userId score");

        // Build and sort leaderboard
        const leaderboard = memberships
          .map((membership) => {
            const userScore = scores.find(
              (s) => s.userId.toString() === membership.userId._id.toString()
            ) || { score: 0 };
            return {
              userName: membership.userId.name,
              userID: membership.userId._id,
              score: userScore.score,
            };
          })
          .sort((a, b) => b.score - a.score);

        return {
          groupName: group.groupName,
          groupCode: group.groupCode,
          createdBy: group.createdBy,
          leaderboard,
        };
      })
    );

    return groupData;
  } catch (error) {
    logger.error(`Error fetching groups with leaderboard: ${error.message}`);
    throw error;
  }
};

/**
 * Create a new group
 * @param {String} userId - User ID
 * @param {String} groupName - Group name
 * @returns {Promise<Object>} - Created group
 */
const createGroup = async (userId, groupName) => {
  try {
    if (!groupName) {
      throw new Error("Group name is required");
    }

    // Generate unique group code
    let groupCode;
    let isUnique = false;

    while (!isUnique) {
      groupCode = uuidv4().slice(0, 6).toUpperCase();
      const existingGroup = await Group.findOne({ groupCode });
      if (!existingGroup) isUnique = true;
    }

    // Create the group
    const newGroup = new Group({
      groupCode,
      groupName,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await newGroup.save();

    // Create GroupMembership for the creator
    await GroupMembership.create({
      userId: new mongoose.Types.ObjectId(userId),
      groupId: newGroup._id,
    });

    return {
      groupName: newGroup.groupName,
      groupCode: newGroup.groupCode,
      createdBy: newGroup.createdBy,
    };
  } catch (error) {
    logger.error(`Error creating group: ${error.message}`);
    throw error;
  }
};

/**
 * Join a group by code
 * @param {String} userId - User ID
 * @param {String} groupCode - Group code
 * @returns {Promise<Boolean>} - Success indicator
 */
const joinGroupByCode = async (userId, groupCode) => {
  try {
    if (!groupCode) {
      throw new Error("Group code is required");
    }

    // Find the group by code
    const group = await Group.findOne({ groupCode });
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if user is already a member
    const existingMembership = await GroupMembership.findOne({
      userId,
      groupId: group._id,
    });

    if (existingMembership) {
      throw new Error("User is already in this group");
    }

    // Create membership
    await GroupMembership.create({
      userId: new mongoose.Types.ObjectId(userId),
      groupId: new mongoose.Types.ObjectId(group._id),
    });

    return true;
  } catch (error) {
    logger.error(`Error joining group: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getGroups,
  createGroup,
  joinGroupByCode,
};
