const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const { getProductByBarcode } = require("../controllers/barcode.controller");

// Protect all routes
router.use(authenticate);

// @desc    GET product info from barcode
// @route   GET /api/barcodes/:code
// @access  Private
router.get("/:code", getProductByBarcode);

module.exports = router;