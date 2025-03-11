const express = require("express");
const axios = require("axios");
const redis = require("redis");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");

// Creating the Redis client
const redisClient = redis.createClient();
let redisAvailable = false;
let redisLoggedError = false;   // Prevents repeated spamming errors

// Connect to Redis and track its availability
redisClient.connect().then(() => {
    redisAvailable = true;
    redisLoggedError = false;
    console.log("Redis connected successfully");
}).catch(err => {
    redisAvailable = false;
    console.error("Redis connection failed:", err.message);
});

// Handle Redis errors after initial connection
redisClient.on("error", (err) => {
    if (!redisLoggedError) {
    console.error("Redis connection error:", err.message);
    redisLoggedError = true;    // Supress repeated errors
    }
    redisAvailable = false;
});

// @desc    GET product info from barcode
// @route   GET /barcodes/:code
// @access  Private (Requires `access_token`)
router.get("/:code", authenticate, async (req, res) => {
    try {
        const barcode = req.params.code;

        /**
         * STEP 1: Checking if product is in Redis cache (only if Redis is available)
         */
        let cachedProduct = null;
        if (redisAvailable) {
            try {
                cachedProduct = await Promise.race([
                    redisClient.get(barcode),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 2000))
                ]);
            } catch (err) {
                if (!redisLoggedError) {
                console.warn("Redis lookup failed:", err.message);
                redisLoggedError = true;    // Prevents spamming this message
                }
            }

            if (cachedProduct) {
                return res.json({
                    success: true,
                    source: "redis-cache",
                    product_name: cachedProduct,
                    message: "Product found in Redis cache"
                });
            }
        }

        /**
         * STEP 2: If not found in Redis cache, fetch product directly from OpenFoodFacts API:
         * 
         * Using OpenFoodFacts API: https://openfoodfacts.github.io/openfoodfacts-server/api/.
         * Currently using the staging environment; for the production environment replace '.net' with '.org'.
         * Also specifying 'brands' to use as fallback (since API is crowdsourced)
         */
        const externalApiUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=product_name,brands`;
        const response = await axios.get(externalApiUrl);

        if (response.data && response.data.product) {
            // Extracting product name with fallback to brand name
            const productName = response.data.product.product_name || response.data.product.brands;

            // Throwing error if the product name or brand isn't there
            if (!productName) {
                return res.status(404).json({
                    success: false,
                    message: "Product name not found in external API",
                });
            }

            // Caching the product in Redis for 24 hours (only if Redis is available)
            if (redisAvailable) {
                try {
                    await redisClient.setEx(barcode, 86400, productName);
                } catch (err) {
                    if (!redisLoggedError) {
                    console.warn("Failed to cache in Redis:", err.message);
                    redisLoggedError = true;
                    }
                }
            }

            return res.json({
                success: true,
                source: "external-api",
                product_name: productName,
                message: "Product fetched from external API"
            });
        }

        return res.status(404).json({
            success: false,
            message: "Product not found in external API",
        });
    } catch (error) {
        console.error("Error fetching barcode data:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;
