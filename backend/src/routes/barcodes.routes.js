const express = require("express");
const axios = require("axios");
const redis = require("redis");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
require("dotenv").config(); // Load environment variables


// Creating Redis client with credentials from .env
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000) // Handles reconnection strategy
    }
});


let redisAvailable = false;
let redisLoggedError = false; // Prevents repeated error spam


// Connecting to Redis Cloud and track availability
redisClient.connect()
    .then(() => {
        redisAvailable = true;
        redisLoggedError = false;
        console.log("Connected to Redis Cloud successfully!");
    })
    .catch(err => {
        redisAvailable = false;
        console.error("Redis Cloud connection failed:", err.message);
    });


// Handling Redis runtime errors
redisClient.on("error", (err) => {
    if (!redisLoggedError) {
        console.error("Redis Cloud error:", err.message);
        redisLoggedError = true; // Prevents repeated spam logs
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
         * STEP 1: Check if product exists in Redis Cloud cache
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
                    redisLoggedError = true; // Prevents spam logging
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
         * STEP 2: If not found in Redis Cloud cache, fetch product directly from OpenFoodFacts API:
         * 
         * Using OpenFoodFacts API: https://openfoodfacts.github.io/openfoodfacts-server/api/.
         * Currently using the staging environment; for the production environment replace '.net' with '.org'.
         * Also specifying 'brands' to use as fallback (since API is crowdsourced)
         */
        const externalApiUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=product_name,brands`;
        const response = await axios.get(externalApiUrl);

        if (response.data && response.data.product) {
            const productName = response.data.product.product_name || response.data.product.brands;

            // If no valid product name, return 404
            if (!productName) {
                return res.status(404).json({
                    success: false,
                    message: "Product name not found in external API",
                });
            }

            // Cache product in Redis for 24 hours
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
