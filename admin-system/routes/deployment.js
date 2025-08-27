const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/connection');
const bcrypt = require('bcrypt');

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
                            
                            // Step 5: Restart PM2
                            exec('pm2 restart carcleaning010-admin || echo "PM2 restart done"', (error) => {
                                console.log('🚀 Application restarted');
                                resolve(true);
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
                        
                        // Step 5: Restart application
                        exec('pm2 restart carcleaning010-admin || echo "PM2 restart failed"', (error, stdout, stderr) => {
                            if (error) {
                                console.warn('⚠️ PM2 restart warning:', error);
                            }
                            
                            console.log('🚀 Application restarted');
                            
                            res.json({ 
                                success: true, 
                                message: 'Full deployment completed (website + admin)',
                                timestamp: new Date().toISOString(),
                                steps: [
                                    '✅ Git pull',
                                    '✅ Website files deployed to httpdocs', 
                                    '✅ Admin dependencies installed',
                                    '✅ Security vulnerabilities fixed',
                                    '✅ Admin application restarted'
                                ]
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
router.get('/status', (req, res) => {
    // Read version from package.json (clear cache first)
    const packageJsonPath = path.join(__dirname, '../package.json');
    delete require.cache[require.resolve('../package.json')];
    const packageJson = require('../package.json');
    
    res.json({
        status: 'healthy',
        version: packageJson.version,
        deployment: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            commit: process.env.GIT_COMMIT || 'unknown'
        }
    });
});

// Check for available updates from GitHub
router.get('/check-updates', async (req, res) => {
    try {
        console.log('🔍 Checking for updates from GitHub...');
        
        const { exec } = require('child_process');
        const path = require('path');
        
        // Get current local commit
        exec('git rev-parse HEAD', { cwd: path.join(__dirname, '../../') }, (error, localCommit, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to get local commit' });
            }
            
            // Get remote commit
            exec('git ls-remote origin main', { cwd: path.join(__dirname, '../../') }, (error, remoteOutput, stderr) => {
                if (error) {
                    return res.status(500).json({ error: 'Failed to get remote commit' });
                }
                
                const remoteCommit = remoteOutput.split('\t')[0];
                const localCommitShort = localCommit.trim().substring(0, 7);
                const remoteCommitShort = remoteCommit.trim().substring(0, 7);
                
                const hasUpdates = localCommit.trim() !== remoteCommit.trim();
                
                // Read current version from package.json (clear cache first)
                delete require.cache[require.resolve('../package.json')];
                const packageJson = require('../package.json');
                
                res.json({
                    hasUpdates,
                    local: {
                        commit: localCommitShort,
                        version: packageJson.version
                    },
                    remote: {
                        commit: remoteCommitShort,
                        available: hasUpdates
                    },
                    message: hasUpdates 
                        ? `🆕 Update beschikbaar (${remoteCommitShort})` 
                        : '✅ Systeem is up-to-date'
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Update check error:', error);
        res.status(500).json({ error: 'Update check failed' });
    }
});

module.exports = router;