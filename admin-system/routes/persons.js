const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

// =======================
// PERSONS CRUD OPERATIONS
// =======================

// Get all persons with filtering and search
router.get('/', async (req, res) => {
    try {
        const { 
            search = '', 
            type = 'all',           // all, individual_customers, business_customers, individual_leads, business_leads, contacts
            company_id,             // Filter by company association
            status = 'all',         // all, active, inactive
            limit = 50,
            offset = 0
        } = req.query;

        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramCount = 0;

        // Search filter
        if (search.trim()) {
            paramCount++;
            whereConditions.push(`(
                LOWER(p.first_name) LIKE LOWER($${paramCount}) OR 
                LOWER(p.last_name) LIKE LOWER($${paramCount}) OR 
                LOWER(p.email) LIKE LOWER($${paramCount}) OR
                LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${paramCount})
            )`);
            queryParams.push(`%${search}%`);
        }

        // Type filter
        if (type !== 'all') {
            switch (type) {
                case 'individual_customers':
                    whereConditions.push('p.is_individual_customer = true');
                    break;
                case 'business_customers':
                    whereConditions.push('p.is_business_customer = true');
                    break;
                case 'individual_leads':
                    whereConditions.push('p.is_individual_lead = true');
                    break;
                case 'business_leads':
                    whereConditions.push('p.is_business_lead = true');
                    break;
                case 'leads':
                    whereConditions.push('(p.is_individual_lead = true OR p.is_business_lead = true)');
                    break;
                case 'customers':
                    whereConditions.push('(p.is_individual_customer = true OR p.is_business_customer = true)');
                    break;
                case 'contacts':
                    whereConditions.push(`EXISTS (
                        SELECT 1 FROM person_company_roles pcr 
                        WHERE pcr.person_id = p.id AND pcr.is_active = true
                    )`);
                    break;
            }
        }

        // Company filter
        if (company_id) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM person_company_roles pcr 
                WHERE pcr.person_id = p.id AND pcr.company_id = $${paramCount} AND pcr.is_active = true
            )`);
            queryParams.push(company_id);
        }

        // Simplified query without complex joins
        const queryText = `
            SELECT 
                p.*,
                '[]'::json as companies,
                0 as vehicle_count,
                p.updated_at as last_activity
            FROM persons p
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.last_name, p.first_name
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM persons p
            WHERE ${whereConditions.join(' AND ')}
        `;
        const countResult = await query(countQuery, queryParams.slice(0, -2));

        res.json({
            persons: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching persons:', error);
        res.status(500).json({ error: 'Fout bij ophalen personen' });
    }
});

// Get single person by ID with full details
router.get('/:id', async (req, res) => {
    try {
        const personId = req.params.id;

        // Simplified person query
        const personQuery = `
            SELECT * FROM persons WHERE id = $1
        `;
        const personResult = await query(personQuery, [personId]);

        if (personResult.rows.length === 0) {
            return res.status(404).json({ error: 'Persoon niet gevonden' });
        }

        const person = personResult.rows[0];

        // Return basic person info for now
        res.json({
            ...person,
            companies: [],
            owned_vehicles: [],
            accessible_vehicles: [],
            recent_activity: []
        });

    } catch (error) {
        console.error('Error fetching person details:', error);
        res.status(500).json({ error: 'Fout bij ophalen persoongegevens' });
    }
});

// Create new person
router.post('/', async (req, res) => {
    try {
        const {
            email,
            first_name,
            last_name,
            phone,
            mobile,
            address,
            city,
            postal_code,
            date_of_birth,
            gender,
            language_preference = 'nl',
            marketing_consent = false,
            is_individual_lead = false,
            is_business_lead = false,
            lead_source,
            lead_status = 'new',
            notes
        } = req.body;

        // Validation
        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'Voor- en achternaam zijn verplicht' });
        }

        // Check email uniqueness if provided
        if (email) {
            const emailCheck = await query('SELECT id FROM persons WHERE email = $1', [email]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Dit e-mailadres is al in gebruik' });
            }
        }

        const result = await query(`
            INSERT INTO persons (
                email, first_name, last_name, phone, mobile, address, city, postal_code,
                date_of_birth, gender, language_preference, marketing_consent,
                is_individual_lead, is_business_lead, lead_source, lead_status, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `, [
            email, first_name, last_name, phone, mobile, address, city, postal_code,
            date_of_birth, gender, language_preference, marketing_consent,
            is_individual_lead, is_business_lead, lead_source, lead_status, notes
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating person:', error);
        res.status(500).json({ error: 'Fout bij aanmaken persoon' });
    }
});

// Update person
router.put('/:id', async (req, res) => {
    try {
        const personId = req.params.id;
        const {
            email,
            first_name,
            last_name,
            phone,
            mobile,
            address,
            city,
            postal_code,
            date_of_birth,
            gender,
            language_preference,
            marketing_consent,
            lead_source,
            lead_status,
            notes
        } = req.body;

        // Check if person exists
        const existingPerson = await query('SELECT id FROM persons WHERE id = $1', [personId]);
        if (existingPerson.rows.length === 0) {
            return res.status(404).json({ error: 'Persoon niet gevonden' });
        }

        // Check email uniqueness if changed
        if (email) {
            const emailCheck = await query('SELECT id FROM persons WHERE email = $1 AND id != $2', [email, personId]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Dit e-mailadres is al in gebruik' });
            }
        }

        const result = await query(`
            UPDATE persons SET
                email = $2,
                first_name = $3,
                last_name = $4,
                phone = $5,
                mobile = $6,
                address = $7,
                city = $8,
                postal_code = $9,
                date_of_birth = $10,
                gender = $11,
                language_preference = $12,
                marketing_consent = $13,
                lead_source = $14,
                lead_status = $15,
                notes = $16,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [
            personId, email, first_name, last_name, phone, mobile, address, city, postal_code,
            date_of_birth, gender, language_preference, marketing_consent, lead_source, lead_status, notes
        ]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating person:', error);
        res.status(500).json({ error: 'Fout bij bijwerken persoon' });
    }
});

