const { Expo } = require("expo-server-sdk");
const logger = require("../utils/logger");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");
const UserInventory = require("../models/userInventory.model");
const GroupMembership = require("../models/groupMembership.model");
const Group = require("../models/group.model");

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notifications to users
 * @param {Array} messages - Array of message objects to be sent
 * @returns {Promise<Object>} - Results of the notification sending attempt
 */
const sendNotifications = async (messages) => {
  try {
    // Filter out invalid push tokens
    const validMessages = messages.filter((message) => {
      if (!message.to || !Expo.isExpoPushToken(message.to)) {
        logger.warn(`Invalid Expo push token: ${message.to}`);
        return false;
      }
      return true;
    });

    // Create notification chunks (Expo recommends max 100 notifications per request)
    const chunks = expo.chunkPushNotifications(validMessages);
    const tickets = [];

    // Send each chunk of notifications
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        logger.info(`Sent ${ticketChunk.length} notifications`);
      } catch (error) {
        logger.error(`Error sending notification chunk: ${error}`);
      }
    }

    // Process the tickets to check for errors
    const receiptIds = [];
    for (const ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      } else if (ticket.status === "error") {
        logger.error(`Notification error: ${ticket.message}`);
      }
    }

    // Fetch receipts if any exist (not needed for immediate use but helpful for tracking)
    if (receiptIds.length > 0) {
      const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
      for (const chunk of receiptChunks) {
        try {
          const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

          // Log receipts for debugging
          for (const receiptId in receipts) {
            const { status, message, details } = receipts[receiptId];
            if (status === "error") {
              logger.error(
                `Receipt error for ${receiptId}: ${message}`,
                details
              );
            }
          }
        } catch (error) {
          logger.error(`Error getting receipts: ${error}`);
        }
      }
    }

    return { success: true, ticketsCount: tickets.length };
  } catch (error) {
    logger.error(`Notification service error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Create a message for food expiration notification
 * @param {String} userId - User ID
 * @param {String} pushToken - User's Expo push token (optional)
 * @param {String} productName - Name of the product expiring soon
 * @param {Number} daysRemaining - Days remaining until expiration
 * @returns {Promise<Object>} - Notification message
 */
const createExpirationMessage = async (userId, pushToken, productName, daysRemaining) => {
  const title =
    daysRemaining <= 0 ? "Food Expired Today!" : "Food Expiring Soon!";

  const body =
    daysRemaining <= 0
      ? `${productName} has expired today. Remember to check it.`
      : `${productName} will expire in ${daysRemaining} day${
          daysRemaining > 1 ? "s" : ""
        }. Use it soon!`;

  // Save notification to inbox
  await Notification.create({
    userId,
    type: "FOOD_EXPIRY",
    title,
    body,
    data: { productName, daysRemaining },
  });

  // If push token is provided, prepare push notification
  if (pushToken) {
    return {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: {
        type: "FOOD_EXPIRY",
        productName,
        daysRemaining,
      },
    };
  }
  
  return null;
};

/**
 * Create a message for leaderboard status notification
 * @param {String} userId - User ID
 * @param {String} pushToken - User's Expo push token (optional)
 * @param {String} groupName - Name of the group
 * @param {Number} rank - User's current rank in the leaderboard
 * @param {Number} pointsToNext - Points needed to reach next rank
 * @returns {Promise<Object>} - Notification message
 */
const createLeaderboardMessage = async (userId, pushToken, groupName, rank, pointsToNext) => {
  let title, body;

  if (rank === 1) {
    title = "You're at the top!";
    body = `You're #1 in the ${groupName} leaderboard! Keep up the good work!`;
  } else if (pointsToNext <= 5) {
    title = "Almost there!";
    body = `You're #${rank} in ${groupName}. Just ${pointsToNext} points more to climb the leaderboard!`;
  } else {
    title = "Leaderboard Update";
    body = `You're ranked #${rank} in ${groupName}. ${pointsToNext} points to move up.`;
  }
  
  // Save notification to inbox
  await Notification.create({
    userId,
    type: "LEADERBOARD_UPDATE",
    title,
    body,
    data: { groupName, rank, pointsToNext },
  });

  // If push token is provided, prepare push notification
  if (pushToken) {
    return {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: {
        type: "LEADERBOARD_UPDATE",
        groupName,
        rank,
        pointsToNext,
      },
    };
  }
  
  return null;
};

