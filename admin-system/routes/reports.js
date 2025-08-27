const express = require('express');
const { query: dbQuery } = require('../database/connection');
const router = express.Router();

// Financial overview report
router.get('/financial-overview', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month } = req.query;
        
        let dateFilter = '';
        const params = [];
        let paramCount = 1;
        
        if (month) {
            dateFilter = `AND EXTRACT(YEAR FROM date_column) = $${paramCount} AND EXTRACT(MONTH FROM date_column) = $${paramCount + 1}`;
            params.push(year, month);
            paramCount += 2;
        } else {
            dateFilter = `AND EXTRACT(YEAR FROM date_column) = $${paramCount}`;
            params.push(year);
            paramCount++;
        }
        
        
        
        // Revenue from invoices
        const revenueQuery = `
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(vat_amount), 0) as total_vat_collected,
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices
            FROM invoices 
            WHERE 1=1 ${dateFilter.replace('date_column', 'invoice_date')}
        `;
        
        // Expenses
        const expensesQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_expenses,
                COALESCE(SUM(vat_amount), 0) as total_vat_paid,
                COUNT(*) as total_expense_records,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses
            FROM expenses 
            WHERE 1=1 ${dateFilter.replace('date_column', 'expense_date')}
        `;
        
        // Monthly breakdown for charts
        const monthlyQuery = `
            SELECT 
                EXTRACT(MONTH FROM invoice_date) as month,
                EXTRACT(YEAR FROM invoice_date) as year,
                COALESCE(SUM(total_amount), 0) as revenue,
                COUNT(*) as invoice_count
            FROM invoices 
            WHERE EXTRACT(YEAR FROM invoice_date) = $1
            GROUP BY EXTRACT(YEAR FROM invoice_date), EXTRACT(MONTH FROM invoice_date)
            ORDER BY year, month
        `;
        
        const expenseMonthlyQuery = `
            SELECT 
                EXTRACT(MONTH FROM expense_date) as month,
                EXTRACT(YEAR FROM expense_date) as year,
                COALESCE(SUM(amount), 0) as expenses,
                COUNT(*) as expense_count
            FROM expenses 
            WHERE EXTRACT(YEAR FROM expense_date) = $1
            GROUP BY EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date)
            ORDER BY year, month
        `;
        
        const [revenueResult, expensesResult, monthlyResult, expenseMonthlyResult] = await Promise.all([
            dbQuery(revenueQuery, params),
            dbQuery(expensesQuery, params),
            dbQuery(monthlyQuery, [year]),
            dbQuery(expenseMonthlyQuery, [year])
        ]);
        
        const revenue = revenueResult.rows[0];
        const expenses = expensesResult.rows[0];
        
        const profit = parseFloat(revenue.total_revenue) - parseFloat(expenses.total_expenses);
        const profitMargin = revenue.total_revenue > 0 ? (profit / parseFloat(revenue.total_revenue)) * 100 : 0;
        
        res.json({
            period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
            summary: {
                total_revenue: parseFloat(revenue.total_revenue),
                total_expenses: parseFloat(expenses.total_expenses),
                profit: profit,
                profit_margin: profitMargin,
                vat_collected: parseFloat(revenue.total_vat_collected),
                vat_paid: parseFloat(expenses.total_vat_paid),
                vat_balance: parseFloat(revenue.total_vat_collected) - parseFloat(expenses.total_vat_paid)
            },
            invoices: {
                total: parseInt(revenue.total_invoices),
                paid: parseInt(revenue.paid_invoices),
                pending: parseInt(revenue.pending_invoices),
                overdue: parseInt(revenue.overdue_invoices)
            },
            expenses: {
                total_records: parseInt(expenses.total_expense_records),
                approved: parseInt(expenses.approved_expenses),
                pending: parseInt(expenses.pending_expenses)
            },
            monthly_data: {
                revenue: monthlyResult.rows,
                expenses: expenseMonthlyResult.rows
            }
        });
    } catch (error) {
        console.error('Error generating financial overview:', error);
        res.status(500).json({ error: 'Fout bij genereren financieel overzicht' });
    }
});

// Expenses by category report
router.get('/expenses-by-category', async (req, res) => {
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
                category,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COALESCE(SUM(vat_amount), 0) as total_vat
            FROM expenses 
            ${dateFilter}
            GROUP BY category
            ORDER BY total_amount DESC
        `;
        
        
        const result = await dbQuery(query, params);
        
        res.json({
            period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
            categories: result.rows
        });
    } catch (error) {
        console.error('Error generating expenses by category report:', error);
        res.status(500).json({ error: 'Fout bij genereren uitgaven per categorie rapport' });
    }
});

