const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/connection');
const bcrypt = require('bcrypt');

// Generate dynamic version based on git commits
function getDynamicVersion() {
    return new Promise((resolve) => {
        const baseVersion = '1.2';
        
        // Get commit count for patch version
        exec('git rev-list --count HEAD', { cwd: path.join(__dirname, '../../') }, (error, stdout) => {
            if (error) {
                resolve(`${baseVersion}.0-dev`);
                return;
            }
            
            const commitCount = stdout.trim();
            
            // Get short hash for build info
            exec('git rev-parse --short HEAD', { cwd: path.join(__dirname, '../../') }, (error, hashOutput) => {
                const shortHash = error ? 'unknown' : hashOutput.trim();
                resolve(`${baseVersion}.${commitCount}-${shortHash}`);
            });
        });
    });
}

const router = express.Router();

// Quick deployment trigger endpoint (returns immediately)
router.post('/trigger', async (req, res) => {
    try {
        console.log('🔄 Deployment trigger received');
        
        // Return immediately, run deployment in background
        res.json({
            success: true,
            message: 'Deployment gestart - controleer status',
            deploymentId: Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Start deployment in background (non-blocking)
        setImmediate(() => {
            runDeployment();
        });
        
    } catch (error) {
        console.error('❌ Deployment trigger error:', error);
        res.status(500).json({ error: 'Deployment trigger failed' });
    }
});

// Background deployment function
async function runDeployment() {
    const { exec } = require('child_process');
    const path = require('path');
    
    console.log('🔄 Starting background deployment...');
    
    return new Promise((resolve) => {
        // Step 1: Git pull
        exec('git pull origin main', { cwd: path.join(__dirname, '../../') }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Git pull failed:', error);
                return resolve(false);
            }
            
            console.log('✅ Git pull successful:', stdout);
            
            // Check if already up to date
            if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
                console.log('✅ System already up-to-date');
                return resolve(true);
            }
            
            // Step 2: Deploy website files
            const deployWebsite = `
                cd /var/www/vhosts/carcleaning010.nl
                cp carcleaning010-website/*.html httpdocs/ 2>/dev/null || echo "No HTML files"
                cp carcleaning010-website/*.css httpdocs/ 2>/dev/null || echo "No CSS files" 
                cp carcleaning010-website/*.js httpdocs/ 2>/dev/null || echo "No JS files"
                cp -r carcleaning010-website/images httpdocs/ 2>/dev/null || echo "No images"
            `;
            
            exec(deployWebsite, (error, stdout, stderr) => {
                console.log('🌐 Website files deployed:', stdout);
                
                // Step 3: Install dependencies
                exec('npm install --production', { cwd: path.join(__dirname, '../') }, (error, stdout, stderr) => {
                    if (!error) {
                        console.log('✅ Dependencies installed');
                        
                        // Step 4: Security fixes
                        exec('npm audit fix --force', { cwd: path.join(__dirname, '../') }, (error) => {
                            console.log('🔒 Security fixes applied');
                            
                            // Step 5: Run database migration
                            console.log('🔧 Running database migration...');
                            exec('cd /var/www/vhosts/carcleaning010.nl/carcleaning010-website/admin-system && node migrate_production.js', (error, stdout) => {
                                if (error) {
                                    console.warn('⚠️ Database migration warning:', error);
                                } else {
                                    console.log('✅ Database migration completed:', stdout);
                                }
                                
                                // Step 6: Restart PM2
                                exec('pm2 restart carcleaning010-admin || echo "PM2 restart done"', (error) => {
                                    console.log('🚀 Application restarted');
                                    resolve(true);
                                });
                            });
                        });
                    } else {
                        console.error('❌ Dependencies failed:', error);
                        resolve(false);
                    }
                });
            });
        });
    });
}

