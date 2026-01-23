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
    
    // Environment variables
    // NOTE: PORT is read from .env file or system environment
    // Do NOT hardcode PORT here - it must come from .env
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development',
      DEBUG: 'true'
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
