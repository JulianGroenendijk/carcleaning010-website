const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/leads - Alle website leads (voor admin dashboard)
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Zoekfunctionaliteit
        if (search) {
            paramCount++;
            whereClause += ` AND (
                first_name ILIKE $${paramCount} OR 
                last_name ILIKE $${paramCount} OR 
                email ILIKE $${paramCount} OR
                phone ILIKE $${paramCount} OR
                message ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Status filter
        if (status) {
            paramCount++;
            whereClause += ` AND status = $${paramCount}`;
            params.push(status);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['created_at', 'first_name', 'last_name', 'status'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const leadsQuery = `
            SELECT 
                *,
                COUNT(*) OVER() as total_count
            FROM website_leads
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(leadsQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            leads: result.rows.map(row => {
                const { total_count, ...lead } = row;
                return lead;
            }),
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: parseInt(totalCount),
                has_next: page < totalPages,
                has_prev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Fout bij ophalen leads' });
    }
});

// GET /api/leads/:id - Specifieke lead
router.get('/:id', async (req, res) => {
    try {
        const leadId = req.params.id;

        const result = await query('SELECT * FROM website_leads WHERE id = $1', [leadId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({ error: 'Fout bij ophalen lead' });
    }
});

// PUT /api/leads/:id/status - Lead status bijwerken
router.put('/:id/status', async (req, res) => {
    try {
        const leadId = req.params.id;
        const { status, notes } = req.body;

        const validStatuses = ['new', 'contacted', 'converted', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Ongeldige status' });
        }

        const result = await query(`
            UPDATE website_leads SET 
                status = $1, 
                notes = COALESCE($2, notes),
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $3 
            RETURNING *
        `, [status, notes, leadId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating lead status:', error);
        res.status(500).json({ error: 'Fout bij bijwerken lead status' });
    }
});

// POST /api/leads/:id/convert-to-customer - Lead omzetten naar klant
router.post('/:id/convert-to-customer', async (req, res) => {
    try {
        const leadId = req.params.id;

        const result = await transaction(async (client) => {
            // Haal lead gegevens op
            const leadResult = await client.query('SELECT * FROM website_leads WHERE id = $1', [leadId]);
            
            if (leadResult.rows.length === 0) {
                throw new Error('Lead niet gevonden');
            }

            const lead = leadResult.rows[0];

            if (lead.status === 'converted') {
                throw new Error('Lead is al omgezet naar klant');
            }

            // Maak nieuwe klant aan
            const customerResult = await client.query(`
                INSERT INTO customers (
                    first_name, last_name, email, phone, notes, source
                ) VALUES ($1, $2, $3, $4, $5, 'website_lead')
                RETURNING *
            `, [
                lead.first_name,
                lead.last_name,
                lead.email,
                lead.phone,
                `Website lead: ${lead.message || ''}\nService type: ${lead.service_type || ''}\nVoertuig info: ${lead.vehicle_info || ''}`,
            ]);

            const customer = customerResult.rows[0];

            // Update lead status
            await client.query(`
                UPDATE website_leads SET 
                    status = 'converted',
                    customer_id = $1,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [customer.id, leadId]);

            return customer;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error converting lead to customer:', error);
        
        if (error.message === 'Lead niet gevonden' || 
            error.message === 'Lead is al omgezet naar klant') {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij omzetten naar klant' });
    }
});

// DELETE /api/leads/:id - Lead verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const leadId = req.params.id;

        const result = await query('DELETE FROM website_leads WHERE id = $1 RETURNING id', [leadId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead niet gevonden' });
        }

        res.json({ message: 'Lead succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Fout bij verwijderen lead' });
    }
});

// GET /api/leads/stats - Lead statistieken
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_leads,
                COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_leads,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week,
                COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as leads_this_month,
                ROUND(
                    (COUNT(CASE WHEN status = 'converted' THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(*), 0), 
                    2
                ) as conversion_rate
            FROM website_leads
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Error fetching lead stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen lead statistieken' });
    }
});

module.exports = router;