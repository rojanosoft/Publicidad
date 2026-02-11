/**
 * Sistema de Publicidad - Main Application
 * Express server with S3 media management and carousel API
 */

console.log('=== APP.JS LOADING ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

const express = require('express');
const fs = require('fs');
const path = require('path');
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

// Helper function to serve HTML with BASE_PATH injected
function serveHtmlWithBasePath(htmlFile, basePath = '') {
    return (req, res) => {
        try {
            // Ensure BASE_PATH ends with / if not empty, and is not the root
            let baseProp = basePath;
            if (baseProp && !baseProp.endsWith('/')) {
                baseProp += '/';
            }
            
            let htmlContent = fs.readFileSync(path.join(__dirname, `../public/${htmlFile}`), 'utf8');
            
            // Replace base href with correct BASE_PATH
            htmlContent = htmlContent.replace(
                /<base[^>]*href="[^"]*"/,
                `<base id="basePathTag" href="${baseProp || '/'}">`
            );
            
            // Inject window.BASE_PATH if not already in the script
            const basePathScript = `<script>window.BASE_PATH = "${baseProp || '/'}";</script>`;
            htmlContent = htmlContent.replace(
                /<script>\s*window\.BASE_PATH[^<]*<\/script>/,
                basePathScript
            );
            
            res.type('text/html').send(htmlContent);
        } catch (error) {
            console.error(`[serveHtmlWithBasePath] Error serving ${htmlFile}:`, error.message);
            res.status(500).send('Error loading page');
        }
    };
}

// Serve HTML files with BASE_PATH support
console.log('[app.js] Setting up dynamic HTML routes...');
if (config.basePath) {
    // Root path with basePath
    app.get(`${config.basePath}/`, serveHtmlWithBasePath('index.html', config.basePath));
    app.get(`${config.basePath}/index.html`, serveHtmlWithBasePath('index.html', config.basePath));
    app.get(`${config.basePath}/admin`, serveHtmlWithBasePath('admin.html', config.basePath));
    app.get(`${config.basePath}/admin.html`, serveHtmlWithBasePath('admin.html', config.basePath));
    console.log(`[app.js] Dynamic routes registered for BASE_PATH: ${config.basePath}`);
}

// Root path without basePath (default)
app.get('/', serveHtmlWithBasePath('index.html', config.basePath));
app.get('/index.html', serveHtmlWithBasePath('index.html', config.basePath));
app.get('/admin', serveHtmlWithBasePath('admin.html', config.basePath));
app.get('/admin.html', serveHtmlWithBasePath('admin.html', config.basePath));
console.log('[app.js] Dynamic HTML routes registered (root)');


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Serve static files with base path support
console.log('[app.js] Setting up static files...');
if (config.basePath) {
    console.log(`[app.js] Using BASE_PATH: ${config.basePath}`);
    app.use(config.basePath, express.static('public'));
} else {
    console.log('[app.js] No BASE_PATH - serving from root');
    app.use(express.static('public'));
}

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

// Mount API routes with base path support
const apiPrefix = config.basePath ? `${config.basePath}/api` : '/api';
console.log(`[app.js] API routes will be mounted at: ${apiPrefix}`);

console.log('Mounting /api/media routes...');
app.use(`${apiPrefix}/media`, mediaRoutes);
console.log(`/api/media mounted at ${apiPrefix}/media - Stack length:`, app._router?.stack?.length);

console.log('Mounting /api/admin routes...');
app.use(`${apiPrefix}/admin`, adminRoutes);
console.log(`/api/admin mounted at ${apiPrefix}/admin - Stack length:`, app._router?.stack?.length);

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

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught Exception:', error);
    console.error('[CRITICAL] Stack:', error.stack);
    // Don't exit immediately - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Promise Rejection at:', promise);
    console.error('[CRITICAL] Reason:', reason);
    // Don't exit - just log the error
});

// Start server ONLY if not being imported
if (require.main === module) {
    const port = config.port;
    const server = app.listen(port, () => {
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

    // Handle server errors (like EADDRINUSE)
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`
❌ ERROR: Port ${port} is already in use!`);
            console.error('Solutions:');
            console.error('  1. Stop other instance: pkill -f "node.*app.js"');
            console.error('  2. Find process: lsof -ti:' + port + ' | xargs kill -9');
            console.error('  3. Change PORT in .env or environment variables');
            console.error('\nExiting...\n');
            process.exit(1);
        } else {
            console.error('[SERVER ERROR]', error);
            process.exit(1);
        }
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
        console.log('\n[SHUTDOWN] Received shutdown signal...');
        server.close(() => {
            console.log('[SHUTDOWN] Server closed gracefully');
            process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            console.error('[SHUTDOWN] Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

module.exports = app;
