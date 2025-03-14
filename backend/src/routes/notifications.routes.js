const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const authenticate = require("../middleware/auth.middleware");
const { Expo } = require('expo-server-sdk');
const logger = require('../utils/logger');
const { 
  sendExpiryNotifications, 
  sendLeaderboardNotifications 
} = require('../controllers/notification.controller');

// Protect all routes
router.use(authenticate);

/**
 * @route   POST /api/notifications/token
 * @desc    Register or update a user's Expo Push Token
 * @access  Private
 */
router.post("/token", async (req, res) => {
  try {
    const { pushToken, deviceId } = req.body;
    const userId = req.user._id;

    // Validate the token format
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Expo push token format" 
      });
    }

    // Validate device ID
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required"
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if this device already has a token
    const existingTokenIndex = user.pushTokens.findIndex(
      tokenObj => tokenObj.deviceId === deviceId
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.pushTokens[existingTokenIndex].token = pushToken;
      user.pushTokens[existingTokenIndex].createdAt = new Date();
    } else {
      // Add new token
      user.pushTokens.push({
        token: pushToken,
        deviceId,
        createdAt: new Date()
      });
    }

    // Save the updated user
    await user.save();

    logger.info(`Push token registered for user: ${userId}, device: ${deviceId}`);
    
    res.status(200).json({
      success: true,
      message: "Push token registered successfully"
    });
  } catch (error) {
    logger.error(`Error registering push token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error registering push token"
    });
  }
});

/**
 * @route   DELETE /api/notifications/token
 * @desc    Remove a device's push token
 * @access  Private
 */
router.delete("/token", async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required"
      });
    }

    // Update user by removing the token for this device
    const result = await User.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { deviceId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Token not found for this device"
      });
    }

    logger.info(`Push token removed for user: ${userId}, device: ${deviceId}`);
    
    res.status(200).json({
      success: true,
      message: "Push token removed successfully"
    });
  } catch (error) {
    logger.error(`Error removing push token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error removing push token"
    });
  }
});

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put("/settings", async (req, res) => {
  try {
    const { expiryAlerts, leaderboardAlerts } = req.body;
    const userId = req.user._id;

    // Update notification settings
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        "notificationSettings.expiryAlerts": expiryAlerts,
        "notificationSettings.leaderboardAlerts": leaderboardAlerts
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      settings: user.notificationSettings
    });
  } catch (error) {
    logger.error(`Error updating notification settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error updating notification settings"
    });
  }
});

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get("/settings", async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      settings: user.notificationSettings
    });
  } catch (error) {
    logger.error(`Error fetching notification settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching notification settings"
    });
  }
});

// TESTING ENDPOINTS - CONSIDER REMOVING IN PRODUCTION OR ADDING ADMIN CHECK

/**
 * @route   POST /api/notifications/test/expiry
 * @desc    Manually trigger expiry notifications (for testing)
 * @access  Private
 */
router.post("/test/expiry", async (req, res) => {
  try {
    const result = await sendExpiryNotifications();
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error sending test expiry notifications: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error sending test notifications",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/test/leaderboard
 * @desc    Manually trigger leaderboard notifications (for testing)
 * @access  Private
 */
router.post("/test/leaderboard", async (req, res) => {
  try {
    const result = await sendLeaderboardNotifications();
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error sending test leaderboard notifications: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error sending test notifications",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/test/direct
 * @desc    Send a direct test notification to the current user
 * @access  Private
 */
router.post("/test/direct", async (req, res) => {
  try {
    const { title, body, deviceId } = req.body;
    const userId = req.user._id;
    
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Title and body are required"
      });
    }
    
    // Get user's push token(s)
    const user = await User.findById(userId);
    
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User doesn't have any registered push tokens"
      });
    }
    
    // Set up expo client
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();
    
    // Prepare messages
    const messages = [];
    
    // If deviceId is provided, send only to that device
    if (deviceId) {
      const tokenObj = user.pushTokens.find(t => t.deviceId === deviceId);
      
      if (!tokenObj) {
        return res.status(404).json({
          success: false,
          message: "Device not found for this user"
        });
      }
      
      if (!Expo.isExpoPushToken(tokenObj.token)) {
        return res.status(400).json({
          success: false,
          message: "Push token is not valid"
        });
      }
      
      messages.push({
        to: tokenObj.token,
        sound: 'default',
        title,
        body,
        data: { type: 'TEST_NOTIFICATION' }
      });
    } else {
      // Send to all user's devices
      for (const tokenObj of user.pushTokens) {
        if (Expo.isExpoPushToken(tokenObj.token)) {
          messages.push({
            to: tokenObj.token,
            sound: 'default',
            title,
            body,
            data: { type: 'TEST_NOTIFICATION' }
          });
        }
      }
    }
    
    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid push tokens found"
      });
    }
    
    // Send test notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error(`Error sending test notification: ${error}`);
        return res.status(500).json({
          success: false,
          message: "Error sending test notification",
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Test notification sent to ${messages.length} device(s)`,
      tickets
    });
  } catch (error) {
    logger.error(`Error sending direct test notification: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error sending test notification",
      error: error.message
    });
  }
});

module.exports = router;