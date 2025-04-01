const axios = require("axios");
const logger = require("../utils/logger");
const redisClient = require("../config/redis.config");
const Barcode = require("../models/barcode.model");

/**
 * Get product information by barcode
 * @param {String} barcode - Product barcode
 * @returns {Promise<Object>} - Product information
 */
const getProductByBarcode = async (barcode) => {
  try {
    let cachedProduct = null;
    let source = null;
    
    // Step 1: Check Redis cache
    if (redisClient.isAvailable()) {
      cachedProduct = await redisClient.get(barcode);
      
      if (cachedProduct) {
        logger.debug(`Barcode ${barcode} found in Redis cache`);
        source = "redis-cache";
        return {
          success: true,
          source,
          product_name: cachedProduct,
          message: "Product found in Redis cache"
        };
      }
    }
    
    // Step 2: If not in Redis, fetch from external API
    const externalApiUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=product_name,brands`;
    const response = await axios.get(externalApiUrl);
    
    if (response.data && response.data.product) {
      const productName = response.data.product.product_name || response.data.product.brands;
      
      // If no valid product name, throw error
      if (!productName) {
        logger.debug(`No product name found for barcode ${barcode}`);
        throw new Error("Product name not found in external API");
      }
      
      // Cache product in Redis for 24 hours
      if (redisClient.isAvailable()) {
        await redisClient.setEx(barcode, 86400, productName);
      }
      
      source = "external-api";
      return {
        success: true,
        source,
        product_name: productName,
        message: "Product fetched from external API"
      };
    }
    
    logger.debug(`No product found for barcode ${barcode}`);
    throw new Error("Product not found in external API");
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error("Product not found in external API");
    }
    
    logger.error(`Error fetching barcode data: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getProductByBarcode
};