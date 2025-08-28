const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/companies - Alle bedrijven
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            sort_by = 'company_name',
            sort_order = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE c.is_active = true';
        const params = [];
        let paramCount = 0;

        // Zoekfunctionaliteit
        if (search) {
            paramCount++;
            whereClause += ` AND (
                company_name ILIKE $${paramCount} OR 
                vat_number ILIKE $${paramCount} OR 
                email ILIKE $${paramCount} OR
                phone ILIKE $${paramCount} OR
                city ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['company_name', 'vat_number', 'city', 'created_at'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'company_name';
        const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const companiesQuery = `
            SELECT 
                c.*,
                COUNT(cp.id) as contact_count,
                COUNT(v.id) as vehicle_count,
                COUNT(*) OVER() as total_count
            FROM companies c
            LEFT JOIN contact_persons cp ON c.id = cp.company_id AND cp.is_active = true
            LEFT JOIN vehicles v ON c.id = v.company_id AND v.is_active = true
            ${whereClause}
            GROUP BY c.id
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(companiesQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            companies: result.rows.map(row => {
                const { total_count, ...company } = row;
                return company;
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
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Fout bij ophalen bedrijven' });
    }
});

// GET /api/companies/:id - Specifiek bedrijf met contactpersonen
router.get('/:id', async (req, res) => {
    try {
        const companyId = req.params.id;

        // Haal bedrijf op
        const companyResult = await query('SELECT * FROM companies WHERE id = $1', [companyId]);

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijf niet gevonden' });
        }

        // Haal contactpersonen op
        const contactsResult = await query(`
            SELECT * FROM contact_persons 
            WHERE company_id = $1 AND is_active = true 
            ORDER BY is_primary_contact DESC, first_name ASC
        `, [companyId]);

        // Haal voertuigen op
        const vehiclesResult = await query(`
            SELECT * FROM vehicles 
            WHERE company_id = $1 AND is_active = true 
            ORDER BY make ASC, model ASC
        `, [companyId]);

        const company = companyResult.rows[0];
        company.contacts = contactsResult.rows;
        company.vehicles = vehiclesResult.rows;

        res.json(company);

    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Fout bij ophalen bedrijf' });
    }
});

