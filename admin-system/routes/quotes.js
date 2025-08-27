const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');
const { validateQuote } = require('../middleware/validation');
const { generateQuotePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/quotes - Alle offertes met filtering en paginatie
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '', 
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
                c.first_name ILIKE $${paramCount} OR 
                c.last_name ILIKE $${paramCount} OR 
                q.quote_number ILIKE $${paramCount} OR
                q.description ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Status filter
        if (status) {
            paramCount++;
            whereClause += ` AND q.status = $${paramCount}`;
            params.push(status);
        }

        // Klant filter
        if (customer_id) {
            paramCount++;
            whereClause += ` AND q.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['created_at', 'quote_number', 'total_amount', 'status', 'valid_until'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const quotesQuery = `
            SELECT 
                q.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                COUNT(*) OVER() as total_count
            FROM quotes q
            JOIN customers c ON q.customer_id = c.id
            ${whereClause}
            ORDER BY q.${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(quotesQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            quotes: result.rows.map(row => {
                const { total_count, ...quote } = row;
                return quote;
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
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Fout bij ophalen offertes' });
    }
});

// GET /api/quotes/:id - Specifieke offerte met details
router.get('/:id', async (req, res) => {
    try {
        const quoteId = req.params.id;

        const result = await query(`
            SELECT 
                q.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city,
                json_agg(
                    json_build_object(
                        'id', qi.id,
                        'service_name', COALESCE(s.name, 'Aangepaste service'),
                        'description', qi.description,
                        'quantity', qi.quantity,
                        'unit_price', qi.unit_price,
                        'total_price', qi.total_price
                    ) ORDER BY qi.id
                ) as items
            FROM quotes q
            JOIN customers c ON q.customer_id = c.id
            LEFT JOIN quote_items qi ON q.id = qi.quote_id
            LEFT JOIN services s ON s.id = qi.service_id
            WHERE q.id = $1
            GROUP BY q.id, c.id
        `, [quoteId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Offerte niet gevonden' });
        }

        const quote = result.rows[0];
        
        // Filter out null items from LEFT JOIN
        if (quote.items && Array.isArray(quote.items)) {
            quote.items = quote.items.filter(item => item.id !== null);
        } else {
            quote.items = [];
        }

        res.json(quote);

    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ error: 'Fout bij ophalen offerte' });
    }
});

// POST /api/quotes - Nieuwe offerte aanmaken
router.post('/', validateQuote, async (req, res) => {
    try {
        const {
            customer_id,
            notes,
            valid_until,
            discount_percentage = 0,
            tax_percentage = 21,
            services = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Genereer offerte nummer
            const quoteNumberResult = await client.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'Q([0-9]+)') AS INTEGER)), 0) + 1 as next_number
                FROM quotes 
                WHERE quote_number ~ '^Q[0-9]+$'
            `);
            
            const nextNumber = quoteNumberResult.rows[0].next_number;
            const quoteNumber = `Q${nextNumber.toString().padStart(4, '0')}`;

            // Bereken totalen
            const subtotal = services.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const discountAmount = subtotal * (discount_percentage / 100);
            const discountedAmount = subtotal - discountAmount;
            const taxAmount = discountedAmount * (tax_percentage / 100);
            const totalAmount = discountedAmount + taxAmount;

            // Maak offerte aan
            const quoteResult = await client.query(`
                INSERT INTO quotes (
                    customer_id, quote_number, notes, 
                    subtotal, tax_amount, total_amount, valid_until
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                customer_id, quoteNumber, notes,
                subtotal, taxAmount, totalAmount, valid_until
            ]);

            const quote = quoteResult.rows[0];

            // Voeg quote items toe
            if (services.length > 0) {
                const itemsQuery = `
                    INSERT INTO quote_items (
                        quote_id, service_id, description, 
                        quantity, unit_price, total_price
                    ) VALUES ${services.map((_, index) => {
                        const baseIndex = index * 6;
                        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
                    }).join(', ')}
                    RETURNING *
                `;

                const itemsParams = services.flatMap(item => [
                    quote.id,
                    item.service_id,
                    item.description || null,
                    item.quantity || 1,
                    item.unit_price,
                    item.total_price
                ]);

                const itemsResult = await client.query(itemsQuery, itemsParams);
                quote.items = itemsResult.rows;
            }

            return quote;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating quote:', error);
        res.status(500).json({ error: 'Fout bij aanmaken offerte' });
    }
});

