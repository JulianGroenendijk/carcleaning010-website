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

// POST /api/website-leads - Intelligente afhandeling van website formulieren
router.post('/', leadLimiter, async (req, res) => {
    try {
        // Flexible field mapping voor beide formulier types
        const formData = req.body;
        
        // Map beide camelCase en snake_case field names
        const firstName = formData.firstName || formData.first_name || null;
        const lastName = formData.lastName || formData.last_name || null;
        const email = formData.email || null;
        const phone = formData.phone || null;
        
        // Minimale vereiste: email OF telefoon
        if (!email && !phone) {
            return res.status(400).json({
                error: 'Email adres of telefoonnummer is verplicht.'
            });
        }

        // Check of het een bestaande klant is
        let existingCustomer = null;
        if (email) {
            const customerCheck = await query(`
                SELECT id, first_name, last_name, email, phone 
                FROM customers 
                WHERE LOWER(email) = LOWER($1)
            `, [email]);
            
            if (customerCheck.rows.length > 0) {
                existingCustomer = customerCheck.rows[0];
            }
        }
        
        // Als geen match op email, probeer telefoon
        if (!existingCustomer && phone) {
            const phoneClean = phone.replace(/[\s\-\+]/g, '');
            const customerCheckPhone = await query(`
                SELECT id, first_name, last_name, email, phone 
                FROM customers 
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = $1
            `, [phoneClean]);
            
            if (customerCheckPhone.rows.length > 0) {
                existingCustomer = customerCheckPhone.rows[0];
            }
        }

        // Check voor duplicate leads (zelfde email binnen 24 uur) - alleen voor nieuwe prospects
        if (!existingCustomer && email) {
            const recentLead = await query(`
                SELECT id FROM website_leads 
                WHERE LOWER(email) = LOWER($1) 
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `, [email]);

            if (recentLead.rows.length > 0) {
                return res.status(409).json({
                    error: 'Er is al een aanvraag verzonden met dit email adres in de afgelopen 24 uur.'
                });
            }
        }

        // Bouw gestructureerde data uit alle formulier velden
        const serviceType = formData.serviceType || formData.service_type || null;
        
        // Combineer voertuig informatie uit verschillende velden
        let vehicleInfo = formData.vehicle_info || formData.vehicleInfo || null;
        if (!vehicleInfo && (formData.carBrand || formData.carModel)) {
            const carParts = [
                formData.carBrand,
                formData.carModel,
                formData.carYear,
                formData.carColor
            ].filter(part => part && part.trim());
            
            if (carParts.length > 0) {
                vehicleInfo = carParts.join(' ');
                if (formData.carCondition) {
                    vehicleInfo += ` - ${formData.carCondition}`;
                }
            }
        }

        // Extract structured data from form
        const city = formData.city || null;
        const postcode = formData.postcode || null;
        const serviceLocation = formData.serviceLocation || formData.service_location || null;
        const preferredDate = formData.preferredDate || formData.preferred_date || null;
        const preferredTime = formData.preferredTime || formData.preferred_time || null;
        
        // Services array verwerken
        let servicesRequested = [];
        if (formData.services && Array.isArray(formData.services)) {
            servicesRequested = formData.services;
        } else if (formData['services[]']) {
            // Handle form data with array notation
            servicesRequested = Array.isArray(formData['services[]']) ? formData['services[]'] : [formData['services[]']];
        }

        // Build message with remaining info
        let message = formData.message || formData.comments || null;
        const extraInfo = [];
        
        if (formData.carCondition) extraInfo.push(`Voertuig staat: ${formData.carCondition}`);
        
        if (extraInfo.length > 0) {
            const extraInfoText = extraInfo.join('\n');
            message = message ? `${message}\n\n--- Extra informatie ---\n${extraInfoText}` : extraInfoText;
        }

        let result;
        
        if (existingCustomer) {
            // Bestaande klant - maak een appointment request of service request
            console.log(`🔄 Bestaande klant gedetecteerd: ${existingCustomer.first_name} ${existingCustomer.last_name} (${existingCustomer.email})`);
            
            // Voeg toe aan website_leads met verwijzing naar customer
            result = await query(`
                INSERT INTO website_leads (
                    first_name, last_name, email, phone, 
                    service_type, vehicle_info, message, source, 
                    customer_id, status, city, postcode, service_location,
                    preferred_date, preferred_time, services_requested
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'website', $8, 'existing_customer', $9, $10, $11, $12, $13, $14)
                RETURNING *
            `, [
                firstName || existingCustomer.first_name,
                lastName || existingCustomer.last_name,
                email || existingCustomer.email,
                phone || existingCustomer.phone,
                serviceType,
                vehicleInfo,
                message,
                existingCustomer.id,
                city,
                postcode,
                serviceLocation,
                preferredDate,
                preferredTime,
                JSON.stringify(servicesRequested)
            ]);
            
            return res.status(201).json({
                message: 'Welkom terug! Uw aanvraag is ontvangen. We nemen zo snel mogelijk contact met u op voor het inplannen van uw afspraak.',
                id: result.rows[0].id,
                created_at: result.rows[0].created_at,
                customer_status: 'existing'
            });
            
        } else {
            // Nieuwe prospect - maak een lead
            console.log(`🆕 Nieuwe prospect: ${firstName} ${lastName} (${email})`);
            
            result = await query(`
                INSERT INTO website_leads (
                    first_name, last_name, email, phone, 
                    service_type, vehicle_info, message, source, status,
                    city, postcode, service_location, preferred_date, 
                    preferred_time, services_requested
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'website', 'new', $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                firstName,
                lastName,
                email,
                phone,
                serviceType,
                vehicleInfo,
                message,
                city,
                postcode,
                serviceLocation,
                preferredDate,
                preferredTime,
                JSON.stringify(servicesRequested)
            ]);
            
            return res.status(201).json({
                message: 'Bedankt voor uw aanvraag! We nemen zo snel mogelijk contact met u op voor een persoonlijke offerte.',
                id: result.rows[0].id,
                created_at: result.rows[0].created_at,
                customer_status: 'new'
            });
        }

    } catch (error) {
        console.error('Error processing website submission:', error);
        
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