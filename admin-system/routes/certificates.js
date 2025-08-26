const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');
const { validateCertificate } = require('../middleware/validation');
const { generateCertificatePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/certificates - Alle certificaten met filtering en paginatie
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            customer_id = '',
            service_type = '',
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
                cert.certificate_number ILIKE $${paramCount} OR
                cert.service_type ILIKE $${paramCount} OR
                cert.vehicle_info ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Klant filter
        if (customer_id) {
            paramCount++;
            whereClause += ` AND cert.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        // Service type filter
        if (service_type) {
            paramCount++;
            whereClause += ` AND cert.service_type = $${paramCount}`;
            params.push(service_type);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['created_at', 'certificate_number', 'service_date', 'service_type'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const certificatesQuery = `
            SELECT 
                cert.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                COUNT(*) OVER() as total_count
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            ${whereClause}
            ORDER BY cert.${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(certificatesQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            certificates: result.rows.map(row => {
                const { total_count, ...certificate } = row;
                return certificate;
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
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: 'Fout bij ophalen certificaten' });
    }
});

// GET /api/certificates/:id - Specifiek certificaat
router.get('/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;

        const result = await query(`
            SELECT 
                cert.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            WHERE cert.id = $1
        `, [certificateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificaat niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Fout bij ophalen certificaat' });
    }
});

// POST /api/certificates - Nieuw certificaat aanmaken
router.post('/', validateCertificate, async (req, res) => {
    try {
        const {
            customer_id,
            appointment_id,
            service_type,
            service_description,
            vehicle_info,
            service_date,
            products_used,
            warranty_period_months,
            special_notes,
            before_photos = [],
            after_photos = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Genereer certificaat nummer
            const certNumberResult = await client.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 'CERT([0-9]+)') AS INTEGER)), 0) + 1 as next_number
                FROM certificates 
                WHERE certificate_number ~ '^CERT[0-9]+$'
            `);
            
            const nextNumber = certNumberResult.rows[0].next_number;
            const certificateNumber = `CERT${nextNumber.toString().padStart(4, '0')}`;

            // Bereken garantie verloopdatum
            const warrantyEndDate = warranty_period_months ? 
                new Date(new Date(service_date).getTime() + (warranty_period_months * 30 * 24 * 60 * 60 * 1000)).toISOString() : 
                null;

            // Maak certificaat aan
            const certificateResult = await client.query(`
                INSERT INTO certificates (
                    customer_id, appointment_id, certificate_number, service_type,
                    service_description, vehicle_info, service_date, products_used,
                    warranty_period_months, warranty_end_date, special_notes,
                    before_photos, after_photos
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                customer_id, appointment_id, certificateNumber, service_type,
                service_description, vehicle_info, service_date, products_used,
                warranty_period_months, warrantyEndDate, special_notes,
                JSON.stringify(before_photos), JSON.stringify(after_photos)
            ]);

            return certificateResult.rows[0];
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating certificate:', error);
        res.status(500).json({ error: 'Fout bij aanmaken certificaat' });
    }
});

// PUT /api/certificates/:id - Certificaat bijwerken
router.put('/:id', validateCertificate, async (req, res) => {
    try {
        const certificateId = req.params.id;
        const {
            customer_id,
            appointment_id,
            service_type,
            service_description,
            vehicle_info,
            service_date,
            products_used,
            warranty_period_months,
            special_notes,
            before_photos = [],
            after_photos = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Check of certificaat bestaat
            const existingCert = await client.query('SELECT * FROM certificates WHERE id = $1', [certificateId]);
            if (existingCert.rows.length === 0) {
                throw new Error('Certificaat niet gevonden');
            }

            // Bereken garantie verloopdatum
            const warrantyEndDate = warranty_period_months ? 
                new Date(new Date(service_date).getTime() + (warranty_period_months * 30 * 24 * 60 * 60 * 1000)).toISOString() : 
                null;

            // Update certificaat
            const certificateResult = await client.query(`
                UPDATE certificates SET
                    customer_id = $1, appointment_id = $2, service_type = $3,
                    service_description = $4, vehicle_info = $5, service_date = $6,
                    products_used = $7, warranty_period_months = $8, warranty_end_date = $9,
                    special_notes = $10, before_photos = $11, after_photos = $12,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $13
                RETURNING *
            `, [
                customer_id, appointment_id, service_type,
                service_description, vehicle_info, service_date, products_used,
                warranty_period_months, warrantyEndDate, special_notes,
                JSON.stringify(before_photos), JSON.stringify(after_photos),
                certificateId
            ]);

            return certificateResult.rows[0];
        });

        res.json(result);

    } catch (error) {
        console.error('Error updating certificate:', error);
        
        if (error.message === 'Certificaat niet gevonden') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij bijwerken certificaat' });
    }
});