// Customer revenue report
router.get('/customer-revenue', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), limit = 20 } = req.query;
        
        const query = `
            SELECT 
                c.id,
                c.name,
                c.email,
                COUNT(i.id) as invoice_count,
                COALESCE(SUM(i.total_amount), 0) as total_revenue,
                COALESCE(AVG(i.total_amount), 0) as average_invoice,
                MAX(i.invoice_date) as last_invoice_date,
                COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_invoices
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id 
                AND EXTRACT(YEAR FROM i.invoice_date) = $1
            GROUP BY c.id, c.name, c.email
            HAVING COUNT(i.id) > 0
            ORDER BY total_revenue DESC
            LIMIT $2
        `;
        
        
        const result = await dbQuery(query, [year, limit]);
        
        res.json({
            year: parseInt(year),
            customers: result.rows
        });
    } catch (error) {
        console.error('Error generating customer revenue report:', error);
        res.status(500).json({ error: 'Fout bij genereren klant omzet rapport' });
    }
});

// Service performance report
router.get('/service-performance', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        const query = `
            SELECT 
                s.id,
                s.name,
                s.price,
                COUNT(ii.id) as times_sold,
                COALESCE(SUM(ii.quantity * ii.unit_price), 0) as total_revenue,
                COALESCE(AVG(ii.quantity * ii.unit_price), 0) as average_revenue_per_sale
            FROM services s
            LEFT JOIN invoice_items ii ON s.id = ii.service_id
            LEFT JOIN invoices i ON ii.invoice_id = i.id
                AND EXTRACT(YEAR FROM i.invoice_date) = $1
            GROUP BY s.id, s.name, s.price
            ORDER BY total_revenue DESC
        `;
        
        
        const result = await dbQuery(query, [year]);
        
        res.json({
            year: parseInt(year),
            services: result.rows
        });
    } catch (error) {
        console.error('Error generating service performance report:', error);
        res.status(500).json({ error: 'Fout bij genereren diensten prestatie rapport' });
    }
});

// VAT report
router.get('/vat-report', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), quarter } = req.query;
        
        let dateFilter = '';
        const params = [year];
        
        if (quarter) {
            const startMonth = (quarter - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            dateFilter = `AND EXTRACT(MONTH FROM date_column) BETWEEN ${startMonth} AND ${endMonth}`;
        }
        
        
        
        // VAT collected from invoices
        const vatCollectedQuery = `
            SELECT 
                EXTRACT(QUARTER FROM invoice_date) as quarter,
                COALESCE(SUM(vat_amount), 0) as vat_collected,
                COALESCE(SUM(total_amount - vat_amount), 0) as net_revenue
            FROM invoices 
            WHERE EXTRACT(YEAR FROM invoice_date) = $1 
                AND status IN ('paid', 'partial')
                ${dateFilter.replace('date_column', 'invoice_date')}
            GROUP BY EXTRACT(QUARTER FROM invoice_date)
            ORDER BY quarter
        `;
        
        // VAT paid on expenses
        const vatPaidQuery = `
            SELECT 
                EXTRACT(QUARTER FROM expense_date) as quarter,
                COALESCE(SUM(vat_amount), 0) as vat_paid,
                COALESCE(SUM(amount - COALESCE(vat_amount, 0)), 0) as net_expenses
            FROM expenses 
            WHERE EXTRACT(YEAR FROM expense_date) = $1 
                AND status = 'approved'
                ${dateFilter.replace('date_column', 'expense_date')}
            GROUP BY EXTRACT(QUARTER FROM expense_date)
            ORDER BY quarter
        `;
        
        const [vatCollectedResult, vatPaidResult] = await Promise.all([
            dbQuery(vatCollectedQuery, params),
            dbQuery(vatPaidQuery, params)
        ]);
        
        // Combine quarterly data
        const quarterlyData = [];
        for (let q = 1; q <= 4; q++) {
            if (quarter && q != quarter) continue;
            
            const collected = vatCollectedResult.rows.find(row => row.quarter == q) || 
                { quarter: q, vat_collected: 0, net_revenue: 0 };
            const paid = vatPaidResult.rows.find(row => row.quarter == q) || 
                { quarter: q, vat_paid: 0, net_expenses: 0 };
            
            quarterlyData.push({
                quarter: q,
                vat_collected: parseFloat(collected.vat_collected),
                vat_paid: parseFloat(paid.vat_paid),
                vat_balance: parseFloat(collected.vat_collected) - parseFloat(paid.vat_paid),
                net_revenue: parseFloat(collected.net_revenue),
                net_expenses: parseFloat(paid.net_expenses)
            });
        }
        
        const totalVatCollected = quarterlyData.reduce((sum, q) => sum + q.vat_collected, 0);
        const totalVatPaid = quarterlyData.reduce((sum, q) => sum + q.vat_paid, 0);
        
        res.json({
            year: parseInt(year),
            quarter: quarter ? parseInt(quarter) : null,
            summary: {
                total_vat_collected: totalVatCollected,
                total_vat_paid: totalVatPaid,
                vat_balance: totalVatCollected - totalVatPaid
            },
            quarterly_data: quarterlyData
        });
    } catch (error) {
        console.error('Error generating VAT report:', error);
        res.status(500).json({ error: 'Fout bij genereren BTW rapport' });
    }
});

