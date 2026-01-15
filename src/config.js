/**
 * Application Configuration
 * All environment-based settings and constants
 */

console.log('=== CONFIG.JS LOADING ===');
console.log('NODE_ENV:', process.env.NODE_ENV);

// dotenv solo se carga en desarrollo local
// En Render y production, las variables vienen de Environment Variables
if (process.env.NODE_ENV !== 'production') {
    console.log('[CONFIG] Loading dotenv (non-production)');
    require('dotenv').config();
    console.log('[CONFIG] dotenv loaded');
} else {
    console.log('[CONFIG] Skipping dotenv (production mode)');
}

// Log environment variables for debugging
console.log('[CONFIG] Environment Variables Check:');
console.log('  - S3_BUCKET:', process.env.S3_BUCKET ? '✅ SET' : '❌ NOT SET');
console.log('  - S3_REGION:', process.env.S3_REGION ? '✅ SET' : '❌ NOT SET');
console.log('  - AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET');
console.log('  - AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET');
console.log('  - ADMIN_USERNAME:', process.env.ADMIN_USERNAME ? '✅ SET' : '❌ NOT SET');
console.log('  - ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ SET' : '❌ NOT SET');
console.log('  - ADMIN_SECRET:', process.env.ADMIN_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('  - PORT:', process.env.PORT ? '✅ SET' : '❌ NOT SET');

const config = {
    // Server
    port: process.env.PORT || 3001,
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

console.log('[CONFIG] Loaded configuration:', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    s3Bucket: config.s3.bucket,
    s3Region: config.s3.region,
    hasAWSKeys: !!config.aws.accessKeyId && !!config.aws.secretAccessKey,
});

module.exports = config;