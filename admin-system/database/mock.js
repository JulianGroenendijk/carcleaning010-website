// Mock database voor testing zonder PostgreSQL setup
// Dit is een tijdelijke oplossing voor snelle tests

class MockDatabase {
    constructor() {
        this.tables = {
            admin_users: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    email: 'admin@carcleaning010.nl',
                    password_hash: '$2b$12$WYAQ0VQXOSzs6HSriqDiheSCUuVIyEHdN5G9JY6Xn7GOs77pQ8z8.', // admin123
                    name: 'Admin User',
                    role: 'admin',
                    active: true,
                    created_at: new Date().toISOString(),
                    last_login: null
                }
            ],
            customers: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    first_name: 'Test',
                    last_name: 'Klant',
                    email: 'test@example.com',
                    phone: '+31 6 12 34 56 78',
                    address: 'Teststraat 123',
                    postal_code: '1234 AB',
                    city: 'Rotterdam',
                    notes: 'Test klant',
                    source: 'manual',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ],
            services: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    name: 'Basis Wassen',
                    description: 'Uitwendig wassen met shampoo',
                    category: 'wash',
                    base_price: 35.00,
                    duration_minutes: 90,
                    active: true,
                    sort_order: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ],
            website_leads: [],
            quotes: [
                {
                    id: 1,
                    quote_number: 'QUO-2025-001',
                    customer_id: 1,
                    customer_name: 'Jan de Vries',
                    customer_email: 'jan@example.com',
                    customer_phone: '+31612345678',
                    customer_address: 'Hoofdstraat 123, 1234AB Amsterdam',
                    service_type: 'detail-cleaning',
                    vehicle_info: 'BMW 3 Serie, 2020, Zwart',
                    description: 'Volledige detail cleaning inclusief interieur',
                    amount: 199.50,
                    status: 'verzonden',
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Klant wil extra aandacht voor lederwerk',
                    created_at: new Date('2025-01-15').toISOString(),
                    updated_at: new Date('2025-01-15').toISOString()
                },
                {
                    id: 2,
                    quote_number: 'QUO-2025-002',
                    customer_id: 2,
                    customer_name: 'Sarah Bakker',
                    customer_email: 'sarah@example.com',
                    customer_phone: '+31687654321',
                    customer_address: 'Kerkstraat 45, 5678CD Utrecht',
                    service_type: 'hand-autowas',
                    vehicle_info: 'Audi A4, 2019, Wit',
                    description: 'Hand autowas met was behandeling',
                    amount: 89.00,
                    status: 'geaccepteerd',
                    valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: null,
                    created_at: new Date('2025-01-20').toISOString(),
                    updated_at: new Date('2025-01-22').toISOString()
                },
                {
                    id: 3,
                    quote_number: 'QUO-2025-003',
                    customer_id: 1,
                    customer_name: 'Mike Johnson',
                    customer_email: 'mike@example.com',
                    customer_phone: '+31656789123',
                    customer_address: 'Nieuwstraat 78, 9012EF Rotterdam',
                    service_type: 'coating',
                    vehicle_info: 'Tesla Model 3, 2021, Blauw',
                    description: 'Ceramic coating behandeling',
                    amount: 899.00,
                    status: 'concept',
                    valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Wacht op goedkeuring coating merk',
                    created_at: new Date('2025-01-25').toISOString(),
                    updated_at: new Date('2025-01-25').toISOString()
                }
            ],
            appointments: [],
            invoices: [],
            certificates: [],
            vehicles: []
        };
    }

    async query(sql, params = []) {
        console.log('Mock DB Query:', sql.substring(0, 100) + '...');
        
        // Health check
        if (sql.includes('SELECT 1')) {
            return { rows: [{ result: 1 }] };
        }

        // Stats queries
        if (sql.includes('COUNT(*)')) {
            return { 
                rows: [{
                    customers: this.tables.customers.length,
                    appointments_this_month: 0,
                    open_quotes: 0,
                    revenue_this_month: 0
                }]
            };
        }

        // Admin user queries
        if (sql.includes('admin_users')) {
            if (sql.includes('WHERE email')) {
                const email = params[0];
                console.log('Looking for admin user with email:', email);
                const user = this.tables.admin_users.find(u => u.email === email);
                console.log('Found user:', user ? 'Yes' : 'No');
                return { rows: user ? [user] : [] };
            }
            if (sql.includes('WHERE id')) {
                const id = params[0];
                const user = this.tables.admin_users.find(u => u.id === id);
                return { rows: user ? [user] : [] };
            }
            if (sql.includes('UPDATE admin_users SET last_login')) {
                // Mock update last_login
                return { rows: [] };
            }
        }

        // Customer queries
        if (sql.includes('FROM customers')) {
            return { 
                rows: this.tables.customers.map((customer, index) => ({
                    ...customer,
                    total_count: this.tables.customers.length
                }))
            };
        }

        // Quotes queries
        if (sql.includes('FROM quotes') || sql.includes('quotes q')) {
            if (sql.includes('WHERE id')) {
                // Get specific quote by ID
                const id = parseInt(params[0]);
                const quote = this.tables.quotes.find(q => q.id === id);
                return { rows: quote ? [quote] : [] };
            }
            
            // Get all quotes with customer info joined
            return { 
                rows: this.tables.quotes.map((quote, index) => ({
                    ...quote,
                    total_count: this.tables.quotes.length
                }))
            };
        }

        // Invoice number generation query
        if (sql.includes('SUBSTRING(invoice_number FROM') && sql.includes('next_number')) {
            // Generate next invoice number based on existing invoices
            const invoiceNumbers = this.tables.invoices
                .map(inv => inv.invoice_number)
                .filter(num => num && num.match(/^INV\d+$/))
                .map(num => parseInt(num.replace('INV', '')))
                .sort((a, b) => b - a); // Sort descending
            
            const nextNumber = invoiceNumbers.length > 0 ? invoiceNumbers[0] + 1 : 1;
            return { rows: [{ next_number: nextNumber }] };
        }

        // Invoice creation queries
        if (sql.includes('INSERT INTO invoices')) {
            // Mock invoice creation
            const newInvoice = {
                id: 'invoice-' + Date.now(),
                invoice_number: `INV${String(this.tables.invoices.length + 1).padStart(4, '0')}`,
                customer_id: params[0],
                quote_id: params[1],
                description: params[3],
                subtotal_amount: params[4],
                discount_percentage: params[5],
                discount_amount: params[6],
                tax_percentage: params[7],
                tax_amount: params[8],
                total_amount: params[9],
                due_date: params[10],
                notes: params[11],
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.tables.invoices.push(newInvoice);
            return { rows: [newInvoice] };
        }

        // Invoice items creation queries
        if (sql.includes('INSERT INTO invoice_items')) {
            // Mock - just return success, items are handled in the route
            return { rows: [] };
        }

        // Default empty response
        return { rows: [] };
    }

    async transaction(callback) {
        // Voor mock database, voer callback direct uit
        return await callback(this);
    }

    async healthCheck() {
        return { status: 'connected', message: 'Mock database active' };
    }

    async close() {
        console.log('Mock database connection closed');
    }
}

const mockDb = new MockDatabase();

module.exports = {
    query: (sql, params) => mockDb.query(sql, params),
    transaction: (callback) => mockDb.transaction(callback),
    healthCheck: () => mockDb.healthCheck(),
    close: () => mockDb.close()
};