/**
 * Send notifications for products expiring soon
 * Checks for products expiring in 1 day or less
 * @returns {Promise<Object>} - Notification results
 */
const sendExpiryNotifications = async () => {
  try {
    logger.info("Starting expiry notification checks...");
    
    // Find products expiring within the next day
    const currentDate = new Date();
    const oneDayLater = new Date(currentDate);
    oneDayLater.setDate(currentDate.getDate() + 1);
    
    // Find products that are not expired or consumed and will expire within the next day
    const expiringProducts = await Product.find({
      status: "not_expired",
      dateOfExpiry: {
        $gte: currentDate,
        $lte: oneDayLater
      }
    });
    
    logger.info(`Found ${expiringProducts.length} products expiring soon`);
    
    if (expiringProducts.length === 0) {
      return { success: true, notificationsSent: 0 };
    }
    
    // Group products by user
    const userProductsMap = {};
    
    for (const product of expiringProducts) {
      const userId = product.userId.toString();
      if (!userProductsMap[userId]) {
        userProductsMap[userId] = [];
      }
      userProductsMap[userId].push(product);
    }
    
    // Prepare notification messages
    const messages = [];
    
    // Process each user's products
    for (const userId in userProductsMap) {
      // Fetch the user with their push tokens and settings
      const user = await User.findById(userId);
      
      // Skip if user doesn't exist or has disabled expiry alerts
      if (!user || !user.notificationSettings?.expiryAlerts) {
        continue;
      }
      
      // Process each product for this user
      for (const product of userProductsMap[userId]) {
        // Calculate days remaining until expiry
        const daysRemaining = Math.ceil(
          (product.dateOfExpiry - currentDate) / (1000 * 60 * 60 * 24)
        );

        // For each device token
        if (user.pushTokens && user.pushTokens.length > 0) {
          for (const tokenObj of user.pushTokens) {
            const message = await createExpirationMessage(
              user._id,
              tokenObj.token,
              product.productName,
              daysRemaining
            );
            
            if (message) {
              messages.push(message);
            }
          }
        } else {
          // If no push tokens, just create inbox notification
          await createExpirationMessage(
            user._id,
            null,
            product.productName,
            daysRemaining
          );
        }
      }
    }
    
    // Send notifications if there are any messages
    if (messages.length > 0) {
      const result = await sendNotifications(messages);
      logger.info(`Sent ${result.ticketsCount} expiry notifications`);
      return { success: true, notificationsSent: result.ticketsCount };
    }
    
    return { success: true, notificationsSent: 0 };
  } catch (error) {
    logger.error(`Error sending expiry notifications: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send leaderboard notifications to users close to advancing in rank
 * @returns {Promise<Object>} - Notification results
 */
const sendLeaderboardNotifications = async () => {
  try {
    logger.info("Starting leaderboard notification checks...");
    
    // Get all groups
    const groups = await Group.find({});
    let notificationCount = 0;
    
    for (const group of groups) {
      // Get all members of the group
      const memberships = await GroupMembership.find({
        groupId: group._id,
      });
      
      // Get user IDs from memberships
      const userIds = memberships.map(membership => membership.userId);
      
      // Get scores for all users in the group
      const scores = await UserInventory.find({
        userId: { $in: userIds },
      }).select("userId score");
      
      // Get user details
      const users = await User.find({
        _id: { $in: userIds }
      }).select("_id name pushTokens notificationSettings");
      
      // Create an array with user details and scores
      const leaderboardData = users
        .map(user => {
          // Find the score for this user
          const userScore = scores.find(
            s => s.userId.toString() === user._id.toString()
          );
          
          return {
            userId: user._id,
            name: user.name,
            pushTokens: user.pushTokens || [],
            notificationsEnabled: user.notificationSettings?.leaderboardAlerts,
            score: userScore ? userScore.score : 0,
          };
        })
        .sort((a, b) => b.score - a.score); // Sort by score (descending)
      
      // Create notifications for users
      const messages = [];
      
      leaderboardData.forEach((user, index) => {
        // Skip if user has disabled leaderboard alerts
        if (!user.notificationsEnabled) {
          return;
        }
        
        const rank = index + 1;
        
        // Check if user is not already at the top
        if (rank > 1) {
          const userAbove = leaderboardData[index - 1];
          const pointsToNext = userAbove.score - user.score;
          
          // Only notify if they're close (within 5 points) to moving up
          if (pointsToNext <= 5) {
            // If user has push tokens, send push notification for each device
            if (user.pushTokens && user.pushTokens.length > 0) {
              for (const tokenObj of user.pushTokens) {
                const message = createLeaderboardMessage(
                  user.userId,
                  tokenObj.token,
                  group.groupName,
                  rank,
                  pointsToNext
                );
                
                if (message) {
                  messages.push(message);
                }
              }
            } else {
              // If no push tokens, just create inbox notification
              createLeaderboardMessage(
                user.userId,
                null,
                group.groupName,
                rank,
                pointsToNext
              );
            }
          }
        } else if (rank === 1) {
          // Notify the top user
          if (user.pushTokens && user.pushTokens.length > 0) {
            for (const tokenObj of user.pushTokens) {
              const message = createLeaderboardMessage(
                user.userId,
                tokenObj.token,
                group.groupName,
                rank,
                0
              );
              
              if (message) {
                messages.push(message);
              }
            }
          } else {
            // If no push tokens, just create inbox notification
            createLeaderboardMessage(
              user.userId,
              null,
              group.groupName,
              rank,
              0
            );
          }
        }
      });
      
      // Send notifications if there are any messages
      if (messages.length > 0) {
        const result = await sendNotifications(messages);
        notificationCount += result.ticketsCount;
      }
    }
    
    logger.info(`Sent ${notificationCount} leaderboard notifications`);
    return { success: true, notificationsSent: notificationCount };
  } catch (error) {
    logger.error(`Error sending leaderboard notifications: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Get user notifications (inbox)
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - User notifications
 */
const getUserNotifications = async (userId) => {
  try {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 });
  } catch (error) {
    logger.error(`Error fetching user notifications: ${error.message}`);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} - Success indicator
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true }
    );
    return !!result;
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    throw error;
  }
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} - Success indicator
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });
    return !!result;
  } catch (error) {
    logger.error(`Error deleting notification: ${error.message}`);
    throw error;
  }
};

