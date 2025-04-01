const logger = require("../utils/logger");
const Product = require("../models/product.model");
const UserInventory = require("../models/userInventory.model");
const scoringService = require("./scoring.service");

const ALLOWED_STATUS = ["not_expired", "expired", "consumed"];

/**
 * Get all products for a user
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - List of products
 */
const getUserProducts = async (userId) => {
  try {
    return await Product.find({ userId });
  } catch (error) {
    logger.error(`Error fetching products for user ${userId}: ${error.message}`);
    throw error;
  }
};

/**
 * Create a new product
 * @param {String} userId - User ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} - Created product
 */
const createProduct = async (userId, productData) => {
  try {
    // Verify inventory exists
    const inventory = await UserInventory.findOne({ userId });
    if (!inventory) {
      throw new Error("Inventory not found");
    }

    // Validate product data
    const { productName, quantity, dateOfExpiry } = productData;
    
    if (!productName || !quantity || !dateOfExpiry) {
      throw new Error("Missing required fields");
    }
    
    // Validate date format
    if (isNaN(Date.parse(dateOfExpiry))) {
      throw new Error("Invalid date format");
    }
    
    // Validate quantity
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive number");
    }
    
    // Set default status or validate provided status
    let status = "not_expired";
    if (productData.status) {
      if (!ALLOWED_STATUS.includes(productData.status)) {
        throw new Error("Invalid status");
      }
      status = productData.status;
    }
    
    // Create product
    const product = await Product.create({
      userId,
      productName,
      quantity,
      dateLogged: Date.now(),
      dateOfExpiry,
      status,
      inventoryId: inventory._id,
    });
    
    // Calculate and apply score
    const daysRemaining = scoringService.calculateDaysRemaining(new Date(dateOfExpiry));
    const initialScore = scoringService.calculateProductScore(daysRemaining, status);
    
    if (initialScore !== 0) {
      await scoringService.updateUserScore(userId, initialScore);
    }
    
    return product;
  } catch (error) {
    logger.error(`Error creating product: ${error.message}`);
    throw error;
  }
};

/**
 * Update product status
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @param {String} newStatus - New status
 * @returns {Promise<Object>} - Updated product
 */
const updateProductStatus = async (userId, productId, newStatus) => {
  try {
    // Verify status is valid
    if (!ALLOWED_STATUS.includes(newStatus)) {
      throw new Error("Invalid status");
    }
    
    // Find product and verify ownership
    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      throw new Error("Product not found or access denied");
    }
    
    const oldStatus = product.status;
    
    // Update status
    product.status = newStatus;
    await product.save();
    
    // Handle consumption bonus
    if (newStatus === 'consumed' && oldStatus !== 'consumed') {
      await scoringService.calculateConsumptionBonus(product);
    }
    
    return product;
  } catch (error) {
    logger.error(`Error updating product status: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a product
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @returns {Promise<Boolean>} - Success indicator
 */
const deleteProduct = async (userId, productId) => {
  try {
    // Find product and verify ownership
    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      throw new Error("Product not found or access denied");
    }
    
    // Handle point adjustment for deletion
    if (product.status !== 'expired') {
      let pointsToSubtract = 0;
      
      if (product.status === 'consumed') {
        // If consumed, subtract consumption bonus (5) + original days score
        const daysRemaining = scoringService.calculateDaysRemaining(product.dateOfExpiry);
        if (daysRemaining >= 0) {
          // Calculate what the original score would have been
          const originalDayPoints = Math.min(Math.max(daysRemaining, 0), 10);
          pointsToSubtract = originalDayPoints + 5;
        }
      } else {
        // For non-consumed items, use the normal calculation
        const daysRemaining = scoringService.calculateDaysRemaining(product.dateOfExpiry);
        pointsToSubtract = scoringService.calculateProductScore(daysRemaining, product.status);
      }
      
      if (pointsToSubtract !== 0) {
        await scoringService.updateUserScore(userId, -pointsToSubtract);
      }
    }
    
    // Delete product
    const result = await Product.findByIdAndDelete(productId);
    if (!result) {
      return false;
    }
    return true;
  } catch (error) {
    logger.error(`Error deleting product: ${error.message}`);
    throw error;
  }
};

/**
 * Update expiry status and recalculate scores for all products
 */
const updateExpiryAndScores = async () => {
  try {
    logger.info("Starting expiry checks and score updates...");
    
    // Get all active products (not consumed)
    const products = await Product.find({
      status: { $ne: 'consumed' }
    });
    
    // Track score updates by user
    const userScores = {};
    
    // Process each product
    for (const product of products) {
      const originalStatus = product.status;
      const daysRemaining = scoringService.calculateDaysRemaining(product.dateOfExpiry);
      
      // Check if product has expired
      if (daysRemaining <= 0 && originalStatus === 'not_expired') {
        product.status = 'expired';
        await product.save();
      }
      
      // Calculate score for this product
      const productScore = scoringService.calculateProductScore(daysRemaining, product.status);
      
      // Track score by user
      if (!userScores[product.userId]) {
        userScores[product.userId] = 0;
      }
      userScores[product.userId] += productScore;
    }
    
    // Update all user inventory scores
    for (const userId in userScores) {
      // Find user's inventory and update score
      const inventory = await UserInventory.findOne({ userId });
      if (inventory) {
        // Reset score rather than increment, to ensure accurate calculation
        inventory.score = userScores[userId];
        await inventory.save();
      }
    }

    logger.info(`Updated expiry status and scores for ${products.length} products`);
    return true;
  } 
  catch (error) {
    logger.error(`Error in expiry and score updates: ${error.message}`);
    throw error;
  }
};

/**
 * Perform monthly cleanup of expired/consumed products
 */
const monthlyCleanup = async () => {
  try {
    logger.info("Starting monthly cleanup...");
    
    const result = await Product.deleteMany({
      status: { $in: ['expired', 'consumed'] }
    });
    
    logger.info(`Deleted ${result.deletedCount} expired/consumed products`);
    
    // Recalculate scores after cleanup
    await updateExpiryAndScores();
    
    logger.info("Monthly cleanup completed");
    return result.deletedCount;
  } catch (error) {
    logger.error(`Error in monthly cleanup: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getUserProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
  updateExpiryAndScores,
  monthlyCleanup,
};