// DELETE /api/certificates/:id - Certificaat verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;

        const result = await query('DELETE FROM certificates WHERE id = $1 RETURNING id', [certificateId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificaat niet gevonden' });
        }

        res.json({ message: 'Certificaat succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({ error: 'Fout bij verwijderen certificaat' });
    }
});

// POST /api/certificates/:id/pdf - PDF van certificaat genereren
router.post('/:id/pdf', async (req, res) => {
    try {
        const certificateId = req.params.id;

        // Haal volledige certificaat gegevens op
        const result = await query(`
            SELECT 
                cert.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            WHERE cert.id = $1
        `, [certificateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificaat niet gevonden' });
        }

        const certificate = result.rows[0];

        // Parse JSON foto arrays
        try {
            certificate.before_photos = JSON.parse(certificate.before_photos || '[]');
            certificate.after_photos = JSON.parse(certificate.after_photos || '[]');
        } catch (e) {
            certificate.before_photos = [];
            certificate.after_photos = [];
        }

        // Genereer PDF
        const pdfBuffer = await generateCertificatePDF(certificate);

        // Stel headers in voor PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Certificaat-${certificate.certificate_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating certificate PDF:', error);
        res.status(500).json({ error: 'Fout bij genereren PDF' });
    }
});

// GET /api/certificates/by-customer/:customer_id - Certificaten voor specifieke klant
router.get('/by-customer/:customer_id', async (req, res) => {
    try {
        const customerId = req.params.customer_id;

        const result = await query(`
            SELECT 
                cert.*,
                c.first_name || ' ' || c.last_name as customer_name
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            WHERE cert.customer_id = $1
            ORDER BY cert.service_date DESC
        `, [customerId]);

        res.json({
            certificates: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching customer certificates:', error);
        res.status(500).json({ error: 'Fout bij ophalen klant certificaten' });
    }
});

// GET /api/certificates/warranty-status/:id - Garantie status van certificaat
router.get('/warranty-status/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;

        const result = await query(`
            SELECT 
                cert.id,
                cert.certificate_number,
                cert.warranty_period_months,
                cert.warranty_end_date,
                cert.service_date,
                CASE 
                    WHEN cert.warranty_end_date IS NULL THEN 'no_warranty'
                    WHEN cert.warranty_end_date > CURRENT_DATE THEN 'active'
                    ELSE 'expired'
                END as warranty_status,
                CASE 
                    WHEN cert.warranty_end_date IS NOT NULL AND cert.warranty_end_date > CURRENT_DATE 
                    THEN EXTRACT(DAY FROM (cert.warranty_end_date - CURRENT_DATE))
                    ELSE 0
                END as days_remaining,
                c.first_name || ' ' || c.last_name as customer_name
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            WHERE cert.id = $1
        `, [certificateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificaat niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error checking warranty status:', error);
        res.status(500).json({ error: 'Fout bij controleren garantie status' });
    }
});

// GET /api/certificates/expiring-warranties - Certificaten met bijna verlopende garantie
router.get('/expiring-warranties', async (req, res) => {
    try {
        const { days_ahead = 30 } = req.query;

        const result = await query(`
            SELECT 
                cert.id,
                cert.certificate_number,
                cert.warranty_end_date,
                cert.service_type,
                cert.vehicle_info,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                EXTRACT(DAY FROM (cert.warranty_end_date - CURRENT_DATE)) as days_remaining
            FROM certificates cert
            JOIN customers c ON cert.customer_id = c.id
            WHERE cert.warranty_end_date IS NOT NULL
            AND cert.warranty_end_date > CURRENT_DATE
            AND cert.warranty_end_date <= CURRENT_DATE + INTERVAL '${parseInt(days_ahead)} days'
            ORDER BY cert.warranty_end_date ASC
        `);

        res.json({
            expiring_warranties: result.rows,
            total_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching expiring warranties:', error);
        res.status(500).json({ error: 'Fout bij ophalen verlopende garanties' });
    }
});

// POST /api/certificates/from-appointment/:appointment_id - Certificaat maken van afspraak
router.post('/from-appointment/:appointment_id', async (req, res) => {
    try {
        const appointmentId = req.params.appointment_id;
        const {
            products_used,
            warranty_period_months = 12,
            special_notes,
            before_photos = [],
            after_photos = []
        } = req.body;

        const result = await transaction(async (client) => {
            // Haal afspraak gegevens op
            const appointmentResult = await client.query(`
                SELECT 
                    a.*,
                    c.first_name || ' ' || c.last_name as customer_name
                FROM appointments a
                JOIN customers c ON a.customer_id = c.id
                WHERE a.id = $1
            `, [appointmentId]);

            if (appointmentResult.rows.length === 0) {
                throw new Error('Afspraak niet gevonden');
            }

            const appointment = appointmentResult.rows[0];

            if (appointment.status !== 'completed') {
                throw new Error('Alleen voltooide afspraken kunnen certificaten krijgen');
            }

            // Check of er al een certificaat bestaat voor deze afspraak
            const existingCert = await client.query(
                'SELECT id FROM certificates WHERE appointment_id = $1', 
                [appointmentId]
            );

            if (existingCert.rows.length > 0) {
                throw new Error('Er bestaat al een certificaat voor deze afspraak');
            }

            // Genereer certificaat nummer
            const certNumberResult = await client.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 'CERT([0-9]+)') AS INTEGER)), 0) + 1 as next_number
                FROM certificates 
                WHERE certificate_number ~ '^CERT[0-9]+$'
            `);
            
            const nextNumber = certNumberResult.rows[0].next_number;
            const certificateNumber = `CERT${nextNumber.toString().padStart(4, '0')}`;

            // Bereken garantie verloopdatum
            const serviceDate = appointment.completed_at || appointment.scheduled_date;
            const warrantyEndDate = warranty_period_months ? 
                new Date(new Date(serviceDate).getTime() + (warranty_period_months * 30 * 24 * 60 * 60 * 1000)).toISOString() : 
                null;

            // Maak certificaat aan
            const certificateResult = await client.query(`
                INSERT INTO certificates (
                    customer_id, appointment_id, certificate_number, service_type,
                    service_description, service_date, products_used,
                    warranty_period_months, warranty_end_date, special_notes,
                    before_photos, after_photos
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                appointment.customer_id, appointmentId, certificateNumber, appointment.service_type,
                appointment.service_description, serviceDate, products_used,
                warranty_period_months, warrantyEndDate, special_notes,
                JSON.stringify(before_photos), JSON.stringify(after_photos)
            ]);

            return certificateResult.rows[0];
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating certificate from appointment:', error);
        
        if (error.message.includes('niet gevonden') || 
            error.message.includes('voltooide afspraken') || 
            error.message.includes('bestaat al een certificaat')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Fout bij aanmaken certificaat' });
    }
});

// GET /api/certificates/stats - Certificaat statistieken
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_certificates,
                COUNT(CASE WHEN warranty_end_date IS NOT NULL AND warranty_end_date > CURRENT_DATE THEN 1 END) as active_warranties,
                COUNT(CASE WHEN warranty_end_date IS NOT NULL AND warranty_end_date <= CURRENT_DATE THEN 1 END) as expired_warranties,
                COUNT(CASE WHEN warranty_end_date IS NULL THEN 1 END) as no_warranty,
                COUNT(CASE WHEN service_type = 'wash_wax' THEN 1 END) as wash_wax_certificates,
                COUNT(CASE WHEN service_type = 'paint_correction' THEN 1 END) as paint_correction_certificates,
                COUNT(CASE WHEN service_type = 'ceramic_coating' THEN 1 END) as ceramic_coating_certificates,
                COUNT(CASE WHEN service_type = 'full_detail' THEN 1 END) as full_detail_certificates,
                COALESCE(AVG(warranty_period_months), 0) as average_warranty_months
            FROM certificates
        `);

        // Certificaten per maand (afgelopen 12 maanden)
        const monthlyStats = await query(`
            SELECT 
                DATE_TRUNC('month', service_date) as month,
                COUNT(*) as certificates_count,
                COUNT(CASE WHEN warranty_end_date IS NOT NULL THEN 1 END) as with_warranty
            FROM certificates 
            WHERE service_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', service_date)
            ORDER BY month DESC
        `);

        res.json({
            ...stats.rows[0],
            monthly_certificates: monthlyStats.rows
        });

    } catch (error) {
        console.error('Error fetching certificate stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

module.exports = router;