const express = require("express");
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/product.controller");
const authenticate = require("../middleware/auth.middleware");

// Protect all routes in this router
router.use(authenticate);

// Product routes
router.route("/")
  .get(getProducts)
  .post(createProduct);

// Product by ID routes
router.route("/:productId")
  .patch(updateProductStatus)
  .delete(deleteProduct);

module.exports = router;