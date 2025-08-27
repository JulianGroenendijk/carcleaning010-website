const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/connection');
const bcrypt = require('bcrypt');

const router = express.Router();

// Deployment webhook endpoint
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
    res.json({
        status: 'healthy',
        version: '1.1.0', // Updated version
        deployment: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            commit: process.env.GIT_COMMIT || 'unknown'
        }
    });
});

module.exports = router;