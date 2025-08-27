const express = require('express');
const { query: dbQuery } = require('../database/connection');
const { validateExpense } = require('../middleware/validation');
const router = express.Router();

// Get all expenses with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, category, status, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        
        let queryText = `
            SELECT e.*, s.name as supplier_name, s.email as supplier_email
            FROM expenses e
            LEFT JOIN suppliers s ON e.supplier_id = s.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramCount = 1;
        
        if (category) {
            queryText += ` AND e.category = $${paramCount}`;
            queryParams.push(category);
            paramCount++;
        }
        
        if (status) {
            queryText += ` AND e.status = $${paramCount}`;
            queryParams.push(status);
            paramCount++;
        }
        
        if (date_from) {
            queryText += ` AND e.expense_date >= $${paramCount}`;
            queryParams.push(date_from);
            paramCount++;
        }
        
        if (date_to) {
            queryText += ` AND e.expense_date <= $${paramCount}`;
            queryParams.push(date_to);
            paramCount++;
        }
        
        queryText += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
        queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        queryParams.push(parseInt(limit), offset);
        
        const result = await dbQuery(queryText, queryParams);
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM expenses e
            WHERE 1=1
        `;
        
        const countParams = [];
        let countParamCount = 1;
        
        if (category) {
            countQuery += ` AND e.category = $${countParamCount}`;
            countParams.push(category);
            countParamCount++;
        }
        
        if (status) {
            countQuery += ` AND e.status = $${countParamCount}`;
            countParams.push(status);
            countParamCount++;
        }
        
        if (date_from) {
            countQuery += ` AND e.expense_date >= $${countParamCount}`;
            countParams.push(date_from);
            countParamCount++;
        }
        
        if (date_to) {
            countQuery += ` AND e.expense_date <= $${countParamCount}`;
            countParams.push(date_to);
            countParamCount++;
        }
        
        const countResult = await dbQuery(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            expenses: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Fout bij ophalen uitgaven' });
    }
});

// Get expense by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT e.*, s.name as supplier_name, s.email as supplier_email
            FROM expenses e
            LEFT JOIN suppliers s ON e.supplier_id = s.id
            WHERE e.id = $1
        `;
        
        
        const result = await dbQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Uitgave niet gevonden' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Fout bij ophalen uitgave' });
    }
});

// Create new expense
router.post('/', validateExpense, async (req, res) => {
    try {
        const {
            description,
            amount,
            category,
            supplier_id,
            expense_date,
            receipt_number,
            vat_amount,
            status = 'pending',
            notes
        } = req.body;
        
        const query = `
            INSERT INTO expenses (
                description, amount, category, supplier_id, expense_date,
                receipt_number, vat_amount, status, notes, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *
        `;
        
        const values = [
            description,
            parseFloat(amount),
            category,
            supplier_id || null,
            expense_date,
            receipt_number || null,
            vat_amount ? parseFloat(vat_amount) : null,
            status,
            notes || null
        ];
        
        
        const result = await dbQuery(query, values);
        
        res.status(201).json({
            message: 'Uitgave succesvol aangemaakt',
            expense: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Fout bij aanmaken uitgave' });
    }
});

// Update expense
router.put('/:id', validateExpense, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            description,
            amount,
            category,
            supplier_id,
            expense_date,
            receipt_number,
            vat_amount,
            status,
            notes
        } = req.body;
        
        const query = `
            UPDATE expenses SET
                description = $1,
                amount = $2,
                category = $3,
                supplier_id = $4,
                expense_date = $5,
                receipt_number = $6,
                vat_amount = $7,
                status = $8,
                notes = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `;
        
        const values = [
            description,
            parseFloat(amount),
            category,
            supplier_id || null,
            expense_date,
            receipt_number || null,
            vat_amount ? parseFloat(vat_amount) : null,
            status,
            notes || null,
            id
        ];
        
        
        const result = await dbQuery(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Uitgave niet gevonden' });
        }
        
        res.json({
            message: 'Uitgave succesvol bijgewerkt',
            expense: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Fout bij bijwerken uitgave' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = 'DELETE FROM expenses WHERE id = $1 RETURNING *';
        
        
        const result = await dbQuery(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Uitgave niet gevonden' });
        }
        
        res.json({ message: 'Uitgave succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Fout bij verwijderen uitgave' });
    }
});

// Get expense categories (for dropdown)
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = [
            'Materialen',
            'Brandstof',
            'Onderhoud',
            'Marketing',
            'Administratie',
            'Verzekering',
            'Software/Abonnementen',
            'Overig'
        ];
        
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Fout bij ophalen categorieën' });
    }
});

// Get expense summary statistics
router.get('/meta/summary', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month } = req.query;
        
        let dateFilter = '';
        const params = [];
        let paramCount = 1;
        
        if (month) {
            dateFilter = `WHERE EXTRACT(YEAR FROM expense_date) = $${paramCount} AND EXTRACT(MONTH FROM expense_date) = $${paramCount + 1}`;
            params.push(year, month);
        } else {
            dateFilter = `WHERE EXTRACT(YEAR FROM expense_date) = $${paramCount}`;
            params.push(year);
        }
        
        const query = `
            SELECT 
                COUNT(*) as total_expenses,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(vat_amount), 0) as total_vat,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                category,
                COALESCE(SUM(amount), 0) as category_total
            FROM expenses 
            ${dateFilter}
            GROUP BY ROLLUP(category)
            ORDER BY category_total DESC
        `;
        
        
        const result = await dbQuery(query, params);
        
        res.json({
            summary: result.rows[0] || { 
                total_expenses: 0, 
                total_amount: 0, 
                total_vat: 0, 
                pending_count: 0, 
                approved_count: 0 
            },
            by_category: result.rows.slice(1)
        });
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ error: 'Fout bij ophalen samenvatting' });
    }
});

module.exports = router;