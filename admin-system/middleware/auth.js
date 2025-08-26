const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../database/connection');

// JWT Token verificatie middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Toegang geweigerd. Geen token gevonden.' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Controleer of gebruiker nog bestaat en actief is
        const userResult = await query(
            'SELECT id, email, name, role, active FROM admin_users WHERE id = $1 AND active = true',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Token ongeldig. Gebruiker niet gevonden.' 
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token ongeldig.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token verlopen.' });
        }
        
        return res.status(500).json({ error: 'Server authenticatie fout.' });
    }
};

// Login functie
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validatie
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email en wachtwoord zijn verplicht.' 
            });
        }

        // Zoek gebruiker
        const userResult = await query(
            'SELECT id, email, password_hash, name, role, active FROM admin_users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Onjuiste email of wachtwoord.' 
            });
        }

        const user = userResult.rows[0];

        // Controleer of account actief is
        if (!user.active) {
            return res.status(401).json({ 
                error: 'Account is gedeactiveerd.' 
            });
        }

        // Verificeer wachtwoord
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                error: 'Onjuiste email of wachtwoord.' 
            });
        }

        // Update laatste login
        await query(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Genereer JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Stuur response (zonder password_hash)
        res.json({
            message: 'Login succesvol',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server fout tijdens inloggen.' });
    }
};

// Password hash functie (voor nieuwe gebruikers)
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

// Verificeer huidige token (voor frontend check)
const verifyCurrentToken = async (req, res) => {
    try {
        // Als we hier komen, is token geldig (door verifyToken middleware)
        res.json({
            valid: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        });
    } catch (error) {
        res.status(401).json({ valid: false, error: error.message });
    }
};

module.exports = {
    verifyToken,
    login,
    hashPassword,
    verifyCurrentToken
};