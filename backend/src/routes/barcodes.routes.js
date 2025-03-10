const express = require("express");
const axios = require("axios");
const redis = require("redis");
const router = express.Router();
const Barcode = require("../models/barcode.model");
const Product = require("../models/product.model");
const authenticate = require("../middleware/auth.middleware");

const redisClient = redis.createClient();

redisClient.connect().catch(err => {
    // Start the app but without Redis. Database and API fetching should work (?but doesnt solve problem?)
    console.error("Redis connection failed, App still runs but barcode scanner doesn't work");
});


// @desc    GET product info from barcode
// @route   GET /barcodes/:code
// @access   Private (Requires `access_token`)
router.get("/:code", authenticate, async (req, res) => {
    try {
        const barcode = req.params.code;


        /**
         * STEP 1. Checking if product is in Redis cache
         */
        let cachedProduct;
        try {
            cachedProduct = await Promise.race([
                redisClient.get(barcode),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 2000))
            ]);
        } catch (err) {
            // If redis is not running, skip the cache lookup (?but doesnt solve problem?)
            console.warn("Redis is down or slow, skipping the cache lookup");
        }

        if (cachedProduct) {
            return res.json({
                success: true,
                source: "redis-cache",
                product_name: cachedProduct,
                message: "Product found in Redis cache"
            });
        }


        /**
         * STEP 2. Checking if product is in MongoDB database
         */
        const barcodeEntry = await Barcode.findOne({ barcode });

        if (barcodeEntry) {

            try {
                await redisClient.setEx(barcode, 86400, barcodeEntry.productName);
            } catch (err) {
                console.warn("Failed to cache in Redis, but proceeding")
            }

            
            return res.json({
                success: true,
                source: "database",
                product_name: barcodeEntry.productName,
                message: "Product found in database"
            });
        }


        /**
         * STEP 3. If not found in steps 1 or 2, fetch from the API
         */
        /**  
        * Using Open Food Facts API https://openfoodfacts.github.io/openfoodfacts-server/api/
        * Currently using the staging environment; for the production environment replace '.net' with '.org'
        * Also specifying 'brands' to use as fallback (since API is crowdsourced)
        */
        const externalApiUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=product_name,brands`;
        const response = await axios.get(externalApiUrl);


        if (response.data && response.data.product) {
            // Extracting product name with fallback to the 'brands' field
            const productName = response.data.product.product_name || response.data.product.brands;

            // Throwing error if the product name or brand isnt there
            if (!productName) {
                return res.status(404).json({
                    success: false,
                    message: "Product name not found in external API",
                });
            }

            // Cache the product in Redis for 24 hours
            try {
                await redisClient.setEx(barcode, 86400, productName);
            } catch (err) {
                console.warn("Failed to cache in Redis, but proceeding...")
            }
            
            // Store the product in MongoDB database persistently
            await Barcode.create({
                barcode,
                productName
            });

            return res.json({
                success: true,
                source: "external-api",
                product_name: productName,
                message: "Product found in external API"
            });
        }

        return res.status(404).json({
            success: false,
            message: "Product not found in database or external API",
        });
    } catch (error) {
        console.error("Error fetching barcode data: ", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});



module.exports = router;