/**
 * Vercel Serverless Function
 * Exposes the Express app as a Vercel Function
 */

const app = require('../src/app');

// Vercel requires the app to be exported for serverless functions
module.exports = app;
