/**
 * Sistema de Publicidad - Main Application
 * Express server with S3 media management and carousel API
 */

console.log('=== APP.JS LOADING ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

const express = require('express');
const fileUpload = require('express-fileupload');
const config = require('./config');
console.log('✅ Config loaded:', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    s3Bucket: config.s3.bucket,
    s3Region: config.s3.region,
    awsKeysPresent: {
        accessKeyId: config.aws.accessKeyId ? 'YES' : 'NO ❌',
        secretAccessKey: config.aws.secretAccessKey ? 'YES' : 'NO ❌',
    },
    adminConfig: {
        username: config.admin.username,
        hasPassword: config.admin.password ? 'YES' : 'NO',
    },
});

let mediaRoutes, adminRoutes;
try {
    console.log('Attempting to load ./routes/media...');
    mediaRoutes = require('./routes/media');
    console.log('✅ Media routes loaded successfully');
} catch (error) {
    console.error('❌ FAILED to load media routes:', error.message);
    console.error(error.stack);
    throw error;
}

try {
    console.log('Attempting to load ./routes/admin...');
    adminRoutes = require('./routes/admin');
    console.log('✅ Admin routes loaded successfully');
} catch (error) {
    console.error('❌ FAILED to load admin routes:', error.message);
    console.error(error.stack);
    throw error;
}

console.log('Routes imported');

// Initialize Express app
const app = express();

// CRITICAL: Health check FIRST (before any other middleware)
app.get('/health', (req, res) => {
    console.log('[HEALTH] Health check requested');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env: config.nodeEnv 
    });
});

// Debug routes endpoint
app.get('/debug/routes', (req, res) => {
    console.log('[DEBUG] Routes listing requested');
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods),
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push({
                        path: middleware.regexp.toString(),
                        subPath: handler.route.path,
                        methods: Object.keys(handler.route.methods),
                    });
                }
            });
        }
    });
    res.json({ 
        message: 'All registered routes:',
        stackLength: app._router?.stack?.length,
        routes 
    });
});

console.log('✅ Health and debug routes registered');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

console.log('Middleware configured');

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// API Routes
console.log('=== ROUTE MOUNTING DEBUG ===');
console.log('mediaRoutes type:', typeof mediaRoutes);
console.log('mediaRoutes is router?:', mediaRoutes.constructor.name);
console.log('adminRoutes type:', typeof adminRoutes);
console.log('adminRoutes is router?:', adminRoutes.constructor.name);

console.log('Mounting /api/media routes...');
app.use('/api/media', mediaRoutes);
console.log('/api/media mounted - Stack length:', app._router?.stack?.length);

console.log('Mounting /api/admin routes...');
app.use('/api/admin', adminRoutes);
console.log('/api/admin mounted - Stack length:', app._router?.stack?.length);

console.log('Routes mounted successfully');

// 404 Debug handler - LOG ALL UNMATCHED ROUTES (MUST BE LAST MIDDLEWARE)
app.use((req, res) => {
    console.log(`[404 DEBUG] No route matched for ${req.method} ${req.path}`);
    console.log(`[404 DEBUG] Stack length: ${app._router?.stack?.length}`);
    console.log(`[404 DEBUG] Query:`, req.query);
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
        message: 'No route matched this request'
    });
});

// Error handling middleware (MUST BE LAST)
app.use((err, req, res, _next) => {
    console.error('[Error]', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : undefined,
    });
});

// Start server
const port = config.port;
app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     Sistema de Publicidad - Advertising Display System     ║
║           VERSION: 2025-12-03 - ROUTE FIX v2               ║
╠════════════════════════════════════════════════════════════╣
║ 🚀 Server running on port ${port}
║ 🌍 URL: http://localhost:${port}
║ 💾 S3 Bucket: ${config.s3.bucket}
║ 🔒 Bucket Type: ${config.s3.isPublic ? 'PUBLIC' : 'PRIVATE'}
║ 📦 Environment: ${config.nodeEnv}
║ 🔐 Admin Panel: http://localhost:${port}/admin.html
║ ✅ Direct routes (/health, /debug/routes) mounted BEFORE 404 handler
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