// PUT /api/quotes/:id - Offerte bijwerken
router.put('/:id', validateQuote, async (req, res) => {
    try {
        const quoteId = req.params.id;
        const {
            customer_id,
            description,
            notes,
            valid_until,
            discount_percentage = 0,
            tax_percentage = 21,
            status,
            items = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Check of offerte bestaat
            const existingQuote = await client.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
            if (existingQuote.rows.length === 0) {
                throw new Error('Offerte niet gevonden');
            }

            // Bereken totalen
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const discountAmount = subtotal * (discount_percentage / 100);
            const discountedAmount = subtotal - discountAmount;
            const taxAmount = discountedAmount * (tax_percentage / 100);
            const totalAmount = discountedAmount + taxAmount;

            // Update offerte
            const quoteResult = await client.query(`
                UPDATE quotes SET
                    customer_id = $1, description = $2, notes = $3,
                    subtotal_amount = $4, discount_percentage = $5, discount_amount = $6,
                    tax_percentage = $7, tax_amount = $8, total_amount = $9,
                    valid_until = $10, status = COALESCE($11, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12
                RETURNING *
            `, [
                customer_id, description, notes,
                subtotal, discount_percentage, discountAmount,
                tax_percentage, taxAmount, totalAmount, valid_until,
                status, quoteId
            ]);

            const quote = quoteResult.rows[0];

            // Verwijder oude items en voeg nieuwe toe
            await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);

            if (items.length > 0) {
                const itemsQuery = `
                    INSERT INTO quote_items (
                        quote_id, service_id, description, 
                        quantity, unit_price, total_price
                    ) VALUES ${items.map((_, index) => {
                        const baseIndex = index * 6;
                        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
                    }).join(', ')}
                    RETURNING *
                `;

                const itemsParams = items.flatMap(item => [
                    quote.id,
                    item.service_id,
                    item.description || null,
                    item.quantity,
                    item.unit_price,
                    item.quantity * item.unit_price
                ]);

                const itemsResult = await client.query(itemsQuery, itemsParams);
                quote.items = itemsResult.rows;
            }

            return quote;
        });

        res.json(result);

    } catch (error) {
        console.error('Error updating quote:', error);
        
        if (error.message === 'Offerte niet gevonden') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij bijwerken offerte' });
    }
});

// DELETE /api/quotes/:id - Offerte verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const quoteId = req.params.id;

        const result = await transaction(async (client) => {
            // Check of offerte bestaat
            const existingQuote = await client.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
            if (existingQuote.rows.length === 0) {
                throw new Error('Offerte niet gevonden');
            }

            // Verwijder gerelateerde items eerst
            await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);
            
            // Verwijder offerte
            await client.query('DELETE FROM quotes WHERE id = $1', [quoteId]);
            
            return { success: true };
        });

        res.json({ message: 'Offerte succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting quote:', error);
        
        if (error.message === 'Offerte niet gevonden') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij verwijderen offerte' });
    }
});

