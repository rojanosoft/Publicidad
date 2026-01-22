/**
 * Legacy server.js - Now delegates to src/app.js
 * This file is kept for backwards compatibility
 * 
 * IMPORTANT: In production, prefer using: npm start
 * which runs: node src/app.js
 */

console.log('[server.js] Delegating to src/app.js...');
require('./src/app');
