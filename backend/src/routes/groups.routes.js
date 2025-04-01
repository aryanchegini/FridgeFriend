const express = require("express");
const router = express.Router();
const {
  getGroups,
  createGroup,
  joinGroupByCode,
} = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

// Protect all routes in this router
router.use(authenticate);

// Group routes
router.route("/")
  .get(getGroups)
  .post(createGroup);

// Join group by code
router.post("/join", joinGroupByCode);

module.exports = router;