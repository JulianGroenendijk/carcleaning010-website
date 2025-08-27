const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');
const { validateInvoice } = require('../middleware/validation');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/invoices - Alle facturen met filtering en paginatie
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '', 
            customer_id = '',
            overdue = 'false',
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
                c.first_name ILIKE $${paramCount} OR 
                c.last_name ILIKE $${paramCount} OR 
                i.invoice_number ILIKE $${paramCount} OR
                i.description ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Status filter
        if (status) {
            paramCount++;
            whereClause += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        // Klant filter
        if (customer_id) {
            paramCount++;
            whereClause += ` AND i.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        // Achterstallige facturen filter
        if (overdue === 'true') {
            whereClause += ` AND i.status = 'pending' AND i.due_date < CURRENT_DATE`;
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['created_at', 'invoice_number', 'total_amount', 'due_date', 'status'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const invoicesQuery = `
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                q.quote_number,
                CASE WHEN i.status = 'pending' AND i.due_date < CURRENT_DATE THEN true ELSE false END as is_overdue,
                COUNT(*) OVER() as total_count
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN quotes q ON i.quote_id = q.id
            ${whereClause}
            ORDER BY i.${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(invoicesQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            invoices: result.rows.map(row => {
                const { total_count, ...invoice } = row;
                return invoice;
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
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Fout bij ophalen facturen' });
    }
});

// GET /api/invoices/:id - Specifieke factuur met details
router.get('/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // First get the invoice with customer data
        const result = await query(`
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city,
                q.quote_number,
                CASE WHEN i.status = 'pending' AND i.due_date < CURRENT_DATE THEN true ELSE false END as is_overdue
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN quotes q ON i.quote_id = q.id
            WHERE i.id = $1
        `, [invoiceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factuur niet gevonden' });
        }

        const invoice = result.rows[0];
        
        // Get invoice items separately
        const itemsResult = await query(`
            SELECT id, service_name, description, quantity, unit_price, total_price
            FROM invoice_items
            WHERE invoice_id = $1
            ORDER BY id
        `, [invoiceId]);
        
        invoice.items = itemsResult.rows;

        res.json(invoice);

    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Fout bij ophalen factuur' });
    }
});

// POST /api/invoices - Nieuwe factuur aanmaken
router.post('/', validateInvoice, async (req, res) => {
    try {
        const {
            customer_id,
            quote_id,
            description,
            due_date,
            discount_percentage = 0,
            tax_percentage = 21,
            notes,
            items = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Genereer factuur nummer
            const invoiceNumberResult = await client.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV([0-9]+)') AS INTEGER)), 0) + 1 as next_number
                FROM invoices 
                WHERE invoice_number ~ '^INV[0-9]+$'
            `);
            
            const nextNumber = invoiceNumberResult.rows[0].next_number;
            const invoiceNumber = `INV${nextNumber.toString().padStart(4, '0')}`;

            // Bereken totalen
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const discountAmount = subtotal * (discount_percentage / 100);
            const discountedAmount = subtotal - discountAmount;
            const taxAmount = discountedAmount * (tax_percentage / 100);
            const totalAmount = discountedAmount + taxAmount;

            // Maak factuur aan
            const invoiceResult = await client.query(`
                INSERT INTO invoices (
                    customer_id, quote_id, invoice_number, description, 
                    subtotal, discount_percentage, discount_amount,
                    tax_percentage, tax_amount, total_amount, due_date, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                customer_id, quote_id, invoiceNumber, description,
                subtotal, discount_percentage, discountAmount,
                tax_percentage, taxAmount, totalAmount, due_date, notes
            ]);

            const invoice = invoiceResult.rows[0];

            // Voeg factuur items toe
            if (items.length > 0) {
                const itemsQuery = `
                    INSERT INTO invoice_items (
                        invoice_id, service_name, description, 
                        quantity, unit_price, total_price
                    ) VALUES ${items.map((_, index) => {
                        const baseIndex = index * 6;
                        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
                    }).join(', ')}
                    RETURNING *
                `;

                const itemsParams = items.flatMap(item => [
                    invoice.id,
                    item.service_name,
                    item.description || null,
                    item.quantity,
                    item.unit_price,
                    item.quantity * item.unit_price
                ]);

                const itemsResult = await client.query(itemsQuery, itemsParams);
                invoice.items = itemsResult.rows;
            }

            return invoice;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Fout bij aanmaken factuur' });
    }
});

// PUT /api/invoices/:id - Factuur bijwerken
router.put('/:id', validateInvoice, async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const {
            customer_id,
            quote_id,
            description,
            due_date,
            discount_percentage = 0,
            tax_percentage = 21,
            status,
            notes,
            paid_date,
            items = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Check of factuur bestaat
            const existingInvoice = await client.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
            if (existingInvoice.rows.length === 0) {
                throw new Error('Factuur niet gevonden');
            }

            // Bereken totalen
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const discountAmount = subtotal * (discount_percentage / 100);
            const discountedAmount = subtotal - discountAmount;
            const taxAmount = discountedAmount * (tax_percentage / 100);
            const totalAmount = discountedAmount + taxAmount;

            // Update factuur
            const invoiceResult = await client.query(`
                UPDATE invoices SET
                    customer_id = $1, quote_id = $2, description = $3,
                    subtotal = $4, discount_percentage = $5, discount_amount = $6,
                    tax_percentage = $7, tax_amount = $8, total_amount = $9,
                    due_date = $10, status = COALESCE($11, status),
                    notes = $12, paid_date = $13,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $14
                RETURNING *
            `, [
                customer_id, quote_id, description,
                subtotal, discount_percentage, discountAmount,
                tax_percentage, taxAmount, totalAmount, due_date,
                status, notes, paid_date, invoiceId
            ]);

            const invoice = invoiceResult.rows[0];

            // Verwijder oude items en voeg nieuwe toe
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

            if (items.length > 0) {
                const itemsQuery = `
                    INSERT INTO invoice_items (
                        invoice_id, service_name, description, 
                        quantity, unit_price, total_price
                    ) VALUES ${items.map((_, index) => {
                        const baseIndex = index * 6;
                        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
                    }).join(', ')}
                    RETURNING *
                `;

                const itemsParams = items.flatMap(item => [
                    invoice.id,
                    item.service_name,
                    item.description || null,
                    item.quantity,
                    item.unit_price,
                    item.quantity * item.unit_price
                ]);

                const itemsResult = await client.query(itemsQuery, itemsParams);
                invoice.items = itemsResult.rows;
            }

            return invoice;
        });

        res.json(result);

    } catch (error) {
        console.error('Error updating invoice:', error);
        
        if (error.message === 'Factuur niet gevonden') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij bijwerken factuur' });
    }
});

