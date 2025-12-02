/**
 * Authentication Middleware
 * Protects admin routes
 */

const { verifyToken } = require('../services/authService');

/**
 * Middleware to verify admin token
 */
function authMiddleware(req, res, next) {
    const token = req.headers['x-admin-token'] || req.cookies?.adminToken;

    if (!token) {
        console.log('[authMiddleware] No token provided');
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    if (!verifyToken(token)) {
        console.log('[authMiddleware] Invalid token');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    console.log('[authMiddleware] Token valid, proceeding');
    next();
}

module.exports = authMiddleware;
