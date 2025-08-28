const express = require('express');
const { query } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/services - Alle diensten/services
router.get('/', async (req, res) => {
    try {
        const { 
            category = '',
            active_only = 'true'
        } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (active_only === 'true') {
            whereClause += ' AND active = true';
        }

        if (category) {
            paramCount++;
            whereClause += ` AND category = $${paramCount}`;
            params.push(category);
        }

        const result = await query(`
            SELECT *
            FROM services
            ${whereClause}
            ORDER BY category, name
        `, params);

        res.json({
            services: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Fout bij ophalen diensten' });
    }
});

// GET /api/services/:id - Specifieke dienst
router.get('/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;

        const result = await query('SELECT * FROM services WHERE id = $1', [serviceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dienst niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ error: 'Fout bij ophalen dienst' });
    }
});

// POST /api/services - Nieuwe dienst aanmaken
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            base_price,
            duration_minutes,
            active = true
        } = req.body;

        if (!name || !category) {
            return res.status(400).json({ 
                error: 'Naam en categorie zijn verplicht' 
            });
        }

        const result = await query(`
            INSERT INTO services (
                name, description, category, base_price, 
                duration_minutes, active
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, description, category, base_price, duration_minutes, active]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Fout bij aanmaken dienst' });
    }
});

// PUT /api/services/:id - Dienst bijwerken
router.put('/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;
        const {
            name,
            description,
            category,
            base_price,
            duration_minutes,
            active
        } = req.body;

        const result = await query(`
            UPDATE services SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                base_price = COALESCE($4, base_price),
                duration_minutes = COALESCE($5, duration_minutes),
                active = COALESCE($6, active)
            WHERE id = $7
            RETURNING *
        `, [name, description, category, base_price, duration_minutes, active, serviceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dienst niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Fout bij bijwerken dienst' });
    }
});

// DELETE /api/services/:id - Dienst verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;

        const result = await query('DELETE FROM services WHERE id = $1 RETURNING id', [serviceId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dienst niet gevonden' });
        }

        res.json({ message: 'Dienst succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Fout bij verwijderen dienst' });
    }
});

// GET /api/services/categories - Alle service categorieën
router.get('/categories/list', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                category,
                COUNT(*) as service_count,
                AVG(base_price) as avg_price,
                AVG(duration_minutes) as avg_duration
            FROM services 
            WHERE active = true
            GROUP BY category 
            ORDER BY category
        `);

        res.json({
            categories: result.rows,
            total_categories: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching service categories:', error);
        res.status(500).json({ error: 'Fout bij ophalen categorieën' });
    }
});

module.exports = router;