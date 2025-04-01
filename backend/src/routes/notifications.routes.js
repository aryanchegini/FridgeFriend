const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const {
  registerPushToken,
  removePushToken,
  updateNotificationSettings,
  getNotificationSettings,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  testExpiryNotifications,
  testLeaderboardNotifications,
  testDirectNotification
} = require("../controllers/notification.controller");

// Protect all routes
router.use(authenticate);

// Push token management
router.post("/token", registerPushToken);
router.delete("/token", removePushToken);

// Notification settings
router.route("/settings")
  .get(getNotificationSettings)
  .put(updateNotificationSettings);

// Notification inbox
router.get("/inbox", getNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.delete("/:id", deleteNotification);

// Testing endpoints (consider removing in production or adding admin check)
router.post("/test/expiry", testExpiryNotifications);
router.post("/test/leaderboard", testLeaderboardNotifications);
router.post("/test/direct", testDirectNotification);

module.exports = router;