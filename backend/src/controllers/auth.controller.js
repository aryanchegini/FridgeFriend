const asyncHandler = require("express-async-handler");
const authService = require("../services/auth.service");

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userData = await authService.registerUser(name, email, password);
    
    return res.status(201).json({
      success: true,
      token: userData.token,
      user: userData.user
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    } else if (error.message.includes("provide")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await authService.loginUser(email, password);
    
    return res.status(200).json({
      success: true,
      token: userData.token,
      user: userData.user,
    });
  } catch (error) {
    if (error.message.includes("Invalid credentials")) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    } else if (error.message.includes("provide")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const userData = await authService.getUserProfile(req.user.id);
  
  res.status(200).json({
    success: true,
    data: userData,
  });
});

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Successfully logged out.",
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout,
};