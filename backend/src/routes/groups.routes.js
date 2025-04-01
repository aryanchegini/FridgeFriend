const express = require("express");
const router = express.Router();
const {
  getGroups,
  createGroup,
  joinGroupByCode,
  createInventory
} = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

router.use(authenticate);

router.route("/")
  .get(getGroups)
  .post(createGroup);

// Join group by code
router.post("/join", joinGroupByCode);

router.post("/create-inventory", createInventory);

module.exports = router;