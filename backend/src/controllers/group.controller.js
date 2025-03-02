const Group = require("../models/Group");
const { v4: uuidv4 } = require("uuid");

// @desc    Get all groups or a specific group with leaderboard
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
    try {
        const userID = req.params.userId;
        const {groupID} = req.query;

        let query = { users : userID}; // Only returing groups that members part of

        if (groupID) {
            query._id = groupID // If groupID present filter by group
        }

        // Fertching groups from database
        const groups = await Group.find(query).populate({
            path: "users", 
            select: "userId score -_id", // Fetch userId and score from UserInventory
            populate: { path: "userId", select: "-password -timestamps" } // Fetch full user object except password 
        });

        // Format response as leaderboard json
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
    }


// @desc    Join a group by group code
// @route   PUT /api/groups/:groupId/join
// @access  Private
exports.joinGroup = async (req, res) => {};

// @desc    Join a group by code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroupByCode = async (req, res) => {};