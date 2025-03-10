const express = require("express");
const {
  login,
  register,
  logout,
  getMe,
} = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");
const { savePushToken } = require("../controllers/notificationController");
const router = express.Router();

// Login
router.post("/login", login);

// Register
router.post("/register", register);

//Logout
router.post("/logout", authenticate, logout);

// Save pushToken
router.post("/push-token", authenticate, savePushToken);

// Get user information
router.get("/me", authenticate, getMe);

module.exports = router;
