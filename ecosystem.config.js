// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  apps: [{
    name: 'publicidad',
    script: './src/app.js',
    
    // Execution mode
    instances: 1,           // Single instance - prevents port conflicts
    exec_mode: 'fork',      // Fork mode (not cluster) - safer for this app
    
    // Restart behavior
    autorestart: true,
    max_restarts: 10,       // Max restarts in 1 minute
    min_uptime: '10s',      // Minimum uptime before restart
    
    // Resource limits
    max_memory_restart: '500M',  // Restart if memory exceeds 500MB
    
    // Environment variables - loaded from .env file
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT,
      BASE_PATH: process.env.BASE_PATH,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_REGION: process.env.S3_REGION,
      S3_PUBLIC: process.env.S3_PUBLIC,
      S3_SIGNED_EXPIRES: process.env.S3_SIGNED_EXPIRES,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      // Upload limits - CRITICAL for large files
      UPLOAD_LIMIT: process.env.UPLOAD_LIMIT || '1gb',
      BODY_PARSER_LIMIT: process.env.BODY_PARSER_LIMIT || '1gb',
      RAW_BODY_LIMIT: process.env.RAW_BODY_LIMIT || '1gb'
    },
    env_development: {
      NODE_ENV: 'development',
      DEBUG: 'true',
      PORT: process.env.PORT,
      BASE_PATH: process.env.BASE_PATH,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_REGION: process.env.S3_REGION,
      S3_PUBLIC: process.env.S3_PUBLIC,
      S3_SIGNED_EXPIRES: process.env.S3_SIGNED_EXPIRES,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      // Upload limits - CRITICAL for large files
      UPLOAD_LIMIT: process.env.UPLOAD_LIMIT || '1gb',
      BODY_PARSER_LIMIT: process.env.BODY_PARSER_LIMIT || '1gb',
      RAW_BODY_LIMIT: process.env.RAW_BODY_LIMIT || '1gb'
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced features
    kill_timeout: 5000,      // Time to wait for graceful shutdown (5s)
    wait_ready: true,        // Wait for app to be ready before considering it online
    listen_timeout: 10000,   // Timeout for listen event (10s)
    
    // Watch mode (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    
    // Cron restart (optional - restart every day at 3 AM)
    // cron_restart: '0 3 * * *',
    
    // Source map support
    source_map_support: true,
    
    // Graceful shutdown
    shutdown_with_message: true
  }]
};
