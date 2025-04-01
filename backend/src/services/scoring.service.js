const logger = require("../utils/logger");
const UserInventory = require("../models/userInventory.model");

/**
 * Calculate days remaining until expiry date
 * @param {Date} expiryDate - Product expiry date
 * @returns {Number} - Days remaining until expiry
 */
const calculateDaysRemaining = (expiryDate) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  return Math.ceil((expiry - currentDate) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate score for a product based on expiry status and days remaining
 * @param {Number} daysRemaining - Days remaining until expiry
 * @param {String} status - Product status (not_expired, expired, consumed)
 * @returns {Number} - Score value
 */
const calculateProductScore = (daysRemaining, status) => {
  if (status === 'consumed') {
    return 0; // Consumption bonus handled separately
  }
  
  if (status === 'expired' || daysRemaining < 0) {
    return -10; // Expired products reduce score by 10
  }
  
  if (daysRemaining === 0) {
    return 0; // Day of expiry
  }
  else if (daysRemaining >= 1 && daysRemaining <= 9) {
    return daysRemaining; // 1 to 9 days = 1 to 9 points
  }
  else if (daysRemaining >= 10) {
    return 10; // Max 10 points for products with 10+ days
  }
  else {
    return 0; // Default case
  }
};

/**
 * Update a user's inventory score
 * @param {String} userId - User ID
 * @param {Number} scoreChange - Points to add or subtract
 */
const updateUserScore = async (userId, scoreChange) => {
  try {
    if (scoreChange === 0) return;

    const inventory = await UserInventory.findOne({ userId });
    if (!inventory) {
      logger.error(`No inventory found for user ${userId}`);
      return;
    }

    inventory.score += scoreChange;
    await inventory.save();
    logger.debug(`Updated score for user ${userId} by ${scoreChange} points to ${inventory.score}`);
  } catch (error) {
    logger.error(`Error updating user score: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate and add consumption bonus
 * @param {Object} product - Product object
 * @returns {Number} - Bonus points awarded
 */
const calculateConsumptionBonus = async (product) => {
  try {
    const daysRemaining = calculateDaysRemaining(product.dateOfExpiry);
    let consumptionBonus = 0;
    
    // Award 5 bonus points if consumed before expiry
    if (daysRemaining >= 0) {
      consumptionBonus = 5;
      await updateUserScore(product.userId, consumptionBonus);
    }
    
    return consumptionBonus;
  } catch (error) {
    logger.error(`Error calculating consumption bonus: ${error.message}`);
    throw error;
  }
};

module.exports = {
  calculateDaysRemaining,
  calculateProductScore,
  updateUserScore,
  calculateConsumptionBonus
};