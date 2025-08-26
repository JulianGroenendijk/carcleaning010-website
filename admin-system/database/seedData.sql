-- Seed data voor Carcleaning010 Admin System

-- Default services
INSERT INTO services (name, description, base_price, duration_minutes, category) VALUES
('Premium Signature Detail', 'Het ultieme detailing pakket voor wie het beste voor zijn auto wil. Complete verzorging van binnen en buiten.', 225.00, 300, 'signature'),
('Standard Signature Detail', 'Uitgebreide detailing met uren intensief handwerk voor een professioneel eindresultaat.', 165.00, 240, 'signature'),
('Express Detail', 'Snelle maar grondige detailing voor de klant die tijdsefficiënt wil werken.', 85.00, 120, 'signature'),
('Hand Wash Premium', 'Traditionele handwas waarbij elk paneel minutieus wordt behandeld. Fysiek intensief werk met premium producten.', 55.00, 90, 'cleaning'),
('Interior Deep Clean', 'Uren intensief werk aan elke hoek en plooi van het interieur. Van detailstofzuigen tot handmatige reiniging.', 100.00, 150, 'cleaning'),
('Paint Correction (1-stap)', 'Professionele lakrestauratie om lichte krassen en swirl marks te verwijderen.', 125.00, 180, 'correction'),
('Paint Correction (2-stap)', 'Uitgebreide lakrestauratie voor zwaar beschadigde lak met meerdere polijststappen.', 250.00, 360, 'correction'),
('Ceramic Coating (1 jaar)', 'Keramische beschermingslaag die 1 jaar bescherming biedt tegen weersinvloeden.', 350.00, 240, 'protection'),
('Ceramic Coating (2 jaar)', 'Premium keramische coating met 2 jaar garantie voor langdurige bescherming.', 550.00, 300, 'protection'),
('Ceramic Coating (5 jaar)', 'Topkwaliteit keramische coating met 5 jaar garantie - de ultieme bescherming.', 750.00, 360, 'protection'),
('Engine Bay Detailing', 'Zeer arbeidsintensieve reiniging waarbij elke component apart wordt behandeld.', 80.00, 120, 'cleaning'),
('Headlight Restoration', 'Professionele restauratie van matte en vergeelde koplampen.', 105.00, 90, 'restoration'),
('Trim Restoration', 'Restauratie van plastic en rubber onderdelen voor een zoals-nieuw uiterlijk.', 75.00, 60, 'restoration'),
('Ozonbehandeling', 'Eliminatie van geuren en bacteriën door middel van ozonbehandeling.', 45.00, 30, 'addon'),
('Pet Hair Removal', 'Grondige verwijdering van huisdierenharen uit het interieur.', 25.00, 30, 'addon'),
('Stoombehang Reiniging', 'Professionele stoomreiniging van stoffen bekleding.', 65.00, 90, 'addon'),
('Chrome Polish', 'Polijsten en beschermen van chromen onderdelen.', 45.00, 60, 'addon'),
('Convertible Top Care', 'Specialistische reiniging en behandeling van cabriokappen.', 85.00, 120, 'addon');

-- Sample admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash voor 'admin123' - VERANDER DIT IN PRODUCTIE!
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('jordy@carcleaning010.nl', '$2b$10$K7L/M5Q.NQZ5rJ8E9bN2NeG4hF6iS0tU7vW8xY9zA0bC1dE2fG3hI', 'Jordy', 'admin');

-- Sample customer data (voor testing)
INSERT INTO customers (email, first_name, last_name, phone, city) VALUES
('test.klant@example.com', 'Test', 'Klant', '+31612345678', 'Rotterdam'),
('demo.customer@example.com', 'Demo', 'Customer', '+31687654321', 'Den Haag');

-- Sample vehicle data
INSERT INTO vehicles (customer_id, make, model, year, license_plate, color) VALUES
((SELECT id FROM customers WHERE email = 'test.klant@example.com'), 'BMW', 'M3', 2022, 'AB-123-CD', 'Zwart'),
((SELECT id FROM customers WHERE email = 'demo.customer@example.com'), 'Audi', 'RS6', 2023, 'XY-456-ZW', 'Grijs');