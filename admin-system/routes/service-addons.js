const express = require('express');
const { query } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/service-addons - Alle add-ons
router.get('/', async (req, res) => {
    try {
        const { active_only = 'true' } = req.query;

        let whereClause = 'WHERE 1=1';

        if (active_only === 'true') {
            whereClause += ' AND active = true';
        }

        const result = await query(`
            SELECT *
            FROM service_addons
            ${whereClause}
            ORDER BY sort_order ASC, name
        `);

        res.json({
            addons: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching service addons:', error);
        res.status(500).json({ error: 'Fout bij ophalen add-ons' });
    }
});

// GET /api/service-addons/:id - Specifieke add-on
router.get('/:id', async (req, res) => {
    try {
        const addonId = req.params.id;

        const result = await query('SELECT * FROM service_addons WHERE id = $1', [addonId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Add-on niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching service addon:', error);
        res.status(500).json({ error: 'Fout bij ophalen add-on' });
    }
});

// POST /api/service-addons - Nieuwe add-on aanmaken
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            active = true,
            sort_order = 0
        } = req.body;

        if (!name || !price) {
            return res.status(400).json({ 
                error: 'Naam en prijs zijn verplicht' 
            });
        }

        const result = await query(`
            INSERT INTO service_addons (name, description, price, active, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, description, price, active, sort_order]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating service addon:', error);
        res.status(500).json({ error: 'Fout bij aanmaken add-on' });
    }
});

// PUT /api/service-addons/:id - Add-on bijwerken
router.put('/:id', async (req, res) => {
    try {
        const addonId = req.params.id;
        const {
            name,
            description,
            price,
            active,
            sort_order
        } = req.body;

        const result = await query(`
            UPDATE service_addons SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                active = COALESCE($4, active),
                sort_order = COALESCE($5, sort_order)
            WHERE id = $6
            RETURNING *
        `, [name, description, price, active, sort_order, addonId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Add-on niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating service addon:', error);
        res.status(500).json({ error: 'Fout bij bijwerken add-on' });
    }
});

// DELETE /api/service-addons/:id - Add-on verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const addonId = req.params.id;

        const result = await query('DELETE FROM service_addons WHERE id = $1 RETURNING id', [addonId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Add-on niet gevonden' });
        }

        res.json({ message: 'Add-on succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting service addon:', error);
        res.status(500).json({ error: 'Fout bij verwijderen add-on' });
    }
});

module.exports = router;