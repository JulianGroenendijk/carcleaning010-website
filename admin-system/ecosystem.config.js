// PM2 Ecosystem Configuration for Carcleaning010 Admin System

module.exports = {
  apps: [
    {
      name: 'carcleaning010-admin',
      script: './server.js',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Process Management
      instances: 1, // Single instance for small VPS
      exec_mode: 'fork',
      
      // Auto Restart
      watch: false, // Disable in production
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // Memory Management
      max_memory_restart: '500M',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart Policy
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Graceful Start/Stop
      listen_timeout: 3000,
      kill_timeout: 5000,
      
      // Performance
      node_args: '--max-old-space-size=512',
      
      // Cron for automatic restart (optional - daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Health monitoring
      health_check_http: {
        enable: true,
        url: 'http://localhost:3001/api/health',
        interval: 30000, // 30 seconds
        timeout: 10000,  // 10 seconds
      },
      
      // Auto-restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: false,
        depth: 2
      }
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'www-data',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/carcleaning010-admin.git',
      path: '/var/www/carcleaning010-admin',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};

// PM2 Commands Reference:
// 
// Start application:
// pm2 start ecosystem.config.js --env production
//
// Reload application:
// pm2 reload ecosystem.config.js --env production
//
// Monitor application:
// pm2 monit
//
// View logs:
// pm2 logs carcleaning010-admin
//
// Stop application:
// pm2 stop carcleaning010-admin
//
// Delete application:
// pm2 delete carcleaning010-admin
//
// Save PM2 configuration:
// pm2 save
//
// Generate startup script:
// pm2 startup