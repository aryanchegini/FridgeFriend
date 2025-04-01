const redis = require("redis");
const logger = require("../utils/logger");
require("dotenv").config();

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000) // Handles reconnection strategy
    }
});

let redisAvailable = false;
let redisLoggedError = false; // Prevents repeated error spam

const connectRedis = async () => {
    try {
        await redisClient.connect();
        redisAvailable = true;
        redisLoggedError = false;
        logger.info("Connected to Redis Cloud successfully!");
    } catch (err) {
        redisAvailable = false;
        logger.error("Redis Cloud connection failed:", err.message);
    }

    // Handling Redis runtime errors
    redisClient.on("error", (err) => {
        if (!redisLoggedError) {
            logger.error("Redis Cloud error:", err.message);
            redisLoggedError = true; // Prevents repeated spam logs
        }
        redisAvailable = false;
    });
};

/**
 * Get a value from Redis
 * @param {String} key - Redis key
 * @returns {Promise<String|null>} - Value or null if not found
 */
const get = async (key) => {
    if (!redisAvailable) return null;
    
    try {
        return await Promise.race([
            redisClient.get(key),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 2000))
        ]);
    } catch (err) {
        if (!redisLoggedError) {
            logger.warn("Redis lookup failed:", err.message);
            redisLoggedError = true;
        }
        return null;
    }
};

/**
 * Set a value in Redis with expiration
 * @param {String} key - Redis key
 * @param {Number} expiry - Expiration time in seconds
 * @param {String} value - Value to store
 * @returns {Promise<Boolean>} - Success indicator
 */
const setEx = async (key, expiry, value) => {
    if (!redisAvailable) return false;
    
    try {
        await redisClient.setEx(key, expiry, value);
        return true;
    } catch (err) {
        if (!redisLoggedError) {
            logger.warn("Failed to cache in Redis:", err.message);
            redisLoggedError = true;
        }
        return false;
    }
};

/**
 * Delete a key from Redis
 * @param {String} key - Redis key
 * @returns {Promise<Boolean>} - Success indicator
 */
const del = async (key) => {
    if (!redisAvailable) return false;
    
    try {
        await redisClient.del(key);
        return true;
    } catch (err) {
        if (!redisLoggedError) {
            logger.warn("Failed to delete from Redis:", err.message);
            redisLoggedError = true;
        }
        return false;
    }
};

/**
 * Check if Redis is available
 * @returns {Boolean} - Redis availability status
 */
const isAvailable = () => redisAvailable;

// Close Redis connection
const quit = async () => {
    if (redisAvailable) {
        await redisClient.quit();
        logger.info("Redis connection closed");
    }
};

module.exports = {
    connectRedis,
    get,
    setEx,
    del,
    isAvailable,
    quit
};