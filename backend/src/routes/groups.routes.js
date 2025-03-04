const express = require("express");
const {
  getGroups,
  createGroup,
  joinGroupByCode,
} = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

// Protect all routes in this router
router.use(authenticate);

router.route("/").get(getGroups).post(createGroup);

router.post("/join", joinGroupByCode);

module.exports = router;
