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
        
        // Pull latest code
        exec('git pull origin main', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Git pull failed:', error);
                return res.status(500).json({ error: 'Git pull failed' });
            }
            
            console.log('✅ Git pull successful:', stdout);
            
            // Install dependencies
            exec('npm install --production', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ NPM install failed:', error);
                    return res.status(500).json({ error: 'NPM install failed' });
                }
                
                console.log('✅ NPM install successful');
                
                // Restart application if using PM2
                exec('pm2 restart carcleaning010-admin || echo "PM2 restart failed"', (error, stdout, stderr) => {
                    if (error) {
                        console.warn('⚠️ PM2 restart warning:', error);
                    }
                    
                    console.log('🔄 Application restart attempted');
                    res.json({ 
                        success: true, 
                        message: 'Deployment completed',
                        timestamp: new Date().toISOString()
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