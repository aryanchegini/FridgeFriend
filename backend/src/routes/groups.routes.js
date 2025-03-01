const express = require("express");
const {
  getGroups,
  createGroup,
  joinGroup,
  joinGroupByCode,
} = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

// Protect all routes in this router
router.use(authenticate);

router.route("/").get(getGroups).post(createGroup);

router.post("/join", joinGroupByCode);
router.put("/:groupId/join", joinGroup);

module.exports = router;
