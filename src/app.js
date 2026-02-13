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

// Helper function to parse size strings (e.g., '5gb', '50mb') to bytes
function parseSize(sizeStr) {
    const units = { 'b': 1, 'kb': 1024, 'mb': 1024**2, 'gb': 1024**3, 'tb': 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);
    if (!match) return 5 * 1024 * 1024 * 1024; // Default to 5GB
    return Math.round(parseFloat(match[1]) * (units[match[2].toLowerCase()] || 1));
}

const uploadLimitBytes = parseSize(config.media.uploadLimitSize);
console.log(`[app.js] Upload limit configured:`, {
    configured: config.media.uploadLimitSize,
    bytes: uploadLimitBytes,
    mb: Math.round(uploadLimitBytes / (1024 * 1024))
});

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

app.get('/api/debug/upload-config', (req, res) => {
    const bodyBytes = typeof config.media.bodyParserLimit === 'string' 
        ? parseSize(config.media.bodyParserLimit)
        : config.media.bodyParserLimit;
    const rawBytes = typeof config.media.rawBodyLimit === 'string' 
        ? parseSize(config.media.rawBodyLimit)
        : config.media.rawBodyLimit;
    
    res.json({
        uploadLimit: {
            configured: config.media.uploadLimitSize,
            bytes: uploadLimitBytes,
            mb: Math.round(uploadLimitBytes / (1024 * 1024)),
            gb: (uploadLimitBytes / (1024 * 1024 * 1024)).toFixed(2),
        },
        bodyParserLimit: {
            configured: config.media.bodyParserLimit,
            bytes: bodyBytes,
            mb: Math.round(bodyBytes / (1024 * 1024)),
            gb: (bodyBytes / (1024 * 1024 * 1024)).toFixed(2),
        },
        rawBodyLimit: {
            configured: config.media.rawBodyLimit,
            bytes: rawBytes,
            mb: Math.round(rawBytes / (1024 * 1024)),
            gb: (rawBytes / (1024 * 1024 * 1024)).toFixed(2),
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            UPLOAD_LIMIT: process.env.UPLOAD_LIMIT || 'NOT SET',
            BODY_PARSER_LIMIT: process.env.BODY_PARSER_LIMIT || 'NOT SET',
            RAW_BODY_LIMIT: process.env.RAW_BODY_LIMIT || 'NOT SET',
        },
        note: 'All limits must be >= your largest file size'
    });
});


// Middleware - Parse size limit strings to bytes if needed
const bodyLimitSize = typeof config.media.bodyParserLimit === 'string' 
    ? parseSize(config.media.bodyParserLimit)
    : config.media.bodyParserLimit;

const rawLimitSize = typeof config.media.rawBodyLimit === 'string' 
    ? parseSize(config.media.rawBodyLimit)
    : config.media.rawBodyLimit;

console.log(`[app.js] Middleware limits:`, {
    bodyParserLimit: config.media.bodyParserLimit,
    bodyLimitBytes: bodyLimitSize,
    bodyLimitMB: Math.round(bodyLimitSize / (1024 * 1024)),
});

app.use(express.json({ limit: bodyLimitSize }));
app.use(express.urlencoded({ extended: true, limit: bodyLimitSize }));
app.use(express.raw({ limit: rawLimitSize }));

// File upload middleware with proper error handling
const getTempDir = () => {
    // Use system temp directory
    if (process.env.TEMP) return process.env.TEMP; // Windows
    if (process.env.TMP) return process.env.TMP;   // Alternative Windows
    if (process.env.TMPDIR) return process.env.TMPDIR; // Unix/Linux/Mac
    return '/tmp'; // Fallback
};

const tempDir = getTempDir();
console.log(`[app.js] Temp directory for uploads: ${tempDir}`);

app.use(fileUpload({
    limits: { fileSize: uploadLimitBytes },
    useTempFiles: true,  // Use temp files for large uploads instead of memory
    tempFileDir: tempDir,
    abortOnLimit: false, // Don't abort - handle error manually
    createParentPath: true,
    safeFileNames: true,
    preserveExtension: true,
}));

// Middleware to handle file upload limit errors and convert to JSON
app.use((req, res, next) => {
    // Check if fileUpload set an error flag
    if (req.files && req.files.file && req.files.file.truncated) {
        const maxSizeGB = (uploadLimitBytes / (1024**3)).toFixed(2);
        console.error('[fileUpload] File was truncated - exceeds size limit');
        console.error(`[fileUpload] Current limit: ${maxSizeGB}GB (${uploadLimitBytes} bytes)`);
        return res.status(413).json({
            error: 'File size exceeds maximum allowed',
            maxSizeGB: parseFloat(maxSizeGB),
            maxSizeBytes: uploadLimitBytes,
            message: 'Check UPLOAD_LIMIT environment variable',
            hint: 'Current UPLOAD_LIMIT: ' + config.media.uploadLimitSize,
        });
    }
    next();
});

console.log('[app.js] Middleware configured with limits');

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

// 404 Debug handler - LOG ALL UNMATCHED ROUTES
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

// Global error handling middleware (MUST BE LAST - 4 parameters required for Express to recognize as error handler)
app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    
    console.error('[Global Error Handler]', {
        message: err.message,
        status: status,
        code: err.code,
        type: err.type,
    });
    
    // If response headers already sent, pass to default handler
    if (res.headersSent) {
        return _next(err);
    }

    // Handle 413 Payload Too Large
    if (status === 413 || err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
        console.error('[413 Error] File/Payload too large');
        const bodyBytes = typeof config.media.bodyParserLimit === 'string' 
            ? parseSize(config.media.bodyParserLimit)
            : config.media.bodyParserLimit;
        
        return res.status(413).json({
            error: 'Payload too large',
            message: 'El archivo o payload excede el límite permitido',
            currentLimits: {
                uploadLimit: `${(uploadLimitBytes / (1024**3)).toFixed(2)} GB`,
                bodyParserLimit: `${(bodyBytes / (1024**3)).toFixed(2)} GB`,
            },
            environmentVars: {
                UPLOAD_LIMIT: process.env.UPLOAD_LIMIT || 'NOT SET (default 1gb)',
                BODY_PARSER_LIMIT: process.env.BODY_PARSER_LIMIT || 'NOT SET (default 1gb)',
            },
            suggestion: 'Visit /api/debug/upload-config to verify limits',
        });
    }
    
    // Ensure we always respond with JSON
    const response = {
        error: err.message || 'Internal Server Error',
        status: status,
    };
    
    if (config.nodeEnv === 'development') {
        response.details = err.details || err.stack;
        response.code = err.code;
    }
    
    res.status(status).json(response);
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
