/**
 * Application Configuration
 * All environment-based settings and constants
 */

require('dotenv').config();

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // AWS S3
    s3: {
        bucket: process.env.S3_BUCKET || 'restaurante-joaos',
        region: process.env.S3_REGION || 'us-east-1',
        isPublic: process.env.S3_PUBLIC === 'true',
        signedUrlExpires: parseInt(process.env.S3_SIGNED_EXPIRES || '3600', 10),
    },

    // AWS Credentials (for SDK)
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },

    // Admin Authentication
    admin: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        secret: process.env.ADMIN_SECRET || 'default_secret_key',
    },

    // Media
    media: {
        imageExtensions: ['jpg', 'jpeg', 'png', 'gif'],
        videoExtensions: ['mp4', 'webm'],
        localMediaPath: './public/media',
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB max file size
    },

    // Logging
    debug: process.env.DEBUG === 'true',
};
