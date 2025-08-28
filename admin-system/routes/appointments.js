const express = require('express');
const { query, transaction } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');
const { validateAppointment } = require('../middleware/validation');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/appointments - Alle afspraken met filtering en paginatie
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            status = '', 
            customer_id = '',
            date_from = '',
            date_to = '',
            sort_by = 'scheduled_date',
            sort_order = 'ASC'
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
                a.service_type ILIKE $${paramCount} OR
                a.notes ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Status filter
        if (status) {
            paramCount++;
            whereClause += ` AND a.status = $${paramCount}`;
            params.push(status);
        }

        // Klant filter
        if (customer_id) {
            paramCount++;
            whereClause += ` AND a.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        // Datum filters
        if (date_from) {
            paramCount++;
            whereClause += ` AND DATE(a.appointment_date) >= $${paramCount}`;
            params.push(date_from);
        }

        if (date_to) {
            paramCount++;
            whereClause += ` AND DATE(a.appointment_date) <= $${paramCount}`;
            params.push(date_to);
        }

        // Sorteerbare kolommen
        const allowedSortColumns = ['appointment_date', 'created_at', 'status'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'appointment_date';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const appointmentsQuery = `
            SELECT 
                a.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address,
                v.make || ' ' || v.model as vehicle_info,
                COUNT(*) OVER() as total_count
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            ${whereClause}
            ORDER BY a.${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);

        const result = await query(appointmentsQuery, params);

        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            appointments: result.rows.map(row => {
                const { total_count, ...appointment } = row;
                return appointment;
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
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Fout bij ophalen afspraken' });
    }
});

// GET /api/appointments/calendar - Kalender weergave
router.get('/calendar', async (req, res) => {
    try {
        const { 
            start_date,
            end_date,
            view = 'month' // week, month, day
        } = req.query;

        let dateFilter = '';
        const params = [];

        if (start_date && end_date) {
            dateFilter = 'WHERE a.scheduled_date BETWEEN $1 AND $2';
            params.push(start_date, end_date);
        } else {
            // Default naar huidige maand
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            dateFilter = 'WHERE a.scheduled_date BETWEEN $1 AND $2';
            params.push(startOfMonth.toISOString(), endOfMonth.toISOString());
        }

        const result = await query(`
            SELECT 
                a.id,
                a.scheduled_date,
                a.estimated_duration,
                a.service_type,
                a.status,
                a.notes,
                c.first_name || ' ' || c.last_name as customer_name,
                c.phone as customer_phone
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            ${dateFilter}
            ORDER BY a.scheduled_date ASC
        `, params);

        res.json({
            events: result.rows.map(appointment => ({
                id: appointment.id,
                title: `${appointment.customer_name} - ${appointment.service_type}`,
                start: appointment.scheduled_date,
                end: new Date(new Date(appointment.scheduled_date).getTime() + appointment.estimated_duration * 60000).toISOString(),
                status: appointment.status,
                customer_name: appointment.customer_name,
                customer_phone: appointment.customer_phone,
                service_type: appointment.service_type,
                notes: appointment.notes,
                backgroundColor: this.getStatusColor(appointment.status),
                borderColor: this.getStatusColor(appointment.status)
            }))
        });

    } catch (error) {
        console.error('Error fetching calendar appointments:', error);
        res.status(500).json({ error: 'Fout bij ophalen kalender' });
    }
});

// GET /api/appointments/:id - Specifieke afspraak
router.get('/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const result = await query(`
            SELECT 
                a.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address,
                c.postal_code,
                c.city,
                q.quote_number,
                q.total_amount as quote_amount
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN quotes q ON a.quote_id = q.id
            WHERE a.id = $1
        `, [appointmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afspraak niet gevonden' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ error: 'Fout bij ophalen afspraak' });
    }
});

// POST /api/appointments - Nieuwe afspraak aanmaken
router.post('/', validateAppointment, async (req, res) => {
    try {
        const {
            customer_id,
            vehicle_id,
            quote_id,
            appointment_date,
            start_time,
            end_time,
            status = 'scheduled',
            location,
            notes
        } = req.body;

        // Check voor conflicterende afspraken op dezelfde datum
        const conflictCheck = await query(`
            SELECT id FROM appointments 
            WHERE status NOT IN ('cancelled') 
            AND appointment_date = $1 
            AND (
                (start_time <= $2 AND end_time > $2) OR
                (start_time < $3 AND end_time >= $3) OR
                (start_time >= $2 AND end_time <= $3)
            )
        `, [appointment_date, start_time, end_time]);

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Er bestaat al een afspraak op dit tijdstip',
                conflicting_appointment_id: conflictCheck.rows[0].id
            });
        }

        const result = await query(`
            INSERT INTO appointments (
                customer_id, vehicle_id, quote_id, appointment_date, 
                start_time, end_time, status, location, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            customer_id, vehicle_id || null, quote_id || null, appointment_date,
            start_time, end_time, status, location || null, notes || null
        ]);

        // Haal volledige afspraak gegevens op
        const fullAppointment = await query(`
            SELECT 
                a.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            WHERE a.id = $1
        `, [result.rows[0].id]);

        res.status(201).json(fullAppointment.rows[0]);

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Fout bij aanmaken afspraak' });
    }
});

