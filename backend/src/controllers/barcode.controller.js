const asyncHandler = require("express-async-handler");
const barcodeService = require("../services/barcode.service");

/**
 * @desc    Get product information by barcode
 * @route   GET /api/barcodes/:code
 * @access  Private
 */
const getProductByBarcode = asyncHandler(async (req, res) => {
  try {
    const barcode = req.params.code;
    const result = await barcodeService.getProductByBarcode(barcode);
    res.json(result);
  } catch (error) {
    if (error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
});

module.exports = {
  getProductByBarcode
};