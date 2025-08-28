const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

// =======================
// UNIFIED VEHICLES MANAGEMENT
// =======================

// Get all vehicles with owner and driver info
router.get('/', async (req, res) => {
    try {
        const { 
            search = '', 
            owner_type = 'all',        // all, person, company
            owner_id,                  // specific owner ID
            is_active = 'true',
            vehicle_type = 'all',      // car, suv, van, truck, motorcycle, boat, other
            limit = 50,
            offset = 0
        } = req.query;

        let whereConditions = ['v.id IS NOT NULL'];
        let queryParams = [];
        let paramCount = 0;

        // Search filter
        if (search.trim()) {
            paramCount++;
            whereConditions.push(`(
                LOWER(v.make) LIKE LOWER($${paramCount}) OR 
                LOWER(v.model) LIKE LOWER($${paramCount}) OR 
                LOWER(v.license_plate) LIKE LOWER($${paramCount}) OR
                LOWER(CONCAT(v.make, ' ', v.model)) LIKE LOWER($${paramCount})
            )`);
            queryParams.push(`%${search}%`);
        }

        // Owner type filter
        if (owner_type !== 'all') {
            if (owner_type === 'person') {
                whereConditions.push('v.owner_person_id IS NOT NULL');
            } else if (owner_type === 'company') {
                whereConditions.push('v.owner_company_id IS NOT NULL');
            }
        }

        // Specific owner filter
        if (owner_id) {
            paramCount++;
            whereConditions.push(`(v.owner_person_id = $${paramCount} OR v.owner_company_id = $${paramCount})`);
            queryParams.push(owner_id);
        }

        // Active filter
        if (is_active !== 'all') {
            whereConditions.push(`v.is_active = ${is_active === 'true'}`);
        }

        // Vehicle type filter
        if (vehicle_type !== 'all') {
            paramCount++;
            whereConditions.push(`v.vehicle_type = $${paramCount}`);
            queryParams.push(vehicle_type);
        }

        // Build main query
        const queryText = `
            SELECT 
                v.*,
                -- Owner info
                CASE 
                    WHEN v.owner_person_id IS NOT NULL THEN 
                        json_build_object(
                            'type', 'person',
                            'id', op.id,
                            'name', CONCAT(op.first_name, ' ', op.last_name),
                            'email', op.email,
                            'phone', op.phone
                        )
                    WHEN v.owner_company_id IS NOT NULL THEN 
                        json_build_object(
                            'type', 'company',
                            'id', oc.id,
                            'name', oc.name,
                            'email', oc.email,
                            'phone', oc.phone
                        )
                END as owner,
                -- Primary driver info
                CASE 
                    WHEN v.primary_driver_id IS NOT NULL THEN
                        json_build_object(
                            'id', pd.id,
                            'name', CONCAT(pd.first_name, ' ', pd.last_name),
                            'email', pd.email,
                            'phone', pd.phone
                        )
                END as primary_driver,
                -- Access count (how many people can use this vehicle)
                (SELECT COUNT(*) FROM vehicle_access va WHERE va.vehicle_id = v.id) as access_count,
                -- Recent activity
                GREATEST(
                    v.updated_at,
                    (SELECT MAX(a.created_at) FROM appointments a WHERE a.vehicle_id = v.id),
                    (SELECT MAX(q.created_at) FROM quotes q WHERE q.vehicle_id = v.id)
                ) as last_activity
            FROM vehicles_new v
            LEFT JOIN persons op ON op.id = v.owner_person_id
            LEFT JOIN companies oc ON oc.id = v.owner_company_id
            LEFT JOIN persons pd ON pd.id = v.primary_driver_id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY v.make, v.model, v.year DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM vehicles_new v
            LEFT JOIN persons op ON op.id = v.owner_person_id
            LEFT JOIN companies oc ON oc.id = v.owner_company_id
            WHERE ${whereConditions.join(' AND ')}
        `;
        const countResult = await query(countQuery, queryParams.slice(0, -2));

        res.json({
            vehicles: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Fout bij ophalen voertuigen' });
    }
});

// Get single vehicle with full details
router.get('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;

        const result = await query(`
            SELECT 
                v.*,
                -- Owner details
                CASE 
                    WHEN v.owner_person_id IS NOT NULL THEN 
                        json_build_object(
                            'type', 'person',
                            'id', op.id,
                            'name', CONCAT(op.first_name, ' ', op.last_name),
                            'email', op.email,
                            'phone', op.phone,
                            'mobile', op.mobile,
                            'address', op.address,
                            'city', op.city
                        )
                    WHEN v.owner_company_id IS NOT NULL THEN 
                        json_build_object(
                            'type', 'company',
                            'id', oc.id,
                            'name', oc.name,
                            'email', oc.email,
                            'phone', oc.phone,
                            'address', oc.address,
                            'city', oc.city
                        )
                END as owner,
                -- Primary driver details
                CASE 
                    WHEN v.primary_driver_id IS NOT NULL THEN
                        json_build_object(
                            'id', pd.id,
                            'name', CONCAT(pd.first_name, ' ', pd.last_name),
                            'email', pd.email,
                            'phone', pd.phone,
                            'mobile', pd.mobile
                        )
                END as primary_driver
            FROM vehicles_new v
            LEFT JOIN persons op ON op.id = v.owner_person_id
            LEFT JOIN companies oc ON oc.id = v.owner_company_id
            LEFT JOIN persons pd ON pd.id = v.primary_driver_id
            WHERE v.id = $1
        `, [vehicleId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        const vehicle = result.rows[0];

        // Get vehicle access rights
        const accessQuery = `
            SELECT 
                va.*,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                CONCAT(p.first_name, ' ', p.last_name) as person_name
            FROM vehicle_access va
            JOIN persons p ON p.id = va.person_id
            WHERE va.vehicle_id = $1
            ORDER BY va.access_type, p.last_name, p.first_name
        `;
        const accessResult = await query(accessQuery, [vehicleId]);

        // Get vehicle history/activity
        const historyQuery = `
            SELECT 'appointment' as type,
                   a.id,
                   'Afspraak ' || to_char(a.appointment_date, 'DD-MM-YYYY') as description,
                   a.status,
                   a.created_at
            FROM appointments a
            WHERE a.vehicle_id = $1
            
            UNION ALL
            
            SELECT 'quote' as type,
                   q.id,
                   'Offerte ' || q.quote_number as description,
                   q.status,
                   q.created_at
            FROM quotes q
            WHERE q.vehicle_id = $1
            
            ORDER BY created_at DESC
            LIMIT 20
        `;
        const historyResult = await query(historyQuery, [vehicleId]);

        res.json({
            ...vehicle,
            access_rights: accessResult.rows,
            recent_activity: historyResult.rows
        });

    } catch (error) {
        console.error('Error fetching vehicle details:', error);
        res.status(500).json({ error: 'Fout bij ophalen voertuiggegevens' });
    }
});

// Create new vehicle
router.post('/', async (req, res) => {
    try {
        const {
            // Owner (either person OR company, not both)
            owner_person_id,
            owner_company_id,
            primary_driver_id,
            
            // Vehicle details
            make,
            model,
            variant,
            year,
            color,
            license_plate,
            vin,
            vehicle_type = 'car',
            fuel_type,
            engine_size,
            transmission,
            drivetrain,
            
            // Status & usage
            mileage,
            purchase_date,
            registration_date,
            next_service_date,
            insurance_expiry,
            is_active = true,
            
            // Additional
            market_value,
            notes
        } = req.body;

        // Validation
        if (!make || !model || !license_plate) {
            return res.status(400).json({ error: 'Merk, model en kenteken zijn verplicht' });
        }

        if (!owner_person_id && !owner_company_id) {
            return res.status(400).json({ error: 'Eigenaar (persoon of bedrijf) is verplicht' });
        }

        if (owner_person_id && owner_company_id) {
            return res.status(400).json({ error: 'Voertuig kan niet zowel van een persoon als bedrijf zijn' });
        }

        // Check license plate uniqueness
        const licenseCheck = await query('SELECT id FROM vehicles_new WHERE license_plate = $1', [license_plate]);
        if (licenseCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Dit kenteken is al in gebruik' });
        }

        // Validate owner exists
        if (owner_person_id) {
            const personCheck = await query('SELECT id FROM persons WHERE id = $1', [owner_person_id]);
            if (personCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Eigenaar persoon niet gevonden' });
            }
        }

        if (owner_company_id) {
            const companyCheck = await query('SELECT id FROM companies WHERE id = $1 AND is_active = true', [owner_company_id]);
            if (companyCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Eigenaar bedrijf niet gevonden' });
            }
        }

        // Validate primary driver exists
        if (primary_driver_id) {
            const driverCheck = await query('SELECT id FROM persons WHERE id = $1', [primary_driver_id]);
            if (driverCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Hoofdbestuurder niet gevonden' });
            }
        }

        const result = await query(`
            INSERT INTO vehicles_new (
                owner_person_id, owner_company_id, primary_driver_id,
                make, model, variant, year, color, license_plate, vin,
                vehicle_type, fuel_type, engine_size, transmission, drivetrain,
                mileage, purchase_date, registration_date, next_service_date, insurance_expiry,
                is_active, market_value, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *
        `, [
            owner_person_id, owner_company_id, primary_driver_id,
            make, model, variant, year, color, license_plate, vin,
            vehicle_type, fuel_type, engine_size, transmission, drivetrain,
            mileage, purchase_date, registration_date, next_service_date, insurance_expiry,
            is_active, market_value, notes
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating vehicle:', error);
        res.status(500).json({ error: 'Fout bij aanmaken voertuig' });
    }
});

// Update vehicle
router.put('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;
        const updateData = req.body;

        // Check if vehicle exists
        const existingVehicle = await query('SELECT * FROM vehicles_new WHERE id = $1', [vehicleId]);
        if (existingVehicle.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        // Validate license plate uniqueness if changed
        if (updateData.license_plate) {
            const licenseCheck = await query(
                'SELECT id FROM vehicles_new WHERE license_plate = $1 AND id != $2', 
                [updateData.license_plate, vehicleId]
            );
            if (licenseCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Dit kenteken is al in gebruik' });
            }
        }

        // Build dynamic update query
        const allowedFields = [
            'owner_person_id', 'owner_company_id', 'primary_driver_id',
            'make', 'model', 'variant', 'year', 'color', 'license_plate', 'vin',
            'vehicle_type', 'fuel_type', 'engine_size', 'transmission', 'drivetrain',
            'mileage', 'purchase_date', 'registration_date', 'next_service_date', 'insurance_expiry',
            'is_active', 'market_value', 'notes'
        ];

        const updates = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${paramCount + 1}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Geen geldige update velden opgegeven' });
        }

        const updateQuery = `
            UPDATE vehicles_new SET
                ${updates.join(', ')},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await query(updateQuery, [vehicleId, ...values]);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ error: 'Fout bij bijwerken voertuig' });
    }
});

// Delete vehicle (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;

        // Check if vehicle exists
        const existingVehicle = await query('SELECT * FROM vehicles_new WHERE id = $1', [vehicleId]);
        if (existingVehicle.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        // Check for dependencies
        const dependencyChecks = [
            { table: 'appointments', column: 'vehicle_id', name: 'afspraken' },
            { table: 'quotes', column: 'vehicle_id', name: 'offertes' },
            { table: 'invoices', column: 'vehicle_id', name: 'facturen' }
        ];

        for (const check of dependencyChecks) {
            const depResult = await query(`SELECT COUNT(*) FROM ${check.table} WHERE ${check.column} = $1`, [vehicleId]);
            if (depResult.rows[0].count > 0) {
                return res.status(400).json({ 
                    error: `Kan voertuig niet verwijderen: er zijn nog ${check.name} gekoppeld` 
                });
            }
        }

        // Soft delete
        await query(`
            UPDATE vehicles_new SET
                is_active = false,
                notes = COALESCE(notes, '') || '\n[VERWIJDERD: ' || CURRENT_DATE || ']',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [vehicleId]);

        res.json({ message: 'Voertuig succesvol gedeactiveerd' });

    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ error: 'Fout bij verwijderen voertuig' });
    }
});

