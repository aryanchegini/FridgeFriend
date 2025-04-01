const asyncHandler = require("express-async-handler");
const productService = require("../services/product.service");

/**
 * @desc    Get all products for a user
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = asyncHandler(async (req, res) => {
  const products = await productService.getUserProducts(req.user._id);
  res.status(200).json(products);
});

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = asyncHandler(async (req, res) => {
  try {
    // Validate required fields first to match test expectations
    const { productName, quantity, dateOfExpiry, status } = req.body;
    
    if (!productName) {
      res.status(400);
      throw new Error("Product name is required");
    }
    
    if (!quantity) {
      res.status(400);
      throw new Error("Quantity is required");
    }
    
    if (!dateOfExpiry) {
      res.status(400);
      throw new Error("Date of expiry is required");
    }
    
    // Check if status is valid
    if (status && !["not_expired", "expired", "consumed"].includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    
    const product = await productService.createProduct(req.user._id, req.body);
    res.status(201).json(product);
  } catch (error) {
    // If status code hasn't been set already, set it to 400 for validation errors
    if (!res.statusCode || res.statusCode === 200) {
      res.status(400);
    }
    throw error;
  }
});

/**
 * @desc    Update product status
 * @route   PATCH /api/products/:productId
 * @access  Private
 */
const updateProductStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const productId = req.params.productId;
    
    // Validate status before calling service
    if (!status) {
      res.status(400);
      throw new Error("Status is required");
    }
    
    if (!["not_expired", "expired", "consumed"].includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    
    const updatedProduct = await productService.updateProductStatus(
      req.user._id,
      productId,
      status
    );
    
    res.status(200).json({
      message: "Status Updated Successfully!",
      updatedProduct,
    });
  } catch (error) {
    // If no status code set, use 400 for client errors
    if (!res.statusCode || res.statusCode === 200) {
      res.status(400);
    }
    throw error;
  }
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:productId
 * @access  Private
 */
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Call service and check if product exists
    const result = await productService.deleteProduct(req.user._id, productId);
    
    // If product not found or access denied
    if (!result) {
      res.status(403);
      throw new Error("Product not found or access denied");
    }
    
    res.status(200).json({ message: "Product Deleted Successfully!" });
  } catch (error) {
    // If error message contains specific phrases, set appropriate status code
    if (error.message.includes("not found") || error.message.includes("access denied")) {
      res.status(403);
    }
    throw error;
  }
});

module.exports = {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
};