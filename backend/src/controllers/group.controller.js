const mongoose = require("mongoose");
const Group = require("../models/group.model");
const UserInventory = require("../models/userInventory.model");
const GroupMembership = require("../models/groupMembership.model")
const { v4: uuidv4 } = require("uuid");

// @desc    Get all groups or a specific group with leaderboard
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
    try {
        const userID = req.user._id;
        const {groupID} = req.query;

        let groupQuery = {};

        if (groupID) {
            groupQuery._id = groupID // if groupID present filter by group
        }

        else {
            const memberships = await GroupMembership.find({ userId: userID }).select("groupId");
            const groupIds = memberships.map((membership) => membership.groupId);
            groupQuery._id = { $in: groupIds };
        }

        const groups = await Group.find(groupQuery);

        const groupData = await Promise.all(
            groups.map(async (group) => {
              const memberships = await GroupMembership.find({ groupId: group._id }).populate("userId", "name");
              const userIds = memberships.map((membership) => membership.userId._id);
              const scores = await UserInventory.find({ userId: { $in: userIds } }).select("userId score");

              const leaderboard = memberships
          .map((membership) => {
            const userScore = scores.find((s) => s.userId.toString() === membership.userId._id.toString()) || { score: 0 };
            return {
                userobject: {
                    userName: membership.userId.name,
                    userID: membership.userId._id,
                },
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

    res.json(groupData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

        

   

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
    try {
      const { group_name } = req.body; 
      const userID = req.user._id; 
  
      if (!group_name) {
        return res.status(400).json({ error: "Group name is required" });
      }

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
        groupName: group_name,
        createdBy: new mongoose.Types.ObjectId(userID), 
      });
  
      await newGroup.save();
  
      // Create GroupMembership for the creator
      await GroupMembership.create({
        userId: new mongoose.Types.ObjectId(userID),
        groupId: newGroup._id,
      });
  
      res.status(201).json({
        message: "Group created successfully",
        group: {
          groupName: newGroup.groupName,
          groupCode: newGroup.groupCode,
          createdBy: newGroup.createdBy,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };



// @desc    Join a group by code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroupByCode = async (req, res) => {
    try {
      const { group_code } = req.body; 
      const userID = req.user._id; 
  
      
      if (!group_code) {
        return res.status(400).json({ error: "Group code is required" });
      }
  
      // Find the group by group code
      const group = await Group.findOne({ groupCode: group_code });
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
  
      // Checking if user is already a member
      const existingMembership = await GroupMembership.findOne({ userId: userID, groupId: group._id });
      if (existingMembership) {
        return res.status(400).json({ error: "User is already in this group" });
      }
  
      // Create a new GroupMembership entry
      await GroupMembership.create({
        userId: new mongoose.Types.ObjectId(userID),
        groupId: new mongoose.Types.ObjectId(group._id),
      });
  
      res.status(201).json({ message: "User successfully joined the group" });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
