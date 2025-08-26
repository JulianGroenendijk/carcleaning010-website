require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database en middleware
const { healthCheck, close } = require('./database/connection');
const { verifyToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuratie
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://carcleaning010.nl', 'https://www.carcleaning010.nl']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per windowMs in production
    message: {
        error: 'Te veel aanvragen. Probeer het later opnieuw.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);


// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await healthCheck();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            version: process.env.npm_package_version || '1.0.0'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Auth routes (import uit routes/auth.js)
app.use('/api/auth', require('./routes/auth'));

// Import en gebruik API routes (alle met token verificatie)
app.use('/api/customers', verifyToken, require('./routes/customers'));
app.use('/api/vehicles', verifyToken, require('./routes/vehicles'));
app.use('/api/services', verifyToken, require('./routes/services'));
app.use('/api/quotes', verifyToken, require('./routes/quotes'));
app.use('/api/appointments', verifyToken, require('./routes/appointments'));
app.use('/api/invoices', verifyToken, require('./routes/invoices'));
app.use('/api/certificates', verifyToken, require('./routes/certificates'));
app.use('/api/leads', verifyToken, require('./routes/leads'));
app.use('/api/dashboard', verifyToken, require('./routes/dashboard'));
app.use('/api/pdf', verifyToken, require('./routes/pdf'));

// Website lead endpoint (zonder auth voor website formulier)
app.use('/api/website-leads', require('./routes/websiteLeads'));

// Catch-all voor frontend routing (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: 'Database verbinding mislukt. Probeer het later opnieuw.'
        });
    }
    
    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validatie fout',
            details: error.message
        });
    }
    
    // Default error response
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Er is een server fout opgetreden.' 
            : error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint niet gevonden',
        path: req.path,
        method: req.method
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Carcleaning010 Admin System
📡 Server draait op poort ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Admin URL: http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/api/health
    `);
});

module.exports = app;