// DELETE /api/invoices/:id - Factuur verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;

        const result = await transaction(async (client) => {
            // Check of factuur bestaat en niet betaald is
            const existingInvoice = await client.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
            if (existingInvoice.rows.length === 0) {
                throw new Error('Factuur niet gevonden');
            }

            if (existingInvoice.rows[0].status === 'paid') {
                throw new Error('Betaalde facturen kunnen niet worden verwijderd');
            }

            // Verwijder gerelateerde items eerst
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
            
            // Verwijder factuur
            await client.query('DELETE FROM invoices WHERE id = $1', [invoiceId]);
            
            return { success: true };
        });

        res.json({ message: 'Factuur succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting invoice:', error);
        
        if (error.message === 'Factuur niet gevonden' || 
            error.message === 'Betaalde facturen kunnen niet worden verwijderd') {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij verwijderen factuur' });
    }
});

// POST /api/invoices/:id/pdf - PDF van factuur genereren
router.post('/:id/pdf', async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // Haal volledige factuur gegevens op
        const result = await query(`
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city,
                json_agg(
                    CASE WHEN ii.id IS NOT NULL THEN
                        json_build_object(
                            'id', ii.id,
                            'service_name', ii.service_name,
                            'description', ii.description,
                            'quantity', ii.quantity,
                            'unit_price', ii.unit_price,
                            'total_price', ii.total_price
                        )
                    END ORDER BY ii.created_at
                ) FILTER (WHERE ii.id IS NOT NULL) as items
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
            WHERE i.id = $1
            GROUP BY i.id, c.id
        `, [invoiceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factuur niet gevonden' });
        }

        const invoice = result.rows[0];
        if (!invoice.items) invoice.items = [];

        // Genereer PDF
        const pdfBuffer = await generateInvoicePDF(invoice);

        // Stel headers in voor PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Factuur-${invoice.invoice_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({ error: 'Fout bij genereren PDF' });
    }
});

