-- =====================================================
-- DATA MIGRATION: Transfer to Unified Persons Structure
-- Datum: 2025-08-28
-- Doel: Migreer bestaande data naar nieuwe persons structuur
-- =====================================================

BEGIN;

-- Disable triggers during migration to avoid conflicts
SET session_replication_role = replica;

-- =====================================================
-- STAP 1: Migreer CUSTOMERS naar PERSONS
-- =====================================================
INSERT INTO persons (
    id, email, first_name, last_name, phone, address, city, postal_code, 
    is_individual_customer, is_business_customer, is_individual_lead, is_business_lead,
    notes, created_at, updated_at
)
SELECT 
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.city,
    c.postal_code,
    
    -- Check if customer has paid invoices (customer vs lead)
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM invoices i 
            WHERE i.customer_id = c.id AND i.status = 'paid'
        ) THEN true
        ELSE false  -- No paid invoices = still a lead
    END as is_individual_customer,
    
    false as is_business_customer, -- Will be updated if they have company relationships
    
    CASE 
        WHEN NOT EXISTS(
            SELECT 1 FROM invoices i 
            WHERE i.customer_id = c.id AND i.status = 'paid'
        ) THEN true
        ELSE false
    END as is_individual_lead,
    
    false as is_business_lead,
    
    c.notes,
    c.created_at,
    c.updated_at
FROM customers c
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STAP 2: Migreer WEBSITE_LEADS naar PERSONS
-- =====================================================
INSERT INTO persons (
    id, email, first_name, last_name, phone,
    is_individual_customer, is_business_customer, is_individual_lead, is_business_lead,
    lead_source, lead_status, notes, created_at, updated_at
)
SELECT 
    wl.id,
    wl.email,
    COALESCE(wl.first_name, 'Website') as first_name,
    COALESCE(wl.last_name, 'Lead') as last_name,
    wl.phone,
    
    false as is_individual_customer,  -- Leads are not customers yet
    false as is_business_customer,
    
    -- Determine if individual or business lead based on available info
    CASE 
        WHEN wl.service_type ILIKE '%bedrijf%' OR wl.service_type ILIKE '%zakelijk%' 
             OR wl.message ILIKE '%bedrijf%' OR wl.message ILIKE '%kantoor%'
        THEN false
        ELSE true
    END as is_individual_lead,
    
    CASE 
        WHEN wl.service_type ILIKE '%bedrijf%' OR wl.service_type ILIKE '%zakelijk%' 
             OR wl.message ILIKE '%bedrijf%' OR wl.message ILIKE '%kantoor%'
        THEN true
        ELSE false
    END as is_business_lead,
    
    wl.source as lead_source,
    wl.status as lead_status,
    
    CONCAT_WS(E'\n',
        CASE WHEN wl.service_type IS NOT NULL THEN 'Service: ' || wl.service_type END,
        CASE WHEN wl.vehicle_info IS NOT NULL THEN 'Voertuig: ' || wl.vehicle_info END,
        CASE WHEN wl.message IS NOT NULL THEN 'Bericht: ' || wl.message END
    ) as notes,
    
    wl.created_at,
    wl.updated_at
FROM website_leads wl
ON CONFLICT (email) DO UPDATE SET
    -- If person already exists, update lead flags
    is_individual_lead = CASE 
        WHEN EXCLUDED.is_individual_lead THEN true 
        ELSE persons.is_individual_lead 
    END,
    is_business_lead = CASE 
        WHEN EXCLUDED.is_business_lead THEN true 
        ELSE persons.is_business_lead 
    END,
    lead_source = COALESCE(persons.lead_source, EXCLUDED.lead_source),
    notes = CASE 
        WHEN persons.notes IS NULL OR persons.notes = '' THEN EXCLUDED.notes
        ELSE persons.notes || E'\n\nWebsite Lead Info:\n' || EXCLUDED.notes
    END;

-- =====================================================
-- STAP 3: Migreer COMPANY_CONTACTS naar PERSONS + ROLES
-- =====================================================

-- Eerst: migreer contact persons
INSERT INTO persons (
    id, email, first_name, last_name, phone, mobile,
    is_individual_customer, is_business_customer, is_individual_lead, is_business_lead,
    notes, created_at, updated_at
)
SELECT 
    uuid_generate_v4() as id,  -- New ID for contacts
    cc.email,
    cc.first_name,
    cc.last_name,
    cc.phone,
    cc.mobile,
    
    false as is_individual_customer,
    false as is_business_customer,  -- Will be updated based on company invoices
    false as is_individual_lead,
    false as is_business_lead,      -- Contacts start as business leads
    
    cc.notes,
    cc.created_at,
    CURRENT_TIMESTAMP as updated_at
