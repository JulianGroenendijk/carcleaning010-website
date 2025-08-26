-- Carcleaning010 Database Seed File
-- This file creates initial data for the admin system

-- Create initial admin user
-- Password: "admin123" (hash generated with bcrypt rounds=12)
-- IMPORTANT: Change this password after first login!

INSERT INTO admin_users (
    email, 
    password_hash, 
    name, 
    role, 
    active
) VALUES (
    'admin@carcleaning010.nl',
    '$2b$12$LQv3c1yqBFVyBr1H.lkRdOCjhKv4vF.4IzQFu3QDvvZ5t1bZ2rX4e', -- admin123
    'Admin User',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create some example services
INSERT INTO services (name, description, category, base_price, duration_minutes, active, sort_order) VALUES
('Basis Wassen', 'Uitwendig wassen met shampoo, janten reinigen en interieur stofzuigen', 'wash', 35.00, 90, true, 1),
('Was & Wax', 'Basis wassen + wax behandeling voor extra bescherming en glans', 'wash', 55.00, 120, true, 2),
('Paint Correction', 'Professionele lakrestauratie voor het verwijderen van krassen en swirls', 'correction', 150.00, 240, true, 3),
('Ceramic Coating', 'Duurzame keramische coating voor langdurige bescherming', 'coating', 300.00, 360, true, 4),
('Full Detail', 'Complete detailing service inclusief interieur en exterieur', 'detail', 200.00, 300, true, 5),
('Interieur Reiniging', 'Diepgaande reiniging van het interieur inclusief leer/stof behandeling', 'interior', 75.00, 150, true, 6)
ON CONFLICT (name) DO NOTHING;

-- Create example customer (voor testing)
INSERT INTO customers (
    first_name, 
    last_name, 
    email, 
    phone, 
    address, 
    postal_code, 
    city, 
    notes,
    source
) VALUES (
    'Test',
    'Klant',
    'test@example.com',
    '+31 6 12 34 56 78',
    'Teststraat 123',
    '1234 AB',
    'Rotterdam',
    'Test klant voor demonstratie doeleinden',
    'manual'
) ON CONFLICT (email) DO NOTHING;

-- Insert example vehicle for test customer
INSERT INTO vehicles (
    customer_id,
    license_plate,
    make,
    model,
    year,
    color,
    fuel_type,
    notes
) 
SELECT 
    c.id,
    '12-ABC-3',
    'BMW',
    '3 Serie',
    2020,
    'Zwart',
    'benzine',
    'Test voertuig'
FROM customers c 
WHERE c.email = 'test@example.com'
ON CONFLICT (license_plate) DO NOTHING;

-- Insert sample website lead
INSERT INTO website_leads (
    first_name,
    last_name,
    email,
    phone,
    service_type,
    vehicle_info,
    message,
    source,
    status
) VALUES (
    'Jan',
    'Voorbeeld',
    'jan@voorbeeld.nl',
    '+31 6 98 76 54 32',
    'detail-cleaning',
    'Audi A4, 2019, Wit',
    'Graag een afspraak maken voor een grondige wasbeurt met wax.',
    'website',
    'new'
);

-- Insert sample suppliers
INSERT INTO suppliers (
    name,
    contact_person,
    email,
    phone,
    address,
    city,
    postal_code,
    category,
    status
) VALUES 
(
    'AutoWas Supplies B.V.',
    'Jan Jansen',
    'jan@autowas.nl',
    '+31 20 123 45 67',
    'Industrieweg 123',
    'Amsterdam',
    '1000 AB',
    'materials',
    'active'
),
(
    'TechClean Equipment',
    'Sarah de Vries',
    'sarah@techclean.com',
    '+31 30 123 45 67',
    'Technopark 45',
    'Utrecht',
    '3000 CD',
    'equipment',
    'active'
);

-- Insert sample expenses
INSERT INTO expenses (
    expense_number,
    supplier_id,
    invoice_number,
    description,
    amount,
    btw_amount,
    total_amount,
    category,
    expense_date,
    status
) 
SELECT 
    'EXP-2025-001',
    s.id,
    'INV-12345',
    'Professionele shampoo en was middelen',
    202.89,
    42.61,
    245.50,
    'materials',
    CURRENT_DATE - INTERVAL '5 days',
    'paid'
FROM suppliers s 
WHERE s.name = 'AutoWas Supplies B.V.'
UNION ALL
SELECT 
    'EXP-2025-002',
    s.id,
    'TC-7890',
    'Hogedruk reiniger onderdelen',
    74.34,
    15.61,
    89.95,
    'equipment',
    CURRENT_DATE - INTERVAL '2 days',
    'pending'
FROM suppliers s 
WHERE s.name = 'TechClean Equipment';

-- Insert sample quotes
INSERT INTO quotes (
    quote_number,
    customer_id,
    vehicle_id,
    status,
    subtotal,
    tax_amount,
    total_amount,
    valid_until,
    notes
) 
SELECT 
    'QUO-2025-001',
    c.id,
    v.id,
    'sent',
    165.29,
    34.71,
    200.00,
    CURRENT_DATE + INTERVAL '30 days',
    'Professionele detailing service voor BMW'
FROM customers c
JOIN vehicles v ON v.customer_id = c.id
WHERE c.email = 'test@example.com';

-- Insert quote items for the sample quote
INSERT INTO quote_items (
    quote_id,
    service_id,
    quantity,
    unit_price,
    total_price,
    description
)
SELECT 
    q.id,
    s.id,
    1,
    200.00,
    200.00,
    'Full Detail service inclusief interieur en exterieur'
FROM quotes q
JOIN services s ON s.name = 'Full Detail'
WHERE q.quote_number = 'QUO-2025-001';

-- Insert dashboard activity examples
-- Note: These will be created automatically as users interact with the system

COMMIT;

-- Display created data summary
SELECT 
    'Admin Users' as table_name, 
    COUNT(*) as count 
FROM admin_users
UNION ALL
SELECT 
    'Services' as table_name, 
    COUNT(*) as count 
FROM services
UNION ALL
SELECT 
    'Customers' as table_name, 
    COUNT(*) as count 
FROM customers
UNION ALL
SELECT 
    'Vehicles' as table_name, 
    COUNT(*) as count 
FROM vehicles
UNION ALL
SELECT 
    'Website Leads' as table_name, 
    COUNT(*) as count 
FROM website_leads;

-- Show admin user (without password hash)
SELECT 
    id,
    email,
    name,
    role,
    active,
    created_at
FROM admin_users;

ECHO 'Seed data successfully inserted!';
ECHO 'Default admin login:';
ECHO 'Email: admin@carcleaning010.nl';
ECHO 'Password: admin123';
ECHO '';
ECHO 'IMPORTANT: Change the default password after first login!';
ECHO 'Log in to the admin dashboard and update your credentials immediately.';