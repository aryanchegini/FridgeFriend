const asyncHandler = require("express-async-handler");
const groupService = require("../services/group.service");

/**
 * @desc    Get all groups or a specific group with leaderboard
 * @route   GET /api/groups
 * @access  Private
 */
const getGroups = asyncHandler(async (req, res) => {
  const userID = req.user._id;
  const { groupID } = req.query;
  
  const groups = await groupService.getGroups(userID, groupID);
  res.json(groups);
});

/**
 * @desc    Create a new group
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = asyncHandler(async (req, res) => {
  const { group_name } = req.body;
  const userID = req.user._id;
  
  if (!group_name) {
    return res.status(400).json({ error: "Group name is required" });
  }
  
  const newGroup = await groupService.createGroup(userID, group_name);
  
  res.status(201).json({
    message: "Group created successfully",
    group: newGroup
  });
});

/**
 * @desc    Join a group by code
 * @route   POST /api/groups/join
 * @access  Private
 */
const joinGroupByCode = asyncHandler(async (req, res) => {
  const { group_code } = req.body;
  const userID = req.user._id;
  
  if (!group_code) {
    return res.status(400).json({ error: "Group code is required" });
  }
  
  try {
    await groupService.joinGroupByCode(userID, group_code);
    res.status(201).json({ message: "User successfully joined the group" });
  } catch (error) {
    if (error.message === "Group not found") {
      return res.status(404).json({ error: error.message });
    } else if (error.message === "User is already in this group") {
      return res.status(400).json({ error: error.message });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Create user inventory if it doesn't exist
 * @route   POST /api/groups/create-inventory
 * @access  Private
 */
const createInventory = asyncHandler(async (req, res) => {
  const userID = req.user._id;
  
  const inventory = await groupService.createUserInventory(userID);
  
  res.status(201).json({
    message: "Inventory created or already exists",
    inventory
  });
});

module.exports = {
  getGroups,
  createGroup,
  joinGroupByCode,
  createInventory
};