FROM company_contacts cc
WHERE cc.email IS NOT NULL  -- Only migrate contacts with email
ON CONFLICT (email) DO NOTHING;  -- Skip if person already exists

-- Dan: creëer person_company_roles voor alle contacts
INSERT INTO person_company_roles (
    person_id, company_id, role_type, job_title, department,
    is_primary_contact, is_billing_contact, is_technical_contact,
    notes, created_at
)
SELECT 
    p.id as person_id,
    cc.company_id,
    'contact' as role_type,
    cc.job_title,
    cc.department,
    cc.is_primary_contact,
    cc.is_billing_contact,
    cc.is_technical_contact,
    cc.notes,
    cc.created_at
FROM company_contacts cc
JOIN persons p ON p.email = cc.email  -- Match by email
WHERE cc.email IS NOT NULL
ON CONFLICT (person_id, company_id, role_type) DO NOTHING;

-- Update business customer status for contacts with company invoices
UPDATE persons SET 
    is_business_customer = true,
    is_business_lead = false
WHERE id IN (
    SELECT DISTINCT pcr.person_id 
    FROM person_company_roles pcr
    JOIN invoices i ON i.company_id = pcr.company_id
    WHERE i.status = 'paid'
);

-- =====================================================
-- STAP 4: Migreer VEHICLES naar VEHICLES_NEW
-- =====================================================
INSERT INTO vehicles_new (
    id, owner_person_id, primary_driver_id, make, model, year, color,
    license_plate, vin, vehicle_type, mileage, is_active, notes,
    created_at, updated_at
)
SELECT 
    v.id,
    v.customer_id as owner_person_id,  -- Customer is owner
    v.customer_id as primary_driver_id, -- Assume customer is also primary driver
    v.make,
    v.model,
    v.year,
    v.color,
    v.license_plate,
    v.vin,
    'car' as vehicle_type,  -- Default type
    NULL as mileage,
    true as is_active,
    v.notes,
    v.created_at,
    CURRENT_TIMESTAMP as updated_at
FROM vehicles v
WHERE v.customer_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STAP 5: Update QUOTES/APPOINTMENTS/INVOICES/CERTIFICATES
-- =====================================================

-- Update quotes to use person_id
UPDATE quotes SET 
    person_id = customer_id
WHERE customer_id IS NOT NULL AND person_id IS NULL;

-- Update appointments to use person_id  
UPDATE appointments SET 
    person_id = customer_id
WHERE customer_id IS NOT NULL AND person_id IS NULL;

-- Update invoices to use person_id
UPDATE invoices SET 
    person_id = customer_id
WHERE customer_id IS NOT NULL AND person_id IS NULL;

-- Update certificates to use person_id
UPDATE certificates SET 
    person_id = customer_id  
WHERE customer_id IS NOT NULL AND person_id IS NULL;

-- Update vehicle references in all tables
UPDATE quotes SET vehicle_id = vn.id 
FROM vehicles_new vn, vehicles v 
WHERE quotes.vehicle_id = v.id AND vn.id = v.id;

UPDATE appointments SET vehicle_id = vn.id
FROM vehicles_new vn, vehicles v  
WHERE appointments.vehicle_id = v.id AND vn.id = v.id;

UPDATE certificates SET vehicle_id = vn.id
FROM vehicles_new vn, vehicles v
WHERE certificates.vehicle_id = v.id AND vn.id = v.id;

-- =====================================================
-- STAP 6: Set first_paid_invoice_date for existing customers
-- =====================================================
UPDATE persons SET 
    first_paid_invoice_date = (
        SELECT MIN(i.paid_date) 
        FROM invoices i 
        WHERE (i.person_id = persons.id OR i.customer_id = persons.id)
          AND i.status = 'paid' 
          AND i.paid_date IS NOT NULL
    )
WHERE (is_individual_customer = true OR is_business_customer = true)
  AND first_paid_invoice_date IS NULL;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- STAP 7: Verification queries
-- =====================================================

-- Summary of migrated data
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM persons WHERE is_individual_customer = true) as individual_customers,
    (SELECT COUNT(*) FROM persons WHERE is_business_customer = true) as business_customers,  
    (SELECT COUNT(*) FROM persons WHERE is_individual_lead = true) as individual_leads,
    (SELECT COUNT(*) FROM persons WHERE is_business_lead = true) as business_leads,
    (SELECT COUNT(*) FROM person_company_roles) as company_relationships,
    (SELECT COUNT(*) FROM vehicles_new) as migrated_vehicles;

COMMIT;

-- =====================================================
-- NOTES:
-- - Run this AFTER the schema migration
-- - Backup database before running!  
-- - Test thoroughly in development first
-- - Old tables (customers, website_leads, company_contacts, vehicles) 
--   should be renamed/dropped after verification
-- =====================================================