// =======================
// VEHICLE ACCESS MANAGEMENT
// =======================

// Add person access to vehicle
router.post('/:vehicleId/access', async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;
        const { person_id, access_type = 'driver', notes } = req.body;

        if (!person_id) {
            return res.status(400).json({ error: 'Person ID is verplicht' });
        }

        // Check if vehicle exists
        const vehicleCheck = await query('SELECT id FROM vehicles_new WHERE id = $1', [vehicleId]);
        if (vehicleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Voertuig niet gevonden' });
        }

        // Check if person exists
        const personCheck = await query('SELECT id FROM persons WHERE id = $1', [person_id]);
        if (personCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Persoon niet gevonden' });
        }

        const result = await query(`
            INSERT INTO vehicle_access (vehicle_id, person_id, access_type, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (vehicle_id, person_id, access_type) 
            DO UPDATE SET notes = EXCLUDED.notes, created_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [vehicleId, person_id, access_type, notes]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error adding vehicle access:', error);
        res.status(500).json({ error: 'Fout bij toevoegen voertuigtoegang' });
    }
});

// Remove person access from vehicle
router.delete('/:vehicleId/access/:personId/:accessType', async (req, res) => {
    try {
        const { vehicleId, personId, accessType } = req.params;

        const result = await query(
            'DELETE FROM vehicle_access WHERE vehicle_id = $1 AND person_id = $2 AND access_type = $3',
            [vehicleId, personId, accessType]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Voertuigtoegang niet gevonden' });
        }

        res.json({ message: 'Voertuigtoegang succesvol verwijderd' });

    } catch (error) {
        console.error('Error removing vehicle access:', error);
        res.status(500).json({ error: 'Fout bij verwijderen voertuigtoegang' });
    }
});

module.exports = router;