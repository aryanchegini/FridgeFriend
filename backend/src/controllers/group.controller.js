const mongoose = require("mongoose");
const Group = require("../models/Group");
const UserInventory = require("../models/UserInventory");
const { v4: uuidv4 } = require("uuid");

// @desc    Get all groups or a specific group with leaderboard
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
    try {
        const userID = req.params.userId;
        const {groupID} = req.query;

        let query = { users : userID}; // only returing groups that members part of

        if (groupID) {
            query._id = groupID // if groupID present filter by group
        }

        // fertching groups from database
        const groups = await Group.find(query).populate({
            path: "users", 
            select: "userId score -_id", 
            populate: { path: "userId", select: "-password -timestamps" } 
        });

        
        const leaderboard = groups.map(group => ({
            groupName: group.groupName,
            groupCode: group.groupCode,
            users: group.users
                .map(user => ({
                    user: user.userId, 
                    score: user.score  
                }))
                .sort((a, b) => b.score - a.score) // Sort users by highest score
        }));

        res.json({ leaderboard });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

   

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
    try {
        const { group_name } = req.body; // param name from body
        const userID = req.param.userId

        if(!group_name) {
            return res.status(400).json({ error: "Group name is required"})
        }

        const groupCode = uuidv4.slice(0,6).toUppercase(); // generate code

        const newGroup = new Group({
            groupCode,
            groupName: group_name,
            createdBy: mongoose.Types.ObjectId(userID), // convert to ObjectId
            users: [mongoose.Types.ObjectId(userID)] // ensure it's an array of ObjectId
        });

        await newGroup.save();

        res.status(201).json({
            message: "Group created successfully",
            group: {
                groupName: newGroup.groupName,
                groupCode: newGroup.groupCode,
                createdBy: newGroup.createdBy,
                users: newGroup.users
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// @desc    Join a group by group code
// @route   PUT /api/groups/:groupId/join
// @access  Private
exports.joinGroup = async (req, res) => {
    try {
        const { groupId } = req.params; 
        const userID = req.param.userId; 

        
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        // Find the group by ID
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (group.users.includes(userID)) {
            return res.status(400).json({ error: "User is already in this group" });
        }

        // add user to the group
        group.users.push(mongoose.Types.ObjectId(userID));
        await group.save();

        // create UserInventory entry if it doesn't exist
        let userInventory = await UserInventory.findOne({ userId: userID });
        if (!userInventory) {
            userInventory = new UserInventory({
                userId: mongoose.Types.ObjectId(userID),
                score: 0 // Default score
            });
            await userInventory.save();
        }

        res.status(201).json({ message: "User successfully joined the group" });
        req.query.groupID = groupId; 
        return getGroups(req, res);

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
        const userID = req.param.user; 

        // validate input
        if (!group_code) {
            return res.status(400).json({ error: "Group code is required" });
        }

        // find the group by code
        const group = await Group.findOne({ groupCode: group_code });
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // check if user is already in the group
        if (group.users.includes(userID)) {
            return res.status(400).json({ error: "User is already in this group" });
        }

        // Add user to the group
        group.users.push(mongoose.Types.ObjectId(userID));
        await group.save();

        // ensure the user has a UserInventory entry
        let userInventory = await UserInventory.findOne({ userId: userID });
        if (!userInventory) {
            userInventory = new UserInventory({
                userId: mongoose.Types.ObjectId(userID),
                score: 0 
            });
            await userInventory.save();
        }

       
        res.status(201).json({ message: "User successfully joined the group" });

        
        req.query.groupID = group._id; 
        return getGroups(req, res);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
