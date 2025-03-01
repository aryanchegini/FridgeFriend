const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "Got product information" });
});

router.post("/", (req, res) => {
  res.status(201).json({ message: "Posted product" });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.status(200).json({ message: `Deleted product ${id}` });
});

router.patch("/:id", (req, res) => {
  const { id } = req.params;
  res.status(200).json({ message: `Updated product ${id}` });
});

module.exports = router;
