const { Expo } = require("expo-server-sdk");
const logger = require("../utils/logger");

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
      if (!Expo.isExpoPushToken(message.to)) {
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
 * @param {String} pushToken - User's Expo push token
 * @param {String} productName - Name of the product expiring soon
 * @param {Number} daysRemaining - Days remaining until expiration
 * @returns {Object} - Formatted notification message
 */
const createExpirationMessage = (pushToken, productName, daysRemaining) => {
  const title =
    daysRemaining <= 0 ? "Food Expired Today!" : "Food Expiring Soon!";

  const body =
    daysRemaining <= 0
      ? `${productName} has expired today. Remember to check it.`
      : `${productName} will expire in ${daysRemaining} day${
          daysRemaining > 1 ? "s" : ""
        }. Use it soon!`;

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
};

/**
 * Create a message for leaderboard status notification
 * @param {String} pushToken - User's Expo push token
 * @param {String} groupName - Name of the group
 * @param {Number} rank - User's current rank in the leaderboard
 * @param {Number} pointsToNext - Points needed to reach next rank
 * @returns {Object} - Formatted notification message
 */
const createLeaderboardMessage = (pushToken, groupName, rank, pointsToNext) => {
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
};

module.exports = {
  sendNotifications,
  createExpirationMessage,
  createLeaderboardMessage,
};