// POST /api/companies - Nieuw bedrijf aanmaken
router.post('/', async (req, res) => {
    try {
        const {
            company_name,
            vat_number,
            registration_number,
            industry,
            website,
            email,
            phone,
            address,
            postal_code,
            city,
            country = 'Nederland',
            billing_address,
            billing_postal_code,
            billing_city,
            notes
        } = req.body;

        if (!company_name || !company_name.trim()) {
            return res.status(400).json({ error: 'Bedrijfsnaam is verplicht' });
        }

        const result = await query(`
            INSERT INTO companies (
                company_name, vat_number, registration_number, industry, website,
                email, phone, address, postal_code, city, country,
                billing_address, billing_postal_code, billing_city, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            company_name.trim(),
            vat_number || null,
            registration_number || null,
            industry || null,
            website || null,
            email || null,
            phone || null,
            address || null,
            postal_code || null,
            city || null,
            country,
            billing_address || null,
            billing_postal_code || null,
            billing_city || null,
            notes || null
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating company:', error);
        
        if (error.constraint === 'companies_vat_number_key') {
            return res.status(400).json({ error: 'BTW nummer bestaat al' });
        }
        
        res.status(500).json({ error: 'Fout bij aanmaken bedrijf' });
    }
});

// PUT /api/companies/:id - Bedrijf bijwerken
router.put('/:id', async (req, res) => {
    try {
        const companyId = req.params.id;
        const {
            company_name,
            vat_number,
            registration_number,
            industry,
            website,
            email,
            phone,
            address,
            postal_code,
            city,
            country,
            billing_address,
            billing_postal_code,
            billing_city,
            notes,
            is_active = true
        } = req.body;

        if (!company_name || !company_name.trim()) {
            return res.status(400).json({ error: 'Bedrijfsnaam is verplicht' });
        }

        const result = await query(`
            UPDATE companies SET 
                company_name = $1, vat_number = $2, registration_number = $3, 
                industry = $4, website = $5, email = $6, phone = $7, address = $8, 
                postal_code = $9, city = $10, country = $11, billing_address = $12,
                billing_postal_code = $13, billing_city = $14, notes = $15,
                is_active = $16, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $17 
            RETURNING *
        `, [
            company_name.trim(), vat_number, registration_number, industry, website,
            email, phone, address, postal_code, city, country, billing_address,
            billing_postal_code, billing_city, notes, is_active, companyId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijf niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating company:', error);
        
        if (error.constraint === 'companies_vat_number_key') {
            return res.status(400).json({ error: 'BTW nummer bestaat al' });
        }
        
        res.status(500).json({ error: 'Fout bij bijwerken bedrijf' });
    }
});

// DELETE /api/companies/:id - Bedrijf deactiveren
router.delete('/:id', async (req, res) => {
    try {
        const companyId = req.params.id;

        const result = await query(`
            UPDATE companies SET 
                is_active = false,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING id
        `, [companyId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijf niet gevonden' });
        }

        res.json({ message: 'Bedrijf succesvol gedeactiveerd' });

    } catch (error) {
        console.error('Error deactivating company:', error);
        res.status(500).json({ error: 'Fout bij deactiveren bedrijf' });
    }
});

// POST /api/companies/:id/contacts - Contactpersoon toevoegen
router.post('/:id/contacts', async (req, res) => {
    try {
        const companyId = req.params.id;
        const {
            first_name,
            last_name,
            job_title,
            department,
            email,
            phone,
            mobile,
            is_primary_contact = false,
            is_billing_contact = false,
            is_technical_contact = false,
            notes
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'Voor- en achternaam zijn verplicht' });
        }

        // Check of bedrijf bestaat
        const companyCheck = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
        if (companyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Bedrijf niet gevonden' });
        }

        const result = await query(`
            INSERT INTO contact_persons (
                company_id, first_name, last_name, job_title, department,
                email, phone, mobile, is_primary_contact, is_billing_contact,
                is_technical_contact, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            companyId, first_name.trim(), last_name.trim(),
            job_title, department, email, phone, mobile,
            is_primary_contact, is_billing_contact, is_technical_contact,
            notes
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating contact person:', error);
        res.status(500).json({ error: 'Fout bij aanmaken contactpersoon' });
    }
});

// PUT /api/companies/:companyId/contacts/:contactId - Contactpersoon bijwerken
router.put('/:companyId/contacts/:contactId', async (req, res) => {
    try {
        const { companyId, contactId } = req.params;
        const {
            first_name,
            last_name,
            job_title,
            department,
            email,
            phone,
            mobile,
            is_primary_contact = false,
            is_billing_contact = false,
            is_technical_contact = false,
            notes,
            is_active = true
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'Voor- en achternaam zijn verplicht' });
        }

        const result = await query(`
            UPDATE contact_persons SET 
                first_name = $1, last_name = $2, job_title = $3, department = $4,
                email = $5, phone = $6, mobile = $7, is_primary_contact = $8,
                is_billing_contact = $9, is_technical_contact = $10, notes = $11,
                is_active = $12, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $13 AND company_id = $14
            RETURNING *
        `, [
            first_name.trim(), last_name.trim(), job_title, department,
            email, phone, mobile, is_primary_contact, is_billing_contact,
            is_technical_contact, notes, is_active, contactId, companyId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contactpersoon niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating contact person:', error);
        res.status(500).json({ error: 'Fout bij bijwerken contactpersoon' });
    }
});

// DELETE /api/companies/:companyId/contacts/:contactId - Contactpersoon deactiveren
router.delete('/:companyId/contacts/:contactId', async (req, res) => {
    try {
        const { companyId, contactId } = req.params;

        const result = await query(`
            UPDATE contact_persons SET 
                is_active = false,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND company_id = $2
            RETURNING id
        `, [contactId, companyId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contactpersoon niet gevonden' });
        }

        res.json({ message: 'Contactpersoon succesvol gedeactiveerd' });

    } catch (error) {
        console.error('Error deactivating contact person:', error);
        res.status(500).json({ error: 'Fout bij deactiveren contactpersoon' });
    }
});

module.exports = router;