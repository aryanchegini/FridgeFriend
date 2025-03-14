const User = require("../models/user.model");
const Product = require("../models/product.model");
const UserInventory = require("../models/userInventory.model");
const GroupMembership = require("../models/groupMembership.model");
const Group = require("../models/group.model");
const logger = require("../utils/logger");
const cron = require("node-cron");
const asyncHandler = require("express-async-handler");
const notificationService = require("../services/notification.service");

/**
 * Send notifications for products expiring soon
 * Checks for products expiring in 1 day or less
 */
const sendExpiryNotifications = asyncHandler(async () => {
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
      if (!user || !user.notificationSettings?.expiryAlerts || !user.pushTokens || user.pushTokens.length === 0) {
        continue;
      }
      
      // Process each product for this user
      for (const product of userProductsMap[userId]) {
        // Calculate days remaining until expiry
        const daysRemaining = Math.ceil(
          (product.dateOfExpiry - currentDate) / (1000 * 60 * 60 * 24)
        );
        
        // Create notification message for each device
        for (const tokenObj of user.pushTokens) {
          const message = notificationService.createExpirationMessage(
            tokenObj.token,
            product.productName,
            daysRemaining
          );
          
          messages.push(message);
        }
      }
    }
    
    // Send notifications if there are any messages
    if (messages.length > 0) {
      const result = await notificationService.sendNotifications(messages);
      logger.info(`Sent ${result.ticketsCount} expiry notifications`);
      return { success: true, notificationsSent: result.ticketsCount };
    }
    
    return { success: true, notificationsSent: 0 };
  } catch (error) {
    logger.error(`Error sending expiry notifications: ${error.message}`);
    return { success: false, error: error.message };
  }
});

/**
 * Send leaderboard notifications to users close to advancing in rank
 */
const sendLeaderboardNotifications = asyncHandler(async () => {
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
        // Skip if user has disabled leaderboard alerts or has no tokens
        if (!user.notificationsEnabled || user.pushTokens.length === 0) {
          return;
        }
        
        const rank = index + 1;
        
        // Check if user is not already at the top
        if (rank > 1) {
          const userAbove = leaderboardData[index - 1];
          const pointsToNext = userAbove.score - user.score;
          
          // Only notify if they're close (within 5 points) to moving up
          if (pointsToNext <= 5) {
            // Send notification to each device
            for (const tokenObj of user.pushTokens) {
              const message = notificationService.createLeaderboardMessage(
                tokenObj.token,
                group.groupName,
                rank,
                pointsToNext
              );
              
              messages.push(message);
            }
          }
        } else if (rank === 1) {
          // Notify the top user on each device
          for (const tokenObj of user.pushTokens) {
            const message = notificationService.createLeaderboardMessage(
              tokenObj.token,
              group.groupName,
              rank,
              0
            );
            
            messages.push(message);
          }
        }
      });
      
      // Send notifications if there are any messages
      if (messages.length > 0) {
        const result = await notificationService.sendNotifications(messages);
        notificationCount += result.ticketsCount;
      }
    }
    
    logger.info(`Sent ${notificationCount} leaderboard notifications`);
    return { success: true, notificationsSent: notificationCount };
  } catch (error) {
    logger.error(`Error sending leaderboard notifications: ${error.message}`);
    return { success: false, error: error.message };
  }
});

/**
 * Set up scheduled notification tasks
 */
const setupNotificationScheduler = () => {
  // Run expiry notifications every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    await sendExpiryNotifications();
  });
  
  // Run leaderboard notifications once a week on Sunday at 12:00 PM
  cron.schedule('0 12 * * 0', async () => {
    await sendLeaderboardNotifications();
  });
  
  logger.info("Notification schedulers initialized");
};

module.exports = {
  sendExpiryNotifications,
  sendLeaderboardNotifications,
  setupNotificationScheduler
};