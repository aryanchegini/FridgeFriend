const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const User = require("../models/user.model");
const UserInventory = require("../models/userInventory.model");

/**
 * Register a new user
 * @param {String} name - User name
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Promise<Object>} - User and token
 * @returns {Promise<Object>} - User and token
 */
const registerUser = async (name, email, password) => {
  try {
    // Validate required fields
    if (!email || !password || !name) {
      throw new Error("Please provide a name, email and password");
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new Error("User already exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const createdUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Create user inventory
    await UserInventory.create({
      userId: createdUser._id,
      products: [],
      score: 0,
    });

    // Generate token
    const token = generateJWT(createdUser._id);

    return {
      token,
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
      },
    };
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    throw error;
  }
};

/**
 * Login a user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Promise<Object>} - User and token
 */
const loginUser = async (email, password) => {
  try {
    // Validate required fields
    if (!email || !password) {
      throw new Error("Please provide an email and password");
    }

    // Find user by email (include password for verification)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = generateJWT(user._id);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    throw error;
  }
};

/**
 * Get user profile
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User profile
 */
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
    };
  } catch (error) {
    logger.error(`Error fetching user profile: ${error.message}`);
    throw error;
  }
};

/**
 * Generate JWT token
 * @param {String} id - User ID
 * @returns {String} - JWT token
 */
const generateJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  generateJWT,
};