// Export data for external accounting software
router.get('/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { year = new Date().getFullYear(), month, format = 'json' } = req.query;
        
        let dateFilter = '';
        const params = [];
        let paramCount = 1;
        
        if (month) {
            dateFilter = `WHERE EXTRACT(YEAR FROM date_column) = $${paramCount} AND EXTRACT(MONTH FROM date_column) = $${paramCount + 1}`;
            params.push(year, month);
        } else {
            dateFilter = `WHERE EXTRACT(YEAR FROM date_column) = $${paramCount}`;
            params.push(year);
        }
        
        
        let data = [];
        let filename = '';
        
        if (type === 'invoices') {
            const query = `
                SELECT 
                    i.invoice_number,
                    i.invoice_date,
                    c.name as customer_name,
                    c.vat_number as customer_vat,
                    i.subtotal_amount,
                    i.vat_amount,
                    i.total_amount,
                    i.status,
                    i.due_date
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                ${dateFilter.replace('date_column', 'i.invoice_date')}
                ORDER BY i.invoice_date DESC
            `;
            
            const result = await dbQuery(query, params);
            data = result.rows;
            filename = `invoices_${year}${month ? `_${month.padStart(2, '0')}` : ''}`;
            
        } else if (type === 'expenses') {
            const query = `
                SELECT 
                    e.expense_date,
                    e.description,
                    e.category,
                    s.name as supplier_name,
                    s.vat_number as supplier_vat,
                    e.amount,
                    e.vat_amount,
                    e.receipt_number,
                    e.status
                FROM expenses e
                LEFT JOIN suppliers s ON e.supplier_id = s.id
                ${dateFilter.replace('date_column', 'e.expense_date')}
                ORDER BY e.expense_date DESC
            `;
            
            const result = await dbQuery(query, params);
            data = result.rows;
            filename = `expenses_${year}${month ? `_${month.padStart(2, '0')}` : ''}`;
            
        } else {
            return res.status(400).json({ error: 'Ongeldig export type. Gebruik "invoices" of "expenses"' });
        }
        
        if (format === 'csv') {
            // Convert to CSV
            if (data.length === 0) {
                return res.status(404).json({ error: 'Geen data gevonden voor export' });
            }
            
            const headers = Object.keys(data[0]).join(',');
            const csvData = data.map(row => 
                Object.values(row).map(value => 
                    typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                ).join(',')
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(`${headers}\n${csvData}`);
        } else {
            // Return JSON
            res.json({
                type,
                period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
                total_records: data.length,
                data
            });
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Fout bij exporteren data' });
    }
});

module.exports = router;