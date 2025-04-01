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
  const product = await productService.createProduct(req.user._id, req.body);
  res.status(201).json(product);
});

/**
 * @desc    Update product status
 * @route   PATCH /api/products/:productId
 * @access  Private
 */
const updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const productId = req.params.productId;
  
  const updatedProduct = await productService.updateProductStatus(
    req.user._id,
    productId,
    status
  );
  
  res.status(200).json({
    message: "Status Updated Successfully!",
    updatedProduct,
  });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:productId
 * @access  Private
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  
  await productService.deleteProduct(req.user._id, productId);
  
  res.status(200).json({ message: "Product Deleted Successfully!" });
});

module.exports = {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
};