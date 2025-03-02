const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "secret_key";

/**
 * Middleware function to authenticate requests using JWT.
 * It verifies the token and extracts user data
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Checking if Authorisation header is missing or incorrectly formatted
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

};

module.exports = authenticate;