// PUT /api/appointments/:id - Afspraak bijwerken
router.put('/:id', validateAppointment, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const {
            customer_id,
            quote_id,
            appointment_date,
            start_time,
            end_time,
            status,
            location,
            notes
        } = req.body;

        // Check of afspraak bestaat
        const existingResult = await query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Afspraak niet gevonden' });
        }

        // Check voor conflicten als datum/tijd wordt gewijzigd
        if (appointment_date && start_time && end_time) {
            const conflictCheck = await query(`
                SELECT id FROM appointments 
                WHERE id != $1 
                AND status NOT IN ('cancelled', 'completed') 
                AND appointment_date = $2 
                AND (
                    (start_time <= $3 AND end_time > $3) OR
                    (start_time < $4 AND end_time >= $4) OR
                    (start_time >= $3 AND start_time < $4)
                )
            `, [appointmentId, appointment_date, start_time, end_time]);

            if (conflictCheck.rows.length > 0) {
                return res.status(409).json({
                    error: 'Er bestaat al een afspraak op dit tijdstip',
                    conflicting_appointment_id: conflictCheck.rows[0].id
                });
            }
        }

        const result = await query(`
            UPDATE appointments SET
                customer_id = COALESCE($1, customer_id),
                quote_id = COALESCE($2, quote_id),
                appointment_date = COALESCE($3, appointment_date),
                start_time = COALESCE($4, start_time),
                end_time = COALESCE($5, end_time),
                status = COALESCE($6, status),
                location = COALESCE($7, location),
                notes = COALESCE($8, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [
            customer_id, quote_id, appointment_date, start_time, 
            end_time, status, location, notes, appointmentId
        ]);

        // Haal volledige afspraak gegevens op
        const fullAppointment = await query(`
            SELECT 
                a.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            WHERE a.id = $1
        `, [appointmentId]);

        res.json(fullAppointment.rows[0]);

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Fout bij bijwerken afspraak' });
    }
});

// DELETE /api/appointments/:id - Afspraak verwijderen
router.delete('/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const result = await query('DELETE FROM appointments WHERE id = $1 RETURNING id', [appointmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afspraak niet gevonden' });
        }

        res.json({ message: 'Afspraak succesvol verwijderd' });

    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ error: 'Fout bij verwijderen afspraak' });
    }
});

// POST /api/appointments/:id/complete - Afspraak markeren als voltooid
router.post('/:id/complete', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { completion_notes, actual_duration } = req.body;

        const result = await query(`
            UPDATE appointments SET
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                completion_notes = $1,
                actual_duration = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [completion_notes, actual_duration, appointmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afspraak niet gevonden' });
        }

        // Haal volledige afspraak gegevens op
        const fullAppointment = await query(`
            SELECT 
                a.*,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            WHERE a.id = $1
        `, [appointmentId]);

        res.json(fullAppointment.rows[0]);

    } catch (error) {
        console.error('Error completing appointment:', error);
        res.status(500).json({ error: 'Fout bij voltooien afspraak' });
    }
});

// GET /api/appointments/availability/:date - Beschikbaarheid voor datum
router.get('/availability/:date', async (req, res) => {
    try {
        const date = req.params.date;
        
        // Werkuren definiëren (9:00 - 17:00)
        const workStart = 9; // 9:00
        const workEnd = 17;  // 17:00
        const slotDuration = 60; // 60 minuten per slot

        // Haal bestaande afspraken voor deze datum op
        const appointments = await query(`
            SELECT scheduled_date, estimated_duration
            FROM appointments
            WHERE DATE(scheduled_date) = $1
            AND status NOT IN ('cancelled', 'completed')
            ORDER BY scheduled_date
        `, [date]);

        // Genereer beschikbare tijdslots
        const availableSlots = [];
        const bookedSlots = appointments.rows.map(app => ({
            start: new Date(app.scheduled_date),
            end: new Date(new Date(app.scheduled_date).getTime() + app.estimated_duration * 60000)
        }));

        // Check elk uur slot
        for (let hour = workStart; hour < workEnd; hour++) {
            const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

            // Check of slot conflicteert met bestaande afspraken
            const isBooked = bookedSlots.some(booked => 
                (slotStart >= booked.start && slotStart < booked.end) ||
                (slotEnd > booked.start && slotEnd <= booked.end) ||
                (slotStart <= booked.start && slotEnd >= booked.end)
            );

            if (!isBooked) {
                availableSlots.push({
                    time: slotStart.toISOString(),
                    label: `${hour}:00 - ${hour + 1}:00`,
                    duration: slotDuration
                });
            }
        }

        res.json({
            date,
            available_slots: availableSlots,
            booked_appointments: appointments.rows.length
        });

    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Fout bij controleren beschikbaarheid' });
    }
});

// GET /api/appointments/stats - Afspraak statistieken
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_appointments,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_appointments,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
                COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_appointments,
                COUNT(CASE WHEN DATE(scheduled_date) = CURRENT_DATE THEN 1 END) as today_appointments,
                COUNT(CASE WHEN DATE(scheduled_date) = CURRENT_DATE + 1 THEN 1 END) as tomorrow_appointments,
                COUNT(CASE WHEN DATE(scheduled_date) >= CURRENT_DATE AND DATE(scheduled_date) < CURRENT_DATE + 7 THEN 1 END) as this_week_appointments,
                COALESCE(AVG(actual_duration), 0) as average_duration,
                COALESCE(AVG(CASE WHEN status = 'completed' AND actual_duration IS NOT NULL THEN actual_duration END), 0) as average_completed_duration
            FROM appointments
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Error fetching appointment stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// Helper function voor status kleuren (wordt gebruikt in calendar route)
router.getStatusColor = function(status) {
    const colors = {
        'scheduled': '#007bff',    // Blue
        'confirmed': '#28a745',   // Green  
        'in_progress': '#ffc107', // Yellow
        'completed': '#6c757d',   // Gray
        'cancelled': '#dc3545',   // Red
        'no_show': '#fd7e14'      // Orange
    };
    return colors[status] || '#6c757d';
};

module.exports = router;