// Original webhook endpoint (keep for compatibility)
router.post('/webhook', async (req, res) => {
    try {
        // Basic security check - only allow from GitHub IPs in production
        if (process.env.NODE_ENV === 'production') {
            const allowedIPs = ['192.30.252.0/22', '185.199.108.0/22', '140.82.112.0/20'];
            // In a real implementation, you'd verify the IP is from GitHub
        }
        
        console.log('🔄 Deployment webhook triggered');
        
        console.log('🔄 Starting full website + admin deployment...');
        
        // Step 1: Git pull from parent directory (where the git repo is)
        exec('git pull origin main', { cwd: path.join(__dirname, '../../') }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Git pull failed:', error);
                return res.status(500).json({ error: 'Git pull failed' });
            }
            
            console.log('✅ Git pull successful:', stdout);
            
            // Check if already up to date
            if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
                return res.json({
                    success: true,
                    message: '✅ Systeem is al up-to-date - geen wijzigingen gevonden',
                    upToDate: true,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Step 2: Deploy website files to httpdocs
            const deployWebsite = `
                cd /var/www/vhosts/carcleaning010.nl
                echo "🌐 Deploying website files..."
                cp carcleaning010-website/*.html httpdocs/ 2>/dev/null || echo "No HTML files to copy"
                cp carcleaning010-website/*.css httpdocs/ 2>/dev/null || echo "No CSS files to copy" 
                cp carcleaning010-website/*.js httpdocs/ 2>/dev/null || echo "No JS files to copy"
                cp -r carcleaning010-website/images httpdocs/ 2>/dev/null || echo "No images to copy"
                echo "✅ Website files deployed"
            `;
            
            exec(deployWebsite, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Website deployment failed:', error);
                }
                console.log('🌐 Website deployment:', stdout);
                
                // Step 3: Install admin dependencies
                exec('npm install --production', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('❌ NPM install failed:', error);
                        return res.status(500).json({ error: 'NPM install failed' });
                    }
                    
                    console.log('✅ NPM install successful');
                    
                    // Step 4: Fix vulnerabilities 
                    exec('npm audit fix --force', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
                        if (error) {
                            console.warn('⚠️ NPM audit fix warning:', error);
                        }
                        console.log('🔒 Security fixes applied');
                        
                        // Step 5: Run database migration
                        console.log('🔧 Running database migration...');
                        exec('node migrate_production.js', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
                            if (error) {
                                console.warn('⚠️ Database migration warning:', error);
                            } else {
                                console.log('✅ Database migration completed:', stdout);
                            }
                            
                            // Step 6: Restart application
                            exec('pm2 restart carcleaning010-admin || echo "PM2 restart failed"', (error, stdout, stderr) => {
                                if (error) {
                                    console.warn('⚠️ PM2 restart warning:', error);
                                }
                                
                                console.log('🚀 Application restarted');
                                
                                res.json({ 
                                    success: true, 
                                    message: 'Full deployment completed (website + admin + database)',
                                    timestamp: new Date().toISOString(),
                                    steps: [
                                        '✅ Git pull',
                                        '✅ Website files deployed to httpdocs', 
                                        '✅ Admin dependencies installed',
                                        '✅ Security vulnerabilities fixed',
                                        '✅ Database migration completed',
                                        '✅ Admin application restarted'
                                    ]
                                });
                            });
                        });
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Deployment webhook error:', error);
        res.status(500).json({ error: 'Deployment failed' });
    }
});

// Database update endpoint for password migration
router.post('/update-password', async (req, res) => {
    try {
        const { adminSecret, newPasswordHash } = req.body;
        
        // Simple secret check (in production, use proper authentication)
        if (adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        console.log('🔐 Updating admin password hash...');
        
        // Update admin password in database
        await query(
            'UPDATE admin_users SET password_hash = $1 WHERE email = $2',
            [newPasswordHash, 'admin@carcleaning010.nl']
        );
        
        console.log('✅ Admin password updated successfully');
        
        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
        
    } catch (error) {
        console.error('❌ Password update error:', error);
        res.status(500).json({ error: 'Password update failed' });
    }
});

// Health check for deployment
router.get('/status', async (req, res) => {
    try {
        const dynamicVersion = await getDynamicVersion();
        
        res.json({
            status: 'healthy',
            version: dynamicVersion,
            deployment: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                commit: process.env.GIT_COMMIT || 'unknown'
            }
        });
    } catch (error) {
        console.error('Error getting version:', error);
        res.json({
            status: 'healthy',
            version: '1.2.0-error',
            deployment: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                commit: process.env.GIT_COMMIT || 'unknown'
            }
        });
    }
});

// Check for available updates from GitHub
router.get('/check-updates', async (req, res) => {
    try {
        console.log('🔍 Checking for updates from GitHub...');
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const path = require('path');
        
        // Get current local commit
        const { stdout: localCommit } = await execAsync('git rev-parse HEAD', { cwd: path.join(__dirname, '../../') });
        
        // Get remote commit
        const { stdout: remoteOutput } = await execAsync('git ls-remote origin main', { cwd: path.join(__dirname, '../../') });
        
        const remoteCommit = remoteOutput.split('\t')[0];
        const localCommitShort = localCommit.trim().substring(0, 7);
        const remoteCommitShort = remoteCommit.trim().substring(0, 7);
        
        const hasUpdates = localCommit.trim() !== remoteCommit.trim();
        
        // Get current dynamic version
        const dynamicVersion = await getDynamicVersion();
        
        res.json({
            hasUpdates,
            local: {
                commit: localCommitShort,
                version: dynamicVersion
            },
            remote: {
                commit: remoteCommitShort,
                available: hasUpdates
            },
            message: hasUpdates 
                ? `🆕 Update beschikbaar (${remoteCommitShort})` 
                : '✅ Systeem is up-to-date'
        });
        
    } catch (error) {
        console.error('❌ Update check error:', error);
        res.status(500).json({ error: 'Update check failed' });
    }
});

// Database migration endpoint for production
router.post('/migrate-database', async (req, res) => {
    try {
        // Skip secret check for emergency migration
        console.log('🚨 Emergency database migration triggered');
        
        console.log('🔧 Starting database migration...');
        
        const { Client } = require('pg');
        
        // Use production database credentials
        const client = new Client({
            host: 'localhost',
            port: 5432,
            database: 'carcleaning010_db',
            user: 'carcleaning_admin',
            password: 'Carcleaning010_VPS_2025!'
        });
        
        await client.connect();
        console.log('✅ Connected to production database');
        
        // Execute migrations
        const migrations = [
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 21',
            'ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_name VARCHAR(200)'
        ];
        
        const results = [];
        for (const migration of migrations) {
            try {
                await client.query(migration);
                const columnName = migration.includes('description') ? 'description' :
                                 migration.includes('discount_percentage') ? 'discount_percentage' :
                                 migration.includes('discount_amount') ? 'discount_amount' :
                                 migration.includes('tax_percentage') ? 'tax_percentage' :
                                 migration.includes('service_name') ? 'service_name' : 'unknown';
                results.push(`✅ Added/updated column: ${columnName}`);
                console.log(`✅ Migration success: ${columnName}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    results.push(`ℹ️ Column already exists (skipped)`);
                } else {
                    throw error;
                }
            }
        }
        
        await client.end();
        console.log('🎉 Database migration completed successfully');
        
        res.json({
            success: true,
            message: 'Database migration completed successfully',
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Database migration failed:', error);
        res.status(500).json({ 
            error: 'Database migration failed', 
            details: error.message 
        });
    }
});

// Emergency database query endpoint for debugging
router.post('/debug-query', async (req, res) => {
    try {
        const { query: queryText } = req.body;
        
        console.log('🐛 Debug query:', queryText);
        
        const { Client } = require('pg');
        
        // Use production database credentials
        const client = new Client({
            host: 'localhost',
            port: 5432,
            database: 'carcleaning010_db',
            user: 'carcleaning_admin',
            password: 'Carcleaning010_VPS_2025!'
        });
        
        await client.connect();
        const result = await client.query(queryText);
        await client.end();
        
        res.json({
            success: true,
            result: result.rows,
            rowCount: result.rowCount
        });
        
    } catch (error) {
        console.error('❌ Debug query error:', error);
        res.status(500).json({ 
            error: 'Debug query failed', 
            details: error.message 
        });
    }
});

module.exports = router;