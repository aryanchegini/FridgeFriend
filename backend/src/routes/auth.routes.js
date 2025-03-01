const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');



// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (username === "test" && password === "password") {
    return res.status(200).json({message: "Login successful" });
  } else {
    return res.status(401).json({message: "Invalid credentials" });
  }
});

// Register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    return res.status(201).json({message: "User registered"})
})

// Logout
router.post("/logout", (req, res) => {
  return res.status(200).json({message: "Logout successful"});
});


// Me: Get the user details
router.get("/details", (req, res) => {
    return res.status(200).json({mesesage: "Got user details"})
})



module.exports = router;


