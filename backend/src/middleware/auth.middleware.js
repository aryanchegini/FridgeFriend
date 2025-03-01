const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'secret_key';


/**
 * Middleware function to authenticate requests using JWT.
 * It verifies the token and extracts user data
 */
const authenticate = (req, res, next) => {
}




console.log("yay");