/**
 * Sistema de Publicidad - Main Application
 * Express server with S3 media management and carousel API
 */

const express = require('express');
const fileUpload = require('express-fileupload');
const config = require('./config');
const mediaRoutes = require('./routes/media');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
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
╠════════════════════════════════════════════════════════════╣
║ 🚀 Server running on port ${port}
║ 🌍 URL: http://localhost:${port}
║ 💾 S3 Bucket: ${config.s3.bucket}
║ 🔒 Bucket Type: ${config.s3.isPublic ? 'PUBLIC' : 'PRIVATE'}
║ 📦 Environment: ${config.nodeEnv}
║ 🔐 Admin Panel: http://localhost:${port}/admin.html
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
