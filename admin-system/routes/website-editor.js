const express = require('express');
const { query } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/website-editor/services - Services voor website editor (met live preview data)
router.get('/services', async (req, res) => {
    try {
        const { package_type = '', category = '' } = req.query;

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

        // Get services with ALL fields needed for website display
        const servicesResult = await query(`
            SELECT 
                id, name, description, category, 
                base_price, price_range_min, price_range_max,
                duration_minutes, duration_text,
                package_type, subtitle, icon, image_url, features,
                active, featured, sort_order
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

        // Get add-ons
        const addonsResult = await query(`
            SELECT id, name, description, price, active
            FROM service_addons
            WHERE active = true
            ORDER BY sort_order ASC, name
        `);

        // Format for website preview
        const formattedServices = servicesResult.rows.map(service => ({
            ...service,
            formatted_price: formatServicePrice(service),
            formatted_duration: formatDuration(service),
            features_list: Array.isArray(service.features) ? service.features : []
        }));

        res.json({
            services: formattedServices,
            addons: addonsResult.rows,
            total_services: formattedServices.length,
            total_addons: addonsResult.rows.length,
            preview_data: {
                signature_packages: formattedServices.filter(s => s.package_type === 'signature'),
                individual_services: formattedServices.filter(s => s.package_type === 'individual'),
                addons: addonsResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching website editor services:', error);
        res.status(500).json({ error: 'Fout bij ophalen diensten voor website editor' });
    }
});

// PUT /api/website-editor/services/:id - Update service for website (simplified fields)
router.put('/services/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;
        const {
            name,
            subtitle, 
            description,
            price_range_min,
            price_range_max,
            duration_text,
            features,
            image_url,
            featured,
            active
        } = req.body;

        // Process features array
        const featuresArray = Array.isArray(features) ? features : 
                            (typeof features === 'string' ? features.split('\n').filter(f => f.trim()) : []);

        const result = await query(`
            UPDATE services SET
                name = COALESCE($1, name),
                subtitle = COALESCE($2, subtitle),
                description = COALESCE($3, description),
                price_range_min = COALESCE($4, price_range_min),
                price_range_max = COALESCE($5, price_range_max),
                duration_text = COALESCE($6, duration_text),
                features = COALESCE($7::jsonb, features),
                image_url = COALESCE($8, image_url),
                featured = COALESCE($9, featured),
                active = COALESCE($10, active)
            WHERE id = $11
            RETURNING *
        `, [
            name, subtitle, description, 
            price_range_min, price_range_max, duration_text,
            JSON.stringify(featuresArray),
            image_url, featured, active, serviceId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service niet gevonden' });
        }

        // Return formatted service
        const service = result.rows[0];
        res.json({
            ...service,
            formatted_price: formatServicePrice(service),
            formatted_duration: formatDuration(service),
            features_list: Array.isArray(service.features) ? service.features : []
        });

    } catch (error) {
        console.error('Error updating website service:', error);
        res.status(500).json({ error: 'Fout bij bijwerken service voor website' });
    }
});

// GET /api/website-editor/projects - Projects voor website editor
router.get('/projects', async (req, res) => {
    try {
        const { category = '', featured_only = 'false' } = req.query;

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

        const result = await query(`
            SELECT 
                id, title, description, category, location,
                car_make, car_model, car_year, service_type, rating,
                testimonial, customer_name, main_image_url,
                before_image_url, after_image_url, gallery_images,
                featured, active
            FROM projects
            ${whereClause}
            ORDER BY featured DESC, sort_order ASC, created_at DESC
        `, params);

        res.json({
            projects: result.rows,
            total_count: result.rows.length,
            categories: await getProjectCategories()
        });

    } catch (error) {
        console.error('Error fetching website editor projects:', error);
        res.status(500).json({ error: 'Fout bij ophalen projecten voor website editor' });
    }
});

// Helper functions
function formatServicePrice(service) {
    if (service.price_range_min && service.price_range_max) {
        if (service.price_range_min === service.price_range_max) {
            return `€${parseFloat(service.price_range_min).toFixed(0)}`;
        } else {
            return `€${parseFloat(service.price_range_min).toFixed(0)} - €${parseFloat(service.price_range_max).toFixed(0)}`;
        }
    } else if (service.base_price) {
        return `€${parseFloat(service.base_price).toFixed(0)}`;
    } else {
        return 'Op aanvraag';
    }
}

function formatDuration(service) {
    if (service.duration_text) {
        return service.duration_text;
    } else if (service.duration_minutes) {
        const hours = Math.floor(service.duration_minutes / 60);
        const minutes = service.duration_minutes % 60;
        return minutes > 0 ? `${hours}u ${minutes}m` : `${hours}u`;
    } else {
        return '';
    }
}

async function getProjectCategories() {
    const result = await query(`
        SELECT category, COUNT(*) as project_count
        FROM projects 
        WHERE active = true
        GROUP BY category 
        ORDER BY category
    `);
    return result.rows;
}

module.exports = router;