/**
 * Register or update push token
 * @param {String} userId - User ID
 * @param {String} pushToken - Push token
 * @param {String} deviceId - Device ID
 * @returns {Promise<Boolean>} - Success indicator
 */
const registerPushToken = async (userId, pushToken, deviceId) => {
  try {
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      throw new Error("Invalid Expo push token format");
    }

    if (!deviceId) {
      throw new Error("Device ID is required");
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
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
    return true;
  } catch (error) {
    logger.error(`Error registering push token: ${error.message}`);
    throw error;
  }
};

/**
 * Remove push token
 * @param {String} userId - User ID
 * @param {String} deviceId - Device ID
 * @returns {Promise<Boolean>} - Success indicator
 */
const removePushToken = async (userId, deviceId) => {
  try {
    if (!deviceId) {
      throw new Error("Device ID is required");
    }

    // Update user by removing the token for this device
    const result = await User.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { deviceId } } }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Token not found for this device");
    }

    logger.info(`Push token removed for user: ${userId}, device: ${deviceId}`);
    return true;
  } catch (error) {
    logger.error(`Error removing push token: ${error.message}`);
    throw error;
  }
};

/**
 * Update notification settings
 * @param {String} userId - User ID
 * @param {Object} settings - Notification settings
 * @returns {Promise<Object>} - Updated settings
 */
const updateNotificationSettings = async (userId, settings) => {
  try {
    const { expiryAlerts, leaderboardAlerts } = settings;
    
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
      throw new Error("User not found");
    }

    return user.notificationSettings;
  } catch (error) {
    logger.error(`Error updating notification settings: ${error.message}`);
    throw error;
  }
};

/**
 * Get notification settings
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Notification settings
 */
const getNotificationSettings = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user.notificationSettings;
  } catch (error) {
    logger.error(`Error fetching notification settings: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendNotifications,
  createExpirationMessage,
  createLeaderboardMessage,
  sendExpiryNotifications,
  sendLeaderboardNotifications,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  registerPushToken,
  removePushToken,
  updateNotificationSettings,
  getNotificationSettings
};