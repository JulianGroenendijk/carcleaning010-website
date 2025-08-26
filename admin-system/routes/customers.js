const express = require('express');
const { query, withTransaction } = require('../database/connection');
const { 
    validateCustomer, 
    validateUUID, 
    validatePagination, 
    validateSearch 
} = require('../middleware/validation');

const router = express.Router();

// GET /api/customers - Lijst van alle klanten (met paginering en zoeken)
router.get('/', validatePagination, validateSearch, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const searchTerm = req.query.q || '';

        let queryText = `
            SELECT 
                c.*,
                COUNT(v.id) as vehicle_count,
                COUNT(q.id) as quote_count,
                COUNT(a.id) as appointment_count,
                MAX(a.appointment_date) as last_appointment
            FROM customers c
            LEFT JOIN vehicles v ON c.id = v.customer_id
            LEFT JOIN quotes q ON c.id = q.customer_id
            LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'
        `;
        
        let queryParams = [];
        let paramCount = 0;

        if (searchTerm) {
            paramCount += 3;
            queryText += ` WHERE (
                c.first_name ILIKE $${paramCount - 2} OR 
                c.last_name ILIKE $${paramCount - 1} OR 
                c.email ILIKE $${paramCount}
            )`;
            queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
        }

        queryText += `
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        queryParams.push(limit, offset);

        const result = await query(queryText, queryParams);

        // Tel totaal aantal voor paginering
        let countQuery = 'SELECT COUNT(*) FROM customers c';
        let countParams = [];
        
        if (searchTerm) {
            countQuery += ` WHERE (
                c.first_name ILIKE $1 OR 
                c.last_name ILIKE $2 OR 
                c.email ILIKE $3
            )`;
            countParams = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
        }

        const countResult = await query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            customers: result.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Fout bij ophalen klanten.' });
    }
});

// GET /api/customers/:id - Enkele klant met details
router.get('/:id', validateUUID, async (req, res) => {
    try {
        const customerId = req.params.id;

        // Haal klant op met alle gerelateerde data
        const customerResult = await query(`
            SELECT 
                c.*,
                json_agg(DISTINCT v.*) FILTER (WHERE v.id IS NOT NULL) as vehicles,
                json_agg(DISTINCT q.*) FILTER (WHERE q.id IS NOT NULL) as quotes,
                json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL) as appointments
            FROM customers c
            LEFT JOIN vehicles v ON c.id = v.customer_id
            LEFT JOIN quotes q ON c.id = q.customer_id
            LEFT JOIN appointments a ON c.id = a.customer_id
            WHERE c.id = $1
            GROUP BY c.id
        `, [customerId]);

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klant niet gevonden.' });
        }

        const customer = customerResult.rows[0];

        // Fix null arrays naar lege arrays
        customer.vehicles = customer.vehicles || [];
        customer.quotes = customer.quotes || [];
        customer.appointments = customer.appointments || [];

        res.json(customer);

    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Fout bij ophalen klant.' });
    }
});

// POST /api/customers - Nieuwe klant aanmaken
router.post('/', validateCustomer, async (req, res) => {
    try {
        const {
            email,
            first_name,
            last_name,
            phone,
            address,
            city,
            postal_code,
            notes
        } = req.body;

        // Controleer of email al bestaat
        const existingCustomer = await query(
            'SELECT id FROM customers WHERE email = $1',
            [email]
        );

        if (existingCustomer.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Een klant met dit email adres bestaat al.' 
            });
        }

        const result = await query(`
            INSERT INTO customers (
                email, first_name, last_name, phone, 
                address, city, postal_code, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [email, first_name, last_name, phone, address, city, postal_code, notes]);

        res.status(201).json({
            message: 'Klant succesvol aangemaakt.',
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Fout bij aanmaken klant.' });
    }
});

// PUT /api/customers/:id - Klant bijwerken
router.put('/:id', validateUUID, validateCustomer, async (req, res) => {
    try {
        const customerId = req.params.id;
        const {
            email,
            first_name,
            last_name,
            phone,
            address,
            city,
            postal_code,
            notes
        } = req.body;

        // Controleer of klant bestaat
        const existingCustomer = await query(
            'SELECT id FROM customers WHERE id = $1',
            [customerId]
        );

        if (existingCustomer.rows.length === 0) {
            return res.status(404).json({ error: 'Klant niet gevonden.' });
        }

        // Controleer of email al bestaat bij andere klant
        const emailCheck = await query(
            'SELECT id FROM customers WHERE email = $1 AND id != $2',
            [email, customerId]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Een andere klant gebruikt dit email adres al.' 
            });
        }

        const result = await query(`
            UPDATE customers SET 
                email = $1, 
                first_name = $2, 
                last_name = $3, 
                phone = $4,
                address = $5, 
                city = $6, 
                postal_code = $7, 
                notes = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [email, first_name, last_name, phone, address, city, postal_code, notes, customerId]);

        res.json({
            message: 'Klant succesvol bijgewerkt.',
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Fout bij bijwerken klant.' });
    }
});

// DELETE /api/customers/:id - Klant verwijderen
router.delete('/:id', validateUUID, async (req, res) => {
    try {
        const customerId = req.params.id;

        // Controleer of klant actieve afspraken heeft
        const activeAppointments = await query(`
            SELECT COUNT(*) FROM appointments 
            WHERE customer_id = $1 
            AND status IN ('scheduled', 'in_progress')
            AND appointment_date >= CURRENT_DATE
        `, [customerId]);

        if (parseInt(activeAppointments.rows[0].count) > 0) {
            return res.status(409).json({ 
                error: 'Kan klant niet verwijderen. Er zijn nog actieve afspraken.' 
            });
        }

        const result = await query(
            'DELETE FROM customers WHERE id = $1 RETURNING *',
            [customerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Klant niet gevonden.' });
        }

        res.json({
            message: 'Klant succesvol verwijderd.',
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Fout bij verwijderen klant.' });
    }
});

// GET /api/customers/:id/stats - Klant statistieken
router.get('/:id/stats', validateUUID, async (req, res) => {
    try {
        const customerId = req.params.id;

        const stats = await query(`
            SELECT 
                COUNT(DISTINCT v.id) as total_vehicles,
                COUNT(DISTINCT q.id) as total_quotes,
                COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) as accepted_quotes,
                COUNT(DISTINCT a.id) as total_appointments,
                COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
                COUNT(DISTINCT i.id) as total_invoices,
                COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_invoices,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount END), 0) as total_revenue,
                MIN(a.appointment_date) as first_appointment,
                MAX(a.appointment_date) as last_appointment
            FROM customers c
            LEFT JOIN vehicles v ON c.id = v.customer_id
            LEFT JOIN quotes q ON c.id = q.customer_id
            LEFT JOIN appointments a ON c.id = a.customer_id
            LEFT JOIN invoices i ON c.id = i.customer_id
            WHERE c.id = $1
            GROUP BY c.id
        `, [customerId]);

        if (stats.rows.length === 0) {
            return res.status(404).json({ error: 'Klant niet gevonden.' });
        }

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Error fetching customer stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen klant statistieken.' });
    }
});

module.exports = router;