// POST /api/invoices/:id/mark-paid - Factuur markeren als betaald
router.post('/:id/mark-paid', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const { paid_date = new Date().toISOString(), payment_method = 'bank_transfer' } = req.body;

        const result = await query(`
            UPDATE invoices SET
                status = 'paid',
                paid_date = $1,
                payment_method = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND status != 'paid'
            RETURNING *
        `, [paid_date, payment_method, invoiceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factuur niet gevonden of al betaald' });
        }

        // Haal volledige factuur gegevens op
        const fullInvoice = await query(`
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = $1
        `, [invoiceId]);

        res.json(fullInvoice.rows[0]);

    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        res.status(500).json({ error: 'Fout bij markeren als betaald' });
    }
});

// POST /api/invoices/:id/send-reminder - Betalingsherinnering versturen
router.post('/:id/send-reminder', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const { reminder_type = 'friendly' } = req.body; // friendly, firm, final

        // Haal factuur op
        const result = await query(`
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = $1 AND i.status = 'pending'
        `, [invoiceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factuur niet gevonden of al betaald' });
        }

        const invoice = result.rows[0];

        // Update laatste herinnering datum
        await query(`
            UPDATE invoices SET
                last_reminder_sent = CURRENT_TIMESTAMP,
                reminder_count = COALESCE(reminder_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [invoiceId]);

        // TODO: Hier zou je de email verstuurfunctionaliteit kunnen implementeren
        // await sendPaymentReminder(invoice, reminder_type);

        res.json({ 
            message: 'Betalingsherinnering verzonden',
            invoice_number: invoice.invoice_number,
            customer_email: invoice.customer_email,
            reminder_type 
        });

    } catch (error) {
        console.error('Error sending payment reminder:', error);
        res.status(500).json({ error: 'Fout bij versturen herinnering' });
    }
});

// GET /api/invoices/stats - Factuur statistieken
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_invoices,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_invoices,
                COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END) as actually_overdue,
                COALESCE(SUM(total_amount), 0) as total_value,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_value,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) as outstanding_value,
                COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END), 0) as overdue_value,
                COALESCE(AVG(total_amount), 0) as average_invoice_value,
                COALESCE(AVG(CASE WHEN status = 'paid' AND paid_date IS NOT NULL THEN 
                    EXTRACT(DAY FROM (paid_date - created_at)) END), 0) as average_payment_days
            FROM invoices
        `);

        // Bereken maandelijkse omzet (afgelopen 12 maanden)
        const monthlyRevenue = await query(`
            SELECT 
                DATE_TRUNC('month', paid_date) as month,
                SUM(total_amount) as revenue,
                COUNT(*) as invoices_count
            FROM invoices 
            WHERE status = 'paid' 
            AND paid_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', paid_date)
            ORDER BY month DESC
        `);

        res.json({
            ...stats.rows[0],
            monthly_revenue: monthlyRevenue.rows
        });

    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// GET /api/invoices/overdue - Achterstallige facturen
router.get('/overdue', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                i.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                EXTRACT(DAY FROM (CURRENT_DATE - i.due_date)) as days_overdue
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.status = 'pending' 
            AND i.due_date < CURRENT_DATE
            ORDER BY i.due_date ASC
        `);

        res.json({
            overdue_invoices: result.rows,
            total_count: result.rows.length,
            total_overdue_amount: result.rows.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0)
        });

    } catch (error) {
        console.error('Error fetching overdue invoices:', error);
        res.status(500).json({ error: 'Fout bij ophalen achterstallige facturen' });
    }
});

module.exports = router;