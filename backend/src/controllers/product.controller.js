// Have access to req.user._id
const asyncHandler = require("express-async-handler");
const productModel = require("../models/product.model");
const inventoryModel = require("../models/userInventory.model");

const allowedStatus = ["not_expired", "expired", "consumed"];

// @route GET /products/
const getProducts = asyncHandler(async (req, res) => {
  const products = await productModel.find({ userId: req.user._id });

  res.status(200);
  res.json(products);
});

// @route POST /products/
const createProduct = asyncHandler(async (req, res) => {
  // Product belongs to the inventory linked to the user Id
  // Check if user inventory exists
  const inventory = await inventoryModel.findOne({ userId: req.user._id });
  if (!inventory) {
    res.status(400);
    throw new Error("Inventory not found");
  }

  // Checking required field values
  if (!req.body.productName || !req.body.quantity || !req.body.dateOfExpiry) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const { productName, quantity, dateOfExpiry } = req.body;

  // Handling optional field: status
  let status = "not_expired";
  if (req.body.status) {
    if (!allowedStatus.includes(req.body.status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    status = req.body.status;
  }

  // Checking if dateOfExpiry is a valid date
  if (isNaN(Date.parse(dateOfExpiry))) {
    res.status(400);
    throw new Error("Invalid date format");
  }

  // Checking if quantity is a positive number
  if (isNaN(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error("Quantity must be a positive number");
  }

  // Final product creation
  const product = await productModel.create({
    userId: req.user._id,
    productName: productName,
    quantity: quantity,
    dateLogged: Date.now(),
    dateOfExpiry: dateOfExpiry,
    status: status,
    inventoryId: inventory._id,
  });

  res.status(201);
  res.json(product);
});

const updateProductStatus = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const status = req.body.status;

  // Find product & ensure ownership
  const product = await productModel.findOne({
    _id: productId,
    userId: req.user._id,
  });
  if (!product) {
    return res
      .status(403)
      .json({ success: false, message: "You do not own this product" });
  }

  // Checking if status is valid
  if (!allowedStatus.includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  } else {
    product.status = status;
    await product.save();
    res.status(200);
    res.json({
      message: "Status Updated Successfully!",
      updatedProduct: product,
    });
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId;

  // Check if product exists
  // Find product & ensure ownership
  const product = await productModel.findOne({
    _id: productId,
    userId: req.user._id,
  });
  if (!product) {
    return res
      .status(403)
      .json({
        success: false,
        message: "Unauthorized: You do not own this product",
      });
  } else {
    await productModel.findByIdAndDelete(productId);
    res.status(200);
    res.json({ message: "Product Deleted Successfully!" });
  }
});

module.exports = {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
};
