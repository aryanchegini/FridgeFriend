const express = require("express");
const {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/product.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

// Protect all routes in this router
router.use(authenticate);

router.route("/").get(getProducts).post(setProduct);

router.route("/:productId").patch(updateProductStatus).delete(deleteProduct);

module.exports = router;
