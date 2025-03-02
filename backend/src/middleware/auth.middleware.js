const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // Import User model
const SECRET_KEY = process.env.JWT_SECRET || "secret_key";


/**
 * Middleware function to authenticate requests using JWT.
 * It verifies the token and extracts user data.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check if Authorization header is missing or incorrectly formatted
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1]; // Extract token
        const decoded = jwt.verify(token, SECRET_KEY); // Verify JWT

        // Fetch user from database and exclude password field
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = user; // Attach user object to request
        next(); // Move to the next middleware
    } catch (error) {
        console.error("Authentication Error:", error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authenticate;
