const express = require('express');
const { query } = require('../database/connection');

const router = express.Router();

// GET /api/website-content/services - Alle services voor website (geen auth vereist)
router.get('/services', async (req, res) => {
    try {
        const { category = '', package_type = '' } = req.query;

        let whereClause = 'WHERE active = true';
        const params = [];
        let paramCount = 0;

        if (category) {
            paramCount++;
            whereClause += ` AND category = $${paramCount}`;
            params.push(category);
        }

        if (package_type) {
            paramCount++;
            whereClause += ` AND package_type = $${paramCount}`;
            params.push(package_type);
        }

        // Services query
        const servicesResult = await query(`
            SELECT 
                id, name, description, category, 
                base_price, price_range_min, price_range_max,
                duration_minutes, duration_text,
                package_type, subtitle, icon, image_url, features
            FROM services
            ${whereClause}
            ORDER BY 
                CASE package_type 
                    WHEN 'signature' THEN 1
                    WHEN 'individual' THEN 2
                    ELSE 3
                END,
                sort_order ASC, 
                name
        `, params);

        // Add-ons query
        const addonsResult = await query(`
            SELECT id, name, description, price
            FROM service_addons
            WHERE active = true
            ORDER BY sort_order ASC, name
        `);

        res.json({
            services: servicesResult.rows,
            addons: addonsResult.rows,
            total_services: servicesResult.rows.length,
            total_addons: addonsResult.rows.length
        });

    } catch (error) {
        console.error('Error fetching website services:', error);
        res.status(500).json({ error: 'Fout bij ophalen diensten' });
    }
});

// GET /api/website-content/projects - Alle projecten voor website (geen auth vereist)
router.get('/projects', async (req, res) => {
    try {
        const { 
            category = '', 
            limit = '', 
            featured_only = 'false',
            offset = 0 
        } = req.query;

        let whereClause = 'WHERE active = true';
        const params = [];
        let paramCount = 0;

        if (featured_only === 'true') {
            whereClause += ' AND featured = true';
        }

        if (category && category !== 'all') {
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
            SELECT 
                id, title, description, category, location,
                car_make, car_model, car_year, service_type, rating,
                testimonial, customer_name, main_image_url,
                before_image_url, after_image_url, gallery_images,
                featured
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
        console.error('Error fetching website projects:', error);
        res.status(500).json({ error: 'Fout bij ophalen projecten' });
    }
});

// GET /api/website-content/testimonials - Testimonials voor website
router.get('/testimonials', async (req, res) => {
    try {
        const { 
            limit = '',
            featured_only = 'false',
            offset = 0 
        } = req.query;

        let whereClause = 'WHERE t.active = true';
        const params = [];
        let paramCount = 0;

        if (featured_only === 'true') {
            whereClause += ' AND t.featured = true';
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
            SELECT 
                t.id, t.customer_name, t.customer_title, t.content, t.rating,
                t.featured, p.title as project_title, p.car_make, p.car_model
            FROM testimonials t
            LEFT JOIN projects p ON t.project_id = p.id
            ${whereClause}
            ORDER BY t.featured DESC, t.sort_order ASC, t.created_at DESC
            ${limitClause}
        `, params);

        res.json({
            testimonials: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching website testimonials:', error);
        res.status(500).json({ error: 'Fout bij ophalen testimonials' });
    }
});

// GET /api/website-content/project-categories - Project categorieën voor filters
router.get('/project-categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                category,
                COUNT(*) as project_count
            FROM projects 
            WHERE active = true
            GROUP BY category 
            ORDER BY 
                CASE category
                    WHEN 'premium' THEN 1
                    WHEN 'classic' THEN 2
                    WHEN 'daily' THEN 3
                    WHEN 'commercial' THEN 4
                    ELSE 5
                END
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