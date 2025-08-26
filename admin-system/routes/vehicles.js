const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/vehicles - Alle voertuigen met filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            customer_id = '',
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
                v.license_plate ILIKE $${paramCount} OR 
                v.make ILIKE $${paramCount} OR 
                v.model ILIKE $${paramCount} OR
                v.color ILIKE $${paramCount} OR
                c.first_name ILIKE $${paramCount} OR
                c.last_name ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Klant filter
        if (customer_id) {
            paramCount++;
            whereClause += ` AND v.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['created_at', 'license_plate', 'make', 'model', 'year'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const vehiclesQuery = `
            SELECT 
                v.*,
                c.first_name || ' ' || c.last_name as owner_name,
                COUNT(*) OVER() as total_count
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            ${whereClause}
            ORDER BY v.${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(vehiclesQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            vehicles: result.rows.map(row => {
                const { total_count, ...vehicle } = row;
                return vehicle;
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
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Fout bij ophalen voertuigen' });
    }
});

// GET /api/vehicles/:id - Specifiek voertuig
router.get('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;

        const result = await query(`
            SELECT 
                v.*,
                c.first_name || ' ' || c.last_name as owner_name,
                c.email as owner_email,
                c.phone as owner_phone
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.id = $1
        `, [vehicleId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: 'Fout bij ophalen voertuig' });
    }
});

// POST /api/vehicles - Nieuw voertuig toevoegen
router.post('/', async (req, res) => {
    try {
        const {
            customer_id,
            license_plate,
            make,
            model,
            year,
            color,
            fuel_type,
            notes
        } = req.body;

        // Validatie
        if (!customer_id || !license_plate || !make || !model) {
            return res.status(400).json({ 
                error: 'Klant, kenteken, merk en model zijn verplicht' 
            });
        }

        // Check of kenteken al bestaat
        const existingVehicle = await query(
            'SELECT id FROM vehicles WHERE license_plate = $1',
            [license_plate]
        );

        if (existingVehicle.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Voertuig met dit kenteken bestaat al' 
            });
        }

        const result = await query(`
            INSERT INTO vehicles (
                customer_id, license_plate, make, model, 
                year, color, fuel_type, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [customer_id, license_plate.toUpperCase(), make, model, year, color, fuel_type, notes]);

        // Haal volledig voertuig op met eigenaar info
        const fullVehicle = await query(`
            SELECT 
                v.*,
                c.first_name || ' ' || c.last_name as owner_name,
                c.email as owner_email
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.id = $1
        `, [result.rows[0].id]);

        res.status(201).json(fullVehicle.rows[0]);

    } catch (error) {
        console.error('Error creating vehicle:', error);
        res.status(500).json({ error: 'Fout bij aanmaken voertuig' });
    }
});

// PUT /api/vehicles/:id - Voertuig bijwerken
router.put('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;
        const {
            customer_id,
            license_plate,
            make,
            model,
            year,
            color,
            fuel_type,
            notes
        } = req.body;

        // Check of voertuig bestaat
        const existingVehicle = await query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
        if (existingVehicle.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        // Check kenteken conflict (behalve bij zelfde voertuig)
        if (license_plate) {
            const duplicateCheck = await query(
                'SELECT id FROM vehicles WHERE license_plate = $1 AND id != $2',
                [license_plate, vehicleId]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({ 
                    error: 'Voertuig met dit kenteken bestaat al' 
                });
            }
        }

        const result = await query(`
            UPDATE vehicles SET
                customer_id = COALESCE($1, customer_id),
                license_plate = COALESCE($2, license_plate),
                make = COALESCE($3, make),
                model = COALESCE($4, model),
                year = COALESCE($5, year),
                color = COALESCE($6, color),
                fuel_type = COALESCE($7, fuel_type),
                notes = COALESCE($8, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [
            customer_id, 
            license_plate ? license_plate.toUpperCase() : null, 
            make, model, year, color, fuel_type, notes, vehicleId
        ]);

        // Haal volledig voertuig op met eigenaar info
        const fullVehicle = await query(`
            SELECT 
                v.*,
                c.first_name || ' ' || c.last_name as owner_name,
                c.email as owner_email
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.id = $1
        `, [vehicleId]);

        res.json(fullVehicle.rows[0]);

    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ error: 'Fout bij bijwerken voertuig' });
    }
});

// DELETE /api/vehicles/:id - Voertuig verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;

        const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [vehicleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        res.json({ message: 'Voertuig succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ error: 'Fout bij verwijderen voertuig' });
    }
});

// GET /api/vehicles/by-customer/:customer_id - Voertuigen van specifieke klant
router.get('/by-customer/:customer_id', async (req, res) => {
    try {
        const customerId = req.params.customer_id;

        const result = await query(`
            SELECT v.*, c.first_name || ' ' || c.last_name as owner_name
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.customer_id = $1
            ORDER BY v.created_at DESC
        `, [customerId]);

        res.json({
            vehicles: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching customer vehicles:', error);
        res.status(500).json({ error: 'Fout bij ophalen klant voertuigen' });
    }
});

// GET /api/vehicles/search/:license_plate - Zoek voertuig op kenteken
router.get('/search/:license_plate', async (req, res) => {
    try {
        const licensePlate = req.params.license_plate.toUpperCase();

        const result = await query(`
            SELECT 
                v.*,
                c.first_name || ' ' || c.last_name as owner_name,
                c.email as owner_email,
                c.phone as owner_phone
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.license_plate = $1
        `, [licensePlate]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error searching vehicle by license plate:', error);
        res.status(500).json({ error: 'Fout bij zoeken voertuig' });
    }
});

module.exports = router;