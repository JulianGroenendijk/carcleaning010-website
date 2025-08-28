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

        // Check which columns exist in the services table
        const columnsResult = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'services' AND table_schema = 'public'
        `);
        
        const availableColumns = columnsResult.rows.map(row => row.column_name);
        console.log('Available columns in services table:', availableColumns);
        
        // Build dynamic column list based on what exists
        const baseColumns = ['id', 'name', 'description', 'category', 'base_price', 'duration_minutes', 'active'];
        const newColumns = ['price_range_min', 'price_range_max', 'duration_text', 'package_type', 'subtitle', 'icon', 'image_url', 'features', 'featured', 'sort_order'];
        
        const selectColumns = [...baseColumns];
        newColumns.forEach(col => {
            if (availableColumns.includes(col)) {
                selectColumns.push(col);
            }
        });

        console.log('Using columns for SELECT:', selectColumns);

        // Get services with available fields
        const servicesResult = await query(`
            SELECT ${selectColumns.join(', ')}
            FROM services
            ${whereClause}
            ORDER BY 
                ${availableColumns.includes('package_type') ? `
                CASE package_type 
                    WHEN 'signature' THEN 1
                    WHEN 'individual' THEN 2
                    ELSE 3
                END,` : ''}
                ${availableColumns.includes('sort_order') ? 'sort_order ASC,' : ''} 
                name
        `, params);

        // Get add-ons (if table exists)
        let addonsResult = { rows: [] };
        try {
            addonsResult = await query(`
                SELECT id, name, description, price, active
                FROM service_addons
                WHERE active = true
                ORDER BY sort_order ASC, name
            `);
            console.log('Found service addons:', addonsResult.rows.length);
        } catch (error) {
            console.log('Service addons table not found, using empty array');
            addonsResult = { rows: [] };
        }

        // Format for website preview with safe defaults
        const formattedServices = servicesResult.rows.map(service => ({
            ...service,
            // Add safe defaults for missing fields
            price_range_min: service.price_range_min || service.base_price || '0',
            price_range_max: service.price_range_max || service.base_price || '0',
            package_type: service.package_type || 'individual',
            subtitle: service.subtitle || service.description || '',
            icon: service.icon || '▪',
            image_url: service.image_url || null,
            features: service.features || [],
            featured: service.featured || false,
            sort_order: service.sort_order || 0,
            duration_text: service.duration_text || null,
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

        // Check which columns exist in the services table
        const columnsResult = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'services' AND table_schema = 'public'
        `);
        
        const availableColumns = columnsResult.rows.map(row => row.column_name);
        console.log('Available columns for UPDATE:', availableColumns);

        // Build dynamic UPDATE query based on available columns
        const updates = [];
        const values = [];
        let paramCount = 0;

        // Always update these base fields
        if (name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            values.push(name);
        }

        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            values.push(description);
        }

        if (active !== undefined) {
            paramCount++;
            updates.push(`active = $${paramCount}`);
            values.push(active);
        }

        // Only update new columns if they exist
        if (availableColumns.includes('subtitle') && subtitle !== undefined) {
            paramCount++;
            updates.push(`subtitle = $${paramCount}`);
            values.push(subtitle);
        }

        if (availableColumns.includes('price_range_min') && price_range_min !== undefined) {
            paramCount++;
            updates.push(`price_range_min = $${paramCount}`);
            values.push(price_range_min);
        }

        if (availableColumns.includes('price_range_max') && price_range_max !== undefined) {
            paramCount++;
            updates.push(`price_range_max = $${paramCount}`);
            values.push(price_range_max);
        }

        if (availableColumns.includes('duration_text') && duration_text !== undefined) {
            paramCount++;
            updates.push(`duration_text = $${paramCount}`);
            values.push(duration_text);
        }

        if (availableColumns.includes('features') && features !== undefined) {
            paramCount++;
            updates.push(`features = $${paramCount}::jsonb`);
            const featuresArray = Array.isArray(features) ? features : 
                                (typeof features === 'string' ? features.split('\n').filter(f => f.trim()) : []);
            values.push(JSON.stringify(featuresArray));
        }

        if (availableColumns.includes('image_url') && image_url !== undefined) {
            paramCount++;
            updates.push(`image_url = $${paramCount}`);
            values.push(image_url);
        }

        if (availableColumns.includes('featured') && featured !== undefined) {
            paramCount++;
            updates.push(`featured = $${paramCount}`);
            values.push(featured);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Geen velden om bij te werken' });
        }

        // Add the service ID as the last parameter
        paramCount++;
        values.push(serviceId);

        const updateQuery = `
            UPDATE services SET
                ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        console.log('Executing UPDATE query:', updateQuery);
        console.log('With values:', values);

        const result = await query(updateQuery, values);

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