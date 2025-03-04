const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const User = require("../models/user.model");
const UserInventory = require("../models/userInventory.model");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // create user with hashed password
  const createdUser = await User.create({
    name,
    email,
    password: hashedPassword, // Store the hashed password instead of plaintext
  });

  // create user inventory
  const createdInventory = await UserInventory.create({
    userId: createdUser._id,
    products: [],
    score: 0,
  });

  const token = generateJWT(createdUser._id);

  return res.status(201).json({
    success: true,
    token,
    user: {
      id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email and password.",
    });
  }

  // check if a user with that email exists
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
    });
  }

  // check if password matches
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
    });
  }

  // generate token
  const token = generateJWT(user._id);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Successfully logged out.",
  });
});

const generateJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
