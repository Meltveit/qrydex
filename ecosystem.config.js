/**
 * PM2 Ecosystem Configuration
 * Manages all crawler bots in production
 * 
 * Deploy: pm2 start ecosystem.config.js
 * Monitor: pm2 monit
 * Logs: pm2 logs
 */

module.exports = {
    apps: [
        {
            name: 'web-discovery-bot',
            script: 'scripts/bots/web-discovery.js',
            args: '999', // Continuous (999 iterations)
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
            cron_restart: '0 4 * * *', // Restart daily at 4 AM
            error_file: './logs/web-discovery-error.log',
            out_file: './logs/web-discovery-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },

        {
            name: 'registry-crawler',
            script: 'scripts/simple-crawler.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            cron_restart: '0 2 * * *', // Run daily at 2 AM
            error_file: './logs/registry-error.log',
            out_file: './logs/registry-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },

        {
            name: 'website-indexer',
            script: 'scripts/index-websites.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            cron_restart: '0 3 * * 0', // Weekly on Sunday at 3 AM
            error_file: './logs/indexer-error.log',
            out_file: './logs/indexer-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
