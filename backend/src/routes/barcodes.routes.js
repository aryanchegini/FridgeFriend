const express = require("express");
const axios = require("axios");
const router = express.Router();
const Barcode = require("../models/barcode.model");
const Product = require("../models/product.model");
const authenticate = require("../middleware/auth.middleware");



// @desc    GET product info from barcode
// @route   GET /barcodes/:code
// @access   Private (Requires `access_token`)
router.get("/:code", authenticate, async (req, res) => {
    try {
        const barcode = req.params.code;

        // Checking if its in the database:
        const barcodeEntry = await Barcode.findOne({ barcode });

        if (barcodeEntry) {
            return res.json({
                success: true,
                source: "database",
                product_name: barcodeEntry.productName,
                message: "Product found in database"
            });
        }

        // If not found in database, fetch from the external barcode API:
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

            // Storing to reduce API requests to the API
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