const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Import User model to potentially check if user still exists
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const protect = async (req, res, next) => {
    let token;

    // Check if the Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Bearer TOKEN_STRING)
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Get user ID from the decoded token payload (assuming it's stored as 'id')
            // Attach user ID to the request object
            // We find the user MINUS the password for security
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                // If user belonging to token no longer exists
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

module.exports = { protect };