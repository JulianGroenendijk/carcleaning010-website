const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, verifyCurrentToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Strict rate limiting voor login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per windowMs
    message: {
        error: 'Te veel login pogingen. Probeer het over 15 minuten opnieuw.'
    },
    skipSuccessfulRequests: true
});

// POST /api/auth/login - Admin login
router.post('/login', loginLimiter, login);

// GET /api/auth/verify - Token verificatie (vereist token)
router.get('/verify', verifyToken, verifyCurrentToken);

module.exports = router;