const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

// =======================
// PERSON-COMPANY RELATIONSHIPS
// =======================

// Get all company roles for a person
router.get('/person/:personId', async (req, res) => {
    try {
        const personId = req.params.personId;

        const result = await query(`
            SELECT 
                pcr.*,
                c.name as company_name,
                c.address as company_address,
                c.city as company_city,
                c.phone as company_phone,
                c.email as company_email,
                c.btw_number as company_btw
            FROM person_company_roles pcr
            JOIN companies c ON c.id = pcr.company_id
            WHERE pcr.person_id = $1
            ORDER BY pcr.is_active DESC, pcr.is_primary_contact DESC, c.name
        `, [personId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching person company roles:', error);
        res.status(500).json({ error: 'Fout bij ophalen bedrijfsrollen' });
    }
});

// Get all person roles for a company
router.get('/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;

        const result = await query(`
            SELECT 
                pcr.*,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.mobile,
                p.is_individual_customer,
                p.is_business_customer,
                p.is_individual_lead,
                p.is_business_lead,
                CONCAT(p.first_name, ' ', p.last_name) as full_name
            FROM person_company_roles pcr
            JOIN persons p ON p.id = pcr.person_id
            WHERE pcr.company_id = $1
            ORDER BY pcr.is_active DESC, pcr.is_primary_contact DESC, p.last_name, p.first_name
        `, [companyId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching company person roles:', error);
        res.status(500).json({ error: 'Fout bij ophalen persoonrollen' });
    }
});

// Add person to company with specific role
router.post('/', async (req, res) => {
    try {
        const {
            person_id,
            company_id,
            role_type = 'contact',
            job_title,
            department,
            is_primary_contact = false,
            is_billing_contact = false,
            is_technical_contact = false,
            is_decision_maker = false,
            start_date,
            notes
        } = req.body;

        // Validation
        if (!person_id || !company_id) {
            return res.status(400).json({ error: 'Person ID en Company ID zijn verplicht' });
        }

        // Check if person and company exist
        const personCheck = await query('SELECT id FROM persons WHERE id = $1', [person_id]);
        if (personCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Persoon niet gevonden' });
        }

        const companyCheck = await query('SELECT id FROM companies WHERE id = $1 AND is_active = true', [company_id]);
        if (companyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijf niet gevonden' });
        }

        // Check if relationship already exists
        const existingRole = await query(
            'SELECT id FROM person_company_roles WHERE person_id = $1 AND company_id = $2 AND role_type = $3',
            [person_id, company_id, role_type]
        );

        if (existingRole.rows.length > 0) {
            return res.status(400).json({ error: 'Deze persoon heeft al deze rol bij dit bedrijf' });
        }

        // If setting as primary contact, remove primary status from others
        if (is_primary_contact) {
            await query(`
                UPDATE person_company_roles 
                SET is_primary_contact = false 
                WHERE company_id = $1 AND is_primary_contact = true
            `, [company_id]);
        }

        const result = await query(`
            INSERT INTO person_company_roles (
                person_id, company_id, role_type, job_title, department,
                is_primary_contact, is_billing_contact, is_technical_contact, is_decision_maker,
                start_date, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            person_id, company_id, role_type, job_title, department,
            is_primary_contact, is_billing_contact, is_technical_contact, is_decision_maker,
            start_date || new Date().toISOString().split('T')[0], notes
        ]);

        // Update person business status if they now have a business relationship
        if (result.rows[0]) {
            await query(`
                UPDATE persons SET 
                    is_business_lead = CASE 
                        WHEN NOT is_business_customer THEN true 
                        ELSE is_business_lead 
                    END
                WHERE id = $1 AND NOT (is_individual_customer OR is_business_customer)
            `, [person_id]);
        }

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating person company role:', error);
        res.status(500).json({ error: 'Fout bij aanmaken bedrijfsrol' });
    }
});

// Update person-company role
router.put('/:id', async (req, res) => {
    try {
        const roleId = req.params.id;
        const {
            role_type,
            job_title,
            department,
            is_primary_contact,
            is_billing_contact,
            is_technical_contact,
            is_decision_maker,
            is_active,
            start_date,
            end_date,
            notes
        } = req.body;

        // Check if role exists
        const existingRole = await query('SELECT * FROM person_company_roles WHERE id = $1', [roleId]);
        if (existingRole.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijfsrol niet gevonden' });
        }

        const role = existingRole.rows[0];

        // If setting as primary contact, remove primary status from others
        if (is_primary_contact && !role.is_primary_contact) {
            await query(`
                UPDATE person_company_roles 
                SET is_primary_contact = false 
                WHERE company_id = $1 AND is_primary_contact = true AND id != $2
            `, [role.company_id, roleId]);
        }

        const result = await query(`
            UPDATE person_company_roles SET
                role_type = $2,
                job_title = $3,
                department = $4,
                is_primary_contact = $5,
                is_billing_contact = $6,
                is_technical_contact = $7,
                is_decision_maker = $8,
                is_active = $9,
                start_date = $10,
                end_date = $11,
                notes = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [
            roleId, role_type, job_title, department,
            is_primary_contact, is_billing_contact, is_technical_contact, is_decision_maker,
            is_active, start_date, end_date, notes
        ]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating person company role:', error);
        res.status(500).json({ error: 'Fout bij bijwerken bedrijfsrol' });
    }
});

// Remove person from company (set inactive)
router.delete('/:id', async (req, res) => {
    try {
        const roleId = req.params.id;

        // Check if role exists
        const existingRole = await query('SELECT * FROM person_company_roles WHERE id = $1', [roleId]);
        if (existingRole.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijfsrol niet gevonden' });
        }

        // Soft delete by setting inactive and end date
        await query(`
            UPDATE person_company_roles SET
                is_active = false,
                end_date = CURRENT_DATE,
                notes = COALESCE(notes, '') || '\n[VERWIJDERD: ' || CURRENT_DATE || ']',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [roleId]);

        res.json({ message: 'Bedrijfsrol succesvol gedeactiveerd' });

    } catch (error) {
        console.error('Error deactivating person company role:', error);
        res.status(500).json({ error: 'Fout bij deactiveren bedrijfsrol' });
    }
});

// =======================
// COMPANY-SPECIFIC ENDPOINTS
// =======================

// Get all contacts for a company with their details
router.get('/company/:companyId/contacts', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const { active_only = 'true' } = req.query;

        let whereClause = 'pcr.company_id = $1';
        if (active_only === 'true') {
            whereClause += ' AND pcr.is_active = true';
        }

        const result = await query(`
            SELECT 
                pcr.id as role_id,
                pcr.role_type,
                pcr.job_title,
                pcr.department,
                pcr.is_primary_contact,
                pcr.is_billing_contact,
                pcr.is_technical_contact,
                pcr.is_decision_maker,
                pcr.is_active,
                pcr.start_date,
                pcr.end_date,
                pcr.notes as role_notes,
                pcr.created_at as role_created_at,
                p.*,
                CONCAT(p.first_name, ' ', p.last_name) as full_name,
                -- Vehicle count owned by this person
                (SELECT COUNT(*) FROM vehicles_new v WHERE v.owner_person_id = p.id AND v.is_active = true) as owned_vehicles_count,
                -- Last activity
                (
                    SELECT MAX(activity_date) FROM (
                        SELECT MAX(i.created_at) as activity_date FROM invoices i WHERE i.person_id = p.id
                        UNION ALL
                        SELECT MAX(a.created_at) as activity_date FROM appointments a WHERE a.person_id = p.id
                    ) activities
                ) as last_activity
            FROM person_company_roles pcr
            JOIN persons p ON p.id = pcr.person_id
            WHERE ${whereClause}
            ORDER BY 
                pcr.is_active DESC,
                pcr.is_primary_contact DESC,
                pcr.is_billing_contact DESC,
                p.last_name, p.first_name
        `, [companyId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching company contacts:', error);
        res.status(500).json({ error: 'Fout bij ophalen bedrijfscontacten' });
    }
});

// Add existing person as contact to company
router.post('/company/:companyId/add-person', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const { person_id, ...roleData } = req.body;

        // Use the main POST endpoint logic
        req.body.company_id = companyId;
        req.body.person_id = person_id;
        
        // Redirect to main create endpoint
        return router.handle({ ...req, method: 'POST', url: '/' }, res);

    } catch (error) {
        console.error('Error adding person to company:', error);
        res.status(500).json({ error: 'Fout bij toevoegen persoon aan bedrijf' });
    }
});

// Search persons to add to company (exclude already associated)
router.get('/company/:companyId/search-persons', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const { search = '', limit = 20 } = req.query;

        const result = await query(`
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.mobile,
                CONCAT(p.first_name, ' ', p.last_name) as full_name,
                p.is_individual_customer,
                p.is_business_customer,
                p.is_individual_lead,
                p.is_business_lead
            FROM persons p
            WHERE 
                -- Not already associated with this company
                NOT EXISTS (
                    SELECT 1 FROM person_company_roles pcr 
                    WHERE pcr.person_id = p.id AND pcr.company_id = $1 AND pcr.is_active = true
                )
                -- Search filter
                AND (
                    $2 = '' OR
                    LOWER(p.first_name) LIKE LOWER($2) OR 
                    LOWER(p.last_name) LIKE LOWER($2) OR 
                    LOWER(p.email) LIKE LOWER($2) OR
                    LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($2)
                )
            ORDER BY p.last_name, p.first_name
            LIMIT $3
        `, [companyId, `%${search}%`, limit]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error searching persons for company:', error);
        res.status(500).json({ error: 'Fout bij zoeken personen' });
    }
});

module.exports = router;