const express = require('express');
const { query } = require('../database/connection');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// GET /api/dashboard/stats - Dashboard statistieken
router.get('/stats', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM customers) as customers,
                (SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) >= DATE_TRUNC('month', CURRENT_DATE) AND DATE(appointment_date) < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') as appointments_this_month,
                (SELECT COUNT(*) FROM quotes WHERE status IN ('draft', 'sent')) as open_quotes,
                (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid' AND DATE(paid_date) >= DATE_TRUNC('month', CURRENT_DATE) AND DATE(paid_date) < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') as revenue_this_month,
                (SELECT COUNT(*) FROM website_leads WHERE status = 'new') as new_leads
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen dashboard statistieken' });
    }
});

// GET /api/dashboard/activity - Recente activiteit
router.get('/activity', async (req, res) => {
    try {
        const activities = [];

        // Recente klanten (laatste 5)
        const recentCustomers = await query(`
            SELECT id, first_name, last_name, created_at
            FROM customers 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        recentCustomers.rows.forEach(customer => {
            activities.push({
                type: 'customer',
                title: 'Nieuwe klant toegevoegd',
                description: `${customer.first_name} ${customer.last_name}`,
                created_at: customer.created_at
            });
        });

        // Recente afspraken (laatste 5)
        const recentAppointments = await query(`
            SELECT a.id, a.location, a.created_at, c.first_name, c.last_name
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            ORDER BY a.created_at DESC 
            LIMIT 5
        `);

        recentAppointments.rows.forEach(appointment => {
            activities.push({
                type: 'appointment',
                title: 'Nieuwe afspraak gepland',
                description: `${appointment.location || 'Afspraak'} voor ${appointment.first_name} ${appointment.last_name}`,
                created_at: appointment.created_at
            });
        });

        // Recente offertes (laatste 5)
        const recentQuotes = await query(`
            SELECT q.id, q.quote_number, q.created_at, c.first_name, c.last_name
            FROM quotes q
            JOIN customers c ON q.customer_id = c.id
            ORDER BY q.created_at DESC 
            LIMIT 5
        `);

        recentQuotes.rows.forEach(quote => {
            activities.push({
                type: 'quote',
                title: 'Nieuwe offerte aangemaakt',
                description: `${quote.quote_number} voor ${quote.first_name} ${quote.last_name}`,
                created_at: quote.created_at
            });
        });

        // Recente website leads (laatste 5)
        const recentLeads = await query(`
            SELECT id, first_name, last_name, email, service_type, created_at
            FROM website_leads
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        recentLeads.rows.forEach(lead => {
            activities.push({
                type: 'lead',
                title: 'Nieuwe website aanvraag',
                description: `${lead.first_name || ''} ${lead.last_name || ''} - ${lead.service_type || 'Informatie'} (${lead.email})`,
                created_at: lead.created_at
            });
        });

        // Sorteer alle activiteiten op datum
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(activities.slice(0, 10)); // Laatste 10 activiteiten

    } catch (error) {
        console.error('Error fetching dashboard activity:', error);
        res.status(500).json({ error: 'Fout bij ophalen activiteit' });
    }
});

module.exports = router;