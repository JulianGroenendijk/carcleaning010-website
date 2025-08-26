const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../database/connection');
const { validateLead } = require('../middleware/validation');

const router = express.Router();

// Rate limiting specifiek voor website leads (strenger)
const leadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 3 : 100, // 100 for dev, 3 for production
    message: {
        error: 'Te veel aanvragen verzonden. Probeer het over 15 minuten opnieuw.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// POST /api/website-leads - Nieuwe lead van website formulier
router.post('/', leadLimiter, validateLead, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            service_type,
            vehicle_info,
            message
        } = req.body;

        // Minimale vereiste: email OF telefoon
        if (!email && !phone) {
            return res.status(400).json({
                error: 'Email adres of telefoonnummer is verplicht.'
            });
        }

        // Check voor duplicate leads (zelfde email binnen 24 uur)
        if (email) {
            const recentLead = await query(`
                SELECT id FROM website_leads 
                WHERE email = $1 
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `, [email]);

            if (recentLead.rows.length > 0) {
                return res.status(409).json({
                    error: 'Er is al een aanvraag verzonden met dit email adres in de afgelopen 24 uur.'
                });
            }
        }

        // Voeg lead toe aan database
        const result = await query(`
            INSERT INTO website_leads (
                first_name, last_name, email, phone, 
                service_type, vehicle_info, message, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'website')
            RETURNING *
        `, [
            first_name || null,
            last_name || null,
            email || null,
            phone || null,
            service_type || null,
            vehicle_info || null,
            message || null
        ]);

        // Succes response (geen gevoelige data)
        res.status(201).json({
            message: 'Bedankt voor uw aanvraag! We nemen zo snel mogelijk contact met u op.',
            id: result.rows[0].id,
            created_at: result.rows[0].created_at
        });

        // Optioneel: Hier kun je een email notificatie naar Jordy sturen
        // await sendNewLeadNotification(result.rows[0]);

    } catch (error) {
        console.error('Error creating website lead:', error);
        
        // Generic error voor security
        res.status(500).json({
            error: 'Er is een fout opgetreden bij het verzenden van uw aanvraag. Probeer het later opnieuw.'
        });
    }
});

// GET /api/website-leads/status/:id - Check status van lead (voor klant)
router.get('/status/:id', async (req, res) => {
    try {
        const leadId = req.params.id;

        const result = await query(`
            SELECT id, status, created_at 
            FROM website_leads 
            WHERE id = $1
        `, [leadId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Aanvraag niet gevonden.'
            });
        }

        const lead = result.rows[0];
        const statusMessages = {
            'new': 'Uw aanvraag is ontvangen en wordt behandeld.',
            'contacted': 'We hebben contact met u opgenomen.',
            'converted': 'Uw aanvraag is omgezet naar een offerte.',
            'closed': 'Uw aanvraag is afgerond.'
        };

        res.json({
            id: lead.id,
            status: lead.status,
            status_message: statusMessages[lead.status] || 'Status onbekend',
            created_at: lead.created_at
        });

    } catch (error) {
        console.error('Error checking lead status:', error);
        res.status(500).json({
            error: 'Fout bij ophalen status.'
        });
    }
});

module.exports = router;