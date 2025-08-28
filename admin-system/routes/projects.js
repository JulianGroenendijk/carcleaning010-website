const express = require('express');
const { query } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/projects - Alle projecten
router.get('/', async (req, res) => {
    try {
        const { 
            category = '',
            active_only = 'true',
            featured_only = 'false',
            limit = '',
            offset = 0
        } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (active_only === 'true') {
            whereClause += ' AND active = true';
        }

        if (featured_only === 'true') {
            whereClause += ' AND featured = true';
        }

        if (category) {
            paramCount++;
            whereClause += ` AND category = $${paramCount}`;
            params.push(category);
        }

        let limitClause = '';
        if (limit) {
            paramCount++;
            limitClause = ` LIMIT $${paramCount}`;
            params.push(parseInt(limit));
            
            if (offset) {
                paramCount++;
                limitClause += ` OFFSET $${paramCount}`;
                params.push(parseInt(offset));
            }
        }

        const result = await query(`
            SELECT *
            FROM projects
            ${whereClause}
            ORDER BY featured DESC, sort_order ASC, created_at DESC
            ${limitClause}
        `, params);

        res.json({
            projects: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Fout bij ophalen projecten' });
    }
});

// GET /api/projects/:id - Specifiek project
router.get('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;

        const result = await query('SELECT * FROM projects WHERE id = $1', [projectId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Fout bij ophalen project' });
    }
});

// POST /api/projects - Nieuw project aanmaken
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            car_make,
            car_model,
            car_year,
            service_type,
            rating = 5,
            testimonial,
            customer_name,
            main_image_url,
            before_image_url,
            after_image_url,
            gallery_images = [],
            active = true,
            featured = false,
            sort_order = 0
        } = req.body;

        if (!title || !category) {
            return res.status(400).json({ 
                error: 'Titel en categorie zijn verplicht' 
            });
        }

        const result = await query(`
            INSERT INTO projects (
                title, description, category, location, car_make, car_model, car_year,
                service_type, rating, testimonial, customer_name, main_image_url,
                before_image_url, after_image_url, gallery_images, active, featured, sort_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `, [
            title, description, category, location, car_make, car_model, car_year,
            service_type, rating, testimonial, customer_name, main_image_url,
            before_image_url, after_image_url, JSON.stringify(gallery_images), 
            active, featured, sort_order
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Fout bij aanmaken project' });
    }
});

// PUT /api/projects/:id - Project bijwerken
router.put('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;
        const {
            title,
            description,
            category,
            location,
            car_make,
            car_model,
            car_year,
            service_type,
            rating,
            testimonial,
            customer_name,
            main_image_url,
            before_image_url,
            after_image_url,
            gallery_images,
            active,
            featured,
            sort_order
        } = req.body;

        const result = await query(`
            UPDATE projects SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                location = COALESCE($4, location),
                car_make = COALESCE($5, car_make),
                car_model = COALESCE($6, car_model),
                car_year = COALESCE($7, car_year),
                service_type = COALESCE($8, service_type),
                rating = COALESCE($9, rating),
                testimonial = COALESCE($10, testimonial),
                customer_name = COALESCE($11, customer_name),
                main_image_url = COALESCE($12, main_image_url),
                before_image_url = COALESCE($13, before_image_url),
                after_image_url = COALESCE($14, after_image_url),
                gallery_images = COALESCE($15::jsonb, gallery_images),
                active = COALESCE($16, active),
                featured = COALESCE($17, featured),
                sort_order = COALESCE($18, sort_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $19
            RETURNING *
        `, [
            title, description, category, location, car_make, car_model, car_year,
            service_type, rating, testimonial, customer_name, main_image_url,
            before_image_url, after_image_url, 
            gallery_images ? JSON.stringify(gallery_images) : null,
            active, featured, sort_order, projectId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Fout bij bijwerken project' });
    }
});

// DELETE /api/projects/:id - Project verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;

        const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [projectId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project niet gevonden' });
        }

        res.json({ message: 'Project succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Fout bij verwijderen project' });
    }
});

// GET /api/projects/categories/list - Alle project categorieën
router.get('/categories/list', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                category,
                COUNT(*) as project_count
            FROM projects 
            WHERE active = true
            GROUP BY category 
            ORDER BY category
        `);

        res.json({
            categories: result.rows,
            total_categories: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching project categories:', error);
        res.status(500).json({ error: 'Fout bij ophalen categorieën' });
    }
});

module.exports = router;