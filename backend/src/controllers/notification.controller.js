const User = require("../models/user.model");

exports.savePushToken = async(req, res) => {
    try {
        const {pushToken} = req.body;
        const userID = req.user._id;
        
        if (!pushToken) {
            return res.status(400).json({ error: "Push token is required" });
        }
      
        await User.findByIdAndUpdate(userID, { pushToken }, { new: true });
      
        res.status(200).json({ message: "Push token saved successfully" });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
};
