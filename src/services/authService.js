/**
 * Authentication Service
 * Handles admin login and token generation
 */

const config = require('../config');

/**
 * Verify admin credentials
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {boolean} True if credentials are valid
 */
function verifyCredentials(username, password) {
    return (
        username === config.admin.username &&
        password === config.admin.password
    );
}

/**
 * Generate a simple token (in production, use JWT)
 * @param {string} username - Admin username
 * @returns {string} Token
 */
function generateToken(username) {
    const timestamp = Date.now();
    const token = Buffer.from(`${username}:${timestamp}:${config.admin.secret}`).toString('base64');
    return token;
}

/**
 * Verify token validity
 * @param {string} token - Token to verify
 * @returns {boolean} True if token is valid
 */
function verifyToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [username, timestamp, secret] = decoded.split(':');
        
        if (username !== config.admin.username || secret !== config.admin.secret) {
            return false;
        }
        
        // Token valid for 24 hours
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        return tokenAge < maxAge;
    } catch (err) {
        console.error('[authService.verifyToken] Error:', err.message);
        return false;
    }
}

module.exports = {
    verifyCredentials,
    generateToken,
    verifyToken,
};