// POST /api/quotes/:id/pdf - PDF van offerte genereren
router.post('/:id/pdf', async (req, res) => {
    try {
        const quoteId = req.params.id;

        // Haal volledige offerte gegevens op
        const result = await query(`
            SELECT 
                q.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city,
                json_agg(
                    json_build_object(
                        'id', qi.id,
                        'service_name', COALESCE(s.name, 'Aangepaste service'),
                        'description', qi.description,
                        'quantity', qi.quantity,
                        'unit_price', qi.unit_price,
                        'total_price', qi.total_price
                    ) ORDER BY qi.id
                ) as items
            FROM quotes q
            JOIN customers c ON q.customer_id = c.id
            LEFT JOIN quote_items qi ON q.id = qi.quote_id
            LEFT JOIN services s ON s.id = qi.service_id
            WHERE q.id = $1
            GROUP BY q.id, c.id
        `, [quoteId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Offerte niet gevonden' });
        }

        const quote = result.rows[0];
        quote.items = quote.items.filter(item => item.id !== null);

        // Restructure data for PDF generator
        const pdfData = {
            ...quote,
            customer: {
                first_name: quote.customer_name ? quote.customer_name.split(' ')[0] : '',
                last_name: quote.customer_name ? quote.customer_name.split(' ').slice(1).join(' ') : '',
                email: quote.customer_email,
                phone: quote.customer_phone,
                address: quote.address,
                postal_code: quote.postal_code,
                city: quote.city
            }
        };

        // Genereer PDF
        const pdfBuffer = await generateQuotePDF(pdfData);

        // Stel headers in voor PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Offerte-${quote.quote_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating quote PDF:', error);
        res.status(500).json({ error: 'Fout bij genereren PDF' });
    }
});

// POST /api/quotes/:id/convert-to-invoice - Offerte omzetten naar factuur
router.post('/:id/convert-to-invoice', async (req, res) => {
    try {
        const quoteId = req.params.id;

        const result = await transaction(async (client) => {
            // Haal offerte op
            const quoteResult = await client.query(`
                SELECT q.*, 
                       json_agg(
                           json_build_object(
                               'service_name', COALESCE(s.name, 'Aangepaste service'),
                               'description', qi.description,
                               'quantity', qi.quantity,
                               'unit_price', qi.unit_price,
                               'total_price', qi.total_price
                           )
                       ) as items
                FROM quotes q
                LEFT JOIN quote_items qi ON q.id = qi.quote_id
            LEFT JOIN services s ON s.id = qi.service_id
                WHERE q.id = $1
                GROUP BY q.id
            `, [quoteId]);

            if (quoteResult.rows.length === 0) {
                throw new Error('Offerte niet gevonden');
            }

            const quote = quoteResult.rows[0];
            
            // Check of offerte geaccepteerd is
            if (quote.status !== 'accepted') {
                throw new Error('Alleen geaccepteerde offertes kunnen worden omgezet naar factuur');
            }

            // Check of er al een factuur bestaat voor deze offerte
            const existingInvoice = await client.query(
                'SELECT id FROM invoices WHERE quote_id = $1', 
                [quoteId]
            );

            if (existingInvoice.rows.length > 0) {
                throw new Error('Er bestaat al een factuur voor deze offerte');
            }

            // Genereer factuur nummer
            const invoiceNumberResult = await client.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV([0-9]+)') AS INTEGER)), 0) + 1 as next_number
                FROM invoices 
                WHERE invoice_number ~ '^INV[0-9]+$'
            `);
            
            const nextNumber = invoiceNumberResult.rows[0].next_number;
            const invoiceNumber = `INV${nextNumber.toString().padStart(4, '0')}`;

            // Maak factuur aan
            const invoiceResult = await client.query(`
                INSERT INTO invoices (
                    customer_id, quote_id, invoice_number, description,
                    subtotal_amount, discount_percentage, discount_amount,
                    tax_percentage, tax_amount, total_amount,
                    due_date, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
                RETURNING *
            `, [
                quote.customer_id, quote.id, invoiceNumber, quote.description,
                quote.subtotal_amount, quote.discount_percentage, quote.discount_amount,
                quote.tax_percentage, quote.tax_amount, quote.total_amount,
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 dagen betaaltermijn
            ]);

            const invoice = invoiceResult.rows[0];

            // Voeg factuur items toe
            const validItems = quote.items.filter(item => item.service_name !== null && item.service_name !== undefined);
            if (validItems.length > 0) {
                const itemsQuery = `
                    INSERT INTO invoice_items (
                        invoice_id, service_id, description, 
                        quantity, unit_price, total_price
                    ) VALUES ${validItems.map((_, index) => {
                        const baseIndex = index * 6;
                        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
                    }).join(', ')}
                    RETURNING *
                `;

                const itemsParams = validItems.flatMap(item => [
                    invoice.id,
                    item.service_id || null,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.total_price
                ]);

                const itemsResult = await client.query(itemsQuery, itemsParams);
                invoice.items = itemsResult.rows;
            }

            // Update offerte status naar 'converted'
            await client.query(
                'UPDATE quotes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['converted', quoteId]
            );

            return invoice;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error converting quote to invoice:', error);
        
        if (error.message.includes('niet gevonden') || 
            error.message.includes('geaccepteerde offertes') || 
            error.message.includes('bestaat al een factuur')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij omzetten naar factuur' });
    }
});

// GET /api/quotes/stats - Quote statistieken
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_quotes,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_quotes,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_quotes,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_quotes,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_quotes,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_quotes,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_quotes,
                COALESCE(SUM(total_amount), 0) as total_value,
                COALESCE(SUM(CASE WHEN status = 'accepted' THEN total_amount ELSE 0 END), 0) as accepted_value,
                COALESCE(AVG(total_amount), 0) as average_quote_value
            FROM quotes
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Error fetching quote stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

module.exports = router;