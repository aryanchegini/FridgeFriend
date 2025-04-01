const asyncHandler = require("express-async-handler");
const notificationService = require("../services/notification.service");
const logger = require("../utils/logger");

/**
 * @desc    Register or update a user's Expo Push Token
 * @route   POST /api/notifications/token
 * @access  Private
 */
const registerPushToken = asyncHandler(async (req, res) => {
  try {
    const { pushToken, deviceId } = req.body;
    const userId = req.user._id;

    await notificationService.registerPushToken(userId, pushToken, deviceId);
    
    res.status(200).json({
      success: true,
      message: "Push token registered successfully"
    });
  } catch (error) {
    if (error.message.includes("Invalid") || error.message.includes("required")) {
      res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    } else if (error.message.includes("not found")) {
      res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Remove a device's push token
 * @route   DELETE /api/notifications/token
 * @access  Private
 */
const removePushToken = asyncHandler(async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user._id;

    await notificationService.removePushToken(userId, deviceId);
    
    res.status(200).json({
      success: true,
      message: "Push token removed successfully"
    });
  } catch (error) {
    if (error.message.includes("required")) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/notifications/settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  try {
    const { expiryAlerts, leaderboardAlerts } = req.body;
    const userId = req.user._id;

    const settings = await notificationService.updateNotificationSettings(
      userId, 
      { expiryAlerts, leaderboardAlerts }
    );

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      settings
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Get notification settings
 * @route   GET /api/notifications/settings
 * @access  Private
 */
const getNotificationSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = await notificationService.getNotificationSettings(userId);

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Get user notifications (inbox)
 * @route   GET /api/notifications/inbox
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await notificationService.getUserNotifications(userId);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    logger.error(`Error fetching inbox: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  try {
    await notificationService.markNotificationAsRead(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

/**
 * @desc    Manually trigger expiry notifications (for testing)
 * @route   POST /api/notifications/test/expiry
 * @access  Private
 */
const testExpiryNotifications = asyncHandler(async (req, res) => {
  try {
    const result = await notificationService.sendExpiryNotifications();
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
 * @desc    Manually trigger leaderboard notifications (for testing)
 * @route   POST /api/notifications/test/leaderboard
 * @access  Private
 */
const testLeaderboardNotifications = asyncHandler(async (req, res) => {
  try {
    const result = await notificationService.sendLeaderboardNotifications();
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
 * @desc    Send a direct test notification to the current user
 * @route   POST /api/notifications/test/direct
 * @access  Private
 */
const testDirectNotification = asyncHandler(async (req, res) => {
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
    const result = await notificationService.sendNotifications(messages);
    
    res.status(200).json({
      success: true,
      message: `Test notification sent to ${messages.length} device(s)`,
      tickets: result.tickets
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

module.exports = {
  registerPushToken,
  removePushToken,
  updateNotificationSettings,
  getNotificationSettings,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  testExpiryNotifications,
  testLeaderboardNotifications,
  testDirectNotification
};