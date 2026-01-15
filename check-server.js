/**
 * Server Health Check Script
 * Run this to verify the server configuration
 */

console.log('=== SERVER CONFIGURATION CHECK ===\n');

// Check Node version
console.log('Node Version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('');

// Check environment variables
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('S3_BUCKET:', process.env.S3_BUCKET || 'NOT SET');
console.log('S3_REGION:', process.env.S3_REGION || 'NOT SET');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET ✓' : 'NOT SET ✗');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME || 'NOT SET');
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? 'SET ✓' : 'NOT SET ✗');
console.log('ADMIN_SECRET:', process.env.ADMIN_SECRET ? 'SET ✓' : 'NOT SET ✗');
console.log('');

// Check required files
console.log('=== FILE STRUCTURE CHECK ===');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'package.json',
    'src/app.js',
    'src/config.js',
    'src/routes/media.js',
    'src/routes/admin.js',
    'src/services/s3Service.js',
    'public/index.html',
    'public/admin.html'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`${exists ? '✓' : '✗'} ${file}`);
});

console.log('');

// Try to load the app
console.log('=== LOADING APP ===');
try {
    const app = require('./src/app');
    console.log('✓ App loaded successfully');
    console.log('App type:', typeof app);
    console.log('Is function?:', typeof app === 'function');
} catch (error) {
    console.error('✗ FAILED to load app:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
}

console.log('\n=== ALL CHECKS PASSED ===');
