const express = require('express');
const { query: dbQuery } = require('../database/connection');
const { validateSupplier } = require('../middleware/validation');
const router = express.Router();

// Get all suppliers with filtering
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search, active_only } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT s.*, 
                COUNT(e.id) as expense_count,
                COALESCE(SUM(e.amount), 0) as total_spent
            FROM suppliers s
            LEFT JOIN expenses e ON s.id = e.supplier_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramCount = 1;
        
        if (search) {
            query += ` AND (s.name ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.phone ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
            paramCount++;
        }
        
        if (active_only === 'true') {
            query += ` AND s.active = true`;
        }
        
        query += ` GROUP BY s.id`;
        query += ` ORDER BY s.name ASC`;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        queryParams.push(parseInt(limit), offset);
        
        
        const result = await dbQuery(query, queryParams);
        
        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM suppliers WHERE 1=1`;
        const countParams = [];
        let countParamCount = 1;
        
        if (search) {
            countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR phone ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
            countParamCount++;
        }
        
        if (active_only === 'true') {
            countQuery += ` AND active = true`;
        }
        
        const countResult = await dbQuery(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            suppliers: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Fout bij ophalen leveranciers' });
    }
});

// Get supplier by ID with expenses
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get supplier details
        const supplierQuery = `SELECT * FROM suppliers WHERE id = $1`;
        
        const supplierResult = await dbQuery(supplierQuery, [id]);
        
        if (supplierResult.rows.length === 0) {
            return res.status(404).json({ error: 'Leverancier niet gevonden' });
        }
        
        // Get recent expenses for this supplier
        const expensesQuery = `
            SELECT * FROM expenses 
            WHERE supplier_id = $1 
            ORDER BY expense_date DESC 
            LIMIT 10
        `;
        const expensesResult = await dbQuery(expensesQuery, [id]);
        
        // Get expense statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_expenses,
                COALESCE(SUM(amount), 0) as total_amount,
                AVG(amount) as average_amount,
                MAX(expense_date) as last_expense_date
            FROM expenses 
            WHERE supplier_id = $1
        `;
        const statsResult = await dbQuery(statsQuery, [id]);
        
        res.json({
            supplier: supplierResult.rows[0],
            recent_expenses: expensesResult.rows,
            statistics: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Fout bij ophalen leverancier' });
    }
});

// Create new supplier
router.post('/', validateSupplier, async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            city,
            postal_code,
            country = 'Nederland',
            vat_number,
            contact_person,
            payment_terms,
            notes,
            active = true
        } = req.body;
        
        // Check if supplier with this email already exists
        const checkQuery = 'SELECT id FROM suppliers WHERE email = $1';
        
        const existing = await dbQuery(checkQuery, [email]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Leverancier met dit email adres bestaat al' });
        }
        
        const query = `
            INSERT INTO suppliers (
                name, email, phone, address, city, postal_code, country,
                vat_number, contact_person, payment_terms, notes, active,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            RETURNING *
        `;
        
        const values = [
            name,
            email,
            phone || null,
            address || null,
            city || null,
            postal_code || null,
            country,
            vat_number || null,
            contact_person || null,
            payment_terms || 30,
            notes || null,
            active
        ];
        
        const result = await dbQuery(query, values);
        
        res.status(201).json({
            message: 'Leverancier succesvol aangemaakt',
            supplier: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Fout bij aanmaken leverancier' });
    }
});

// Update supplier
router.put('/:id', validateSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            phone,
            address,
            city,
            postal_code,
            country,
            vat_number,
            contact_person,
            payment_terms,
            notes,
            active
        } = req.body;
        
        // Check if another supplier with this email exists
        const checkQuery = 'SELECT id FROM suppliers WHERE email = $1 AND id != $2';
        
        const existing = await dbQuery(checkQuery, [email, id]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Leverancier met dit email adres bestaat al' });
        }
        
        const query = `
            UPDATE suppliers SET
                name = $1,
                email = $2,
                phone = $3,
                address = $4,
                city = $5,
                postal_code = $6,
                country = $7,
                vat_number = $8,
                contact_person = $9,
                payment_terms = $10,
                notes = $11,
                active = $12,
                updated_at = NOW()
            WHERE id = $13
            RETURNING *
        `;
        
        const values = [
            name,
            email,
            phone || null,
            address || null,
            city || null,
            postal_code || null,
            country || 'Nederland',
            vat_number || null,
            contact_person || null,
            payment_terms || 30,
            notes || null,
            active !== undefined ? active : true,
            id
        ];
        
        const result = await dbQuery(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leverancier niet gevonden' });
        }
        
        res.json({
            message: 'Leverancier succesvol bijgewerkt',
            supplier: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Fout bij bijwerken leverancier' });
    }
});

// Toggle supplier active status
router.patch('/:id/toggle-active', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE suppliers 
            SET active = NOT active, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        
        const result = await dbQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leverancier niet gevonden' });
        }
        
        const supplier = result.rows[0];
        const status = supplier.active ? 'geactiveerd' : 'gedeactiveerd';
        
        res.json({
            message: `Leverancier succesvol ${status}`,
            supplier: supplier
        });
    } catch (error) {
        console.error('Error toggling supplier status:', error);
        res.status(500).json({ error: 'Fout bij wijzigen leverancier status' });
    }
});

// Delete supplier (only if no expenses exist)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        
        
        // Check if supplier has expenses
        const expenseCheck = await dbQuery('SELECT COUNT(*) as count FROM expenses WHERE supplier_id = $1', [id]);
        const expenseCount = parseInt(expenseCheck.rows[0].count);
        
        if (expenseCount > 0) {
            return res.status(400).json({ 
                error: `Kan leverancier niet verwijderen. Er zijn ${expenseCount} uitgaven gekoppeld aan deze leverancier. Deactiveer de leverancier in plaats van verwijderen.`
            });
        }
        
        const query = 'DELETE FROM suppliers WHERE id = $1 RETURNING *';
        const result = await dbQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leverancier niet gevonden' });
        }
        
        res.json({ message: 'Leverancier succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Fout bij verwijderen leverancier' });
    }
});

// Get suppliers for dropdown (active only, name + id)
router.get('/meta/dropdown', async (req, res) => {
    try {
        const query = `
            SELECT id, name 
            FROM suppliers 
            WHERE active = true 
            ORDER BY name ASC
        `;
        
        
        const result = await dbQuery(query);
        
        res.json({ suppliers: result.rows });
    } catch (error) {
        console.error('Error fetching suppliers dropdown:', error);
        res.status(500).json({ error: 'Fout bij ophalen leveranciers' });
    }
});

module.exports = router;