// Delete person (soft delete by marking inactive)
router.delete('/:id', async (req, res) => {
    try {
        const personId = req.params.id;

        // Check if person exists
        const existingPerson = await query('SELECT id FROM persons WHERE id = $1', [personId]);
        if (existingPerson.rows.length === 0) {
            return res.status(404).json({ error: 'Persoon niet gevonden' });
        }

        // Check for dependencies
        const dependencyChecks = [
            { table: 'invoices', column: 'person_id', name: 'facturen' },
            { table: 'appointments', column: 'person_id', name: 'afspraken' },
            { table: 'vehicles_new', column: 'owner_person_id', name: 'voertuigen' }
        ];

        for (const check of dependencyChecks) {
            const depResult = await query(`SELECT COUNT(*) FROM ${check.table} WHERE ${check.column} = $1`, [personId]);
            if (depResult.rows[0].count > 0) {
                return res.status(400).json({ 
                    error: `Kan persoon niet verwijderen: er zijn nog ${check.name} gekoppeld` 
                });
            }
        }

        // Soft delete by deactivating company roles and adding deletion note
        await query(`
            UPDATE person_company_roles 
            SET is_active = false, 
                notes = COALESCE(notes, '') || '\n[VERWIJDERD: ' || CURRENT_DATE || ']'
            WHERE person_id = $1
        `, [personId]);

        await query(`
            UPDATE persons 
            SET email = NULL,  -- Remove email to prevent conflicts
                notes = COALESCE(notes, '') || '\n[VERWIJDERD: ' || CURRENT_DATE || ']'
            WHERE id = $1
        `, [personId]);

        res.json({ message: 'Persoon succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting person:', error);
        res.status(500).json({ error: 'Fout bij verwijderen persoon' });
    }
});

// =======================
// LEAD CONVERSION ENDPOINTS
// =======================

// Convert lead to customer
router.post('/:id/convert-to-customer', async (req, res) => {
    try {
        const personId = req.params.id;
        const { 
            conversion_type = 'individual',  // 'individual' or 'business'
            company_id,
            reason = 'Handmatige conversie via admin interface'
        } = req.body;

        // Validation
        if (conversion_type === 'business' && !company_id) {
            return res.status(400).json({ error: 'Bedrijf ID is verplicht voor zakelijke conversie' });
        }

        // Call stored procedure
        const result = await query(
            'SELECT convert_lead_to_customer($1, $2, $3, $4) as success',
            [personId, conversion_type, company_id, reason]
        );

        if (result.rows[0].success) {
            // Fetch updated person data
            const updatedPerson = await query('SELECT * FROM persons WHERE id = $1', [personId]);
            res.json({ 
                message: 'Lead succesvol geconverteerd naar klant',
                person: updatedPerson.rows[0]
            });
        } else {
            res.status(400).json({ error: 'Fout bij conversie van lead naar klant' });
        }

    } catch (error) {
        console.error('Error converting lead:', error);
        res.status(500).json({ error: `Fout bij lead conversie: ${error.message}` });
    }
});

// Bulk convert leads to customers
router.post('/bulk-convert', async (req, res) => {
    try {
        const {
            person_ids,
            conversion_type = 'individual',
            company_id
        } = req.body;

        if (!person_ids || !Array.isArray(person_ids) || person_ids.length === 0) {
            return res.status(400).json({ error: 'Person IDs array is verplicht' });
        }

        const result = await query(
            'SELECT * FROM bulk_convert_leads_to_customers($1, $2, $3)',
            [person_ids, conversion_type, company_id]
        );

        const results = result.rows;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        res.json({
            message: `${successful} van ${person_ids.length} leads succesvol geconverteerd`,
            successful_conversions: successful,
            failed_conversions: failed.length,
            errors: failed
        });

    } catch (error) {
        console.error('Error bulk converting leads:', error);
        res.status(500).json({ error: `Fout bij bulk lead conversie: ${error.message}` });
    }
});

module.exports = router;