-- =====================================================
-- MIGRATION: Unified Persons Structure
-- Datum: 2025-08-28
-- Doel: Uniforme persoon/klant/lead/contact structuur
-- =====================================================

BEGIN;

-- 1. NIEUWE CENTRALE PERSONS TABEL
-- Vervangt: customers, website_leads, company_contacts
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE, -- Kan NULL zijn voor contactpersonen zonder email
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Person type flags - AUTOMATIC BASED ON BUSINESS LOGIC
    is_individual_customer BOOLEAN DEFAULT false,  -- Auto: heeft betaalde factuur als particulier
    is_business_customer BOOLEAN DEFAULT false,    -- Auto: heeft betaalde factuur via bedrijf
    is_individual_lead BOOLEAN DEFAULT false,      -- Particuliere lead/prospect (nog geen betaalde factuur)
    is_business_lead BOOLEAN DEFAULT false,        -- Zakelijke lead/prospect (nog geen betaalde factuur via bedrijf)
    
    -- Lead conversion tracking
    first_paid_invoice_date DATE,                  -- Datum eerste betaalde factuur (lead -> customer conversion)
    lead_source VARCHAR(100),                      -- website, referral, cold_call, social_media, etc.
    lead_status VARCHAR(50) DEFAULT 'new',         -- new, contacted, qualified, proposal_sent, closed_won, closed_lost
    
    -- Additional fields
    date_of_birth DATE,
    gender VARCHAR(10),
    language_preference VARCHAR(10) DEFAULT 'nl',
    marketing_consent BOOLEAN DEFAULT false,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERSON-COMPANY RELATIONSHIPS
-- Een persoon kan bij meerdere bedrijven werken/contactpersoon zijn
CREATE TABLE IF NOT EXISTS person_company_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Role binnen het bedrijf
    role_type VARCHAR(50) NOT NULL DEFAULT 'contact', -- contact, decision_maker, technical, financial
    job_title VARCHAR(255),
    department VARCHAR(255),
    
    -- Contact flags voor dit bedrijf
    is_primary_contact BOOLEAN DEFAULT false,    -- Hoofdcontactpersoon
    is_billing_contact BOOLEAN DEFAULT false,    -- Facturatiecontact
    is_technical_contact BOOLEAN DEFAULT false,  -- Technisch contact
    is_decision_maker BOOLEAN DEFAULT false,     -- Beslisser
    
    -- Periode
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL = nog actief
    is_active BOOLEAN DEFAULT true,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(person_id, company_id, role_type) -- Persoon kan niet dezelfde rol 2x hebben bij zelfde bedrijf
);

-- 3. NIEUWE VEHICLES STRUCTUUR
-- Voertuigen kunnen eigendom zijn van personen OF bedrijven
CREATE TABLE IF NOT EXISTS vehicles_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Eigendom: person OR company (niet beide)
    owner_person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    owner_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Primary driver (altijd een persoon)
    primary_driver_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    
    -- Vehicle details
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    variant VARCHAR(100), -- 320i, AMG, etc.
    year INTEGER,
    color VARCHAR(50),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vin VARCHAR(50) UNIQUE,
    
    -- Technical details
    vehicle_type VARCHAR(50) DEFAULT 'car', -- car, suv, van, truck, motorcycle, boat, other
    fuel_type VARCHAR(50), -- petrol, diesel, electric, hybrid, lpg
    engine_size VARCHAR(20),
    transmission VARCHAR(20), -- manual, automatic, cvt
    drivetrain VARCHAR(20), -- fwd, rwd, awd, 4wd
    
    -- Status & usage
    mileage INTEGER,
    purchase_date DATE,
    registration_date DATE,
    next_service_date DATE,
    insurance_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Additional info
    market_value DECIMAL(10,2),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT vehicles_owner_check CHECK (
        (owner_person_id IS NOT NULL AND owner_company_id IS NULL) OR
        (owner_person_id IS NULL AND owner_company_id IS NOT NULL)
    )
);

-- 4. VEHICLE ACCESS RIGHTS
-- Wie mag een voertuig gebruiken/boeken (naast eigenaar)
CREATE TABLE IF NOT EXISTS vehicle_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles_new(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL DEFAULT 'driver', -- driver, maintenance_contact, booking_allowed
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(vehicle_id, person_id, access_type)
);

-- 5. UPDATE BESTAANDE TABELLEN
-- Quotes, appointments, invoices etc. moeten werken met nieuwe structuur

-- Update quotes: kan naar persoon OF bedrijf
ALTER TABLE quotes 
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Update appointments: kan voor persoon OF bedrijf
ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Update invoices: kan naar persoon OF bedrijf  
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Update certificates
ALTER TABLE certificates 
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 6. INDEXES VOOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_persons_individual_customer ON persons(is_individual_customer) WHERE is_individual_customer = true;
CREATE INDEX IF NOT EXISTS idx_persons_business_customer ON persons(is_business_customer) WHERE is_business_customer = true;
CREATE INDEX IF NOT EXISTS idx_persons_individual_lead ON persons(is_individual_lead) WHERE is_individual_lead = true;
CREATE INDEX IF NOT EXISTS idx_persons_business_lead ON persons(is_business_lead) WHERE is_business_lead = true;
CREATE INDEX IF NOT EXISTS idx_persons_lead_status ON persons(lead_status);
CREATE INDEX IF NOT EXISTS idx_persons_lead_source ON persons(lead_source);

CREATE INDEX IF NOT EXISTS idx_person_company_roles_person ON person_company_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_person_company_roles_company ON person_company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_person_company_roles_active ON person_company_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_person_company_roles_primary ON person_company_roles(is_primary_contact) WHERE is_primary_contact = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_new_owner_person ON vehicles_new(owner_person_id) WHERE owner_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_new_owner_company ON vehicles_new(owner_company_id) WHERE owner_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_new_driver ON vehicles_new(primary_driver_id) WHERE primary_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_new_license ON vehicles_new(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_new_active ON vehicles_new(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vehicle_access_vehicle ON vehicle_access(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_person ON vehicle_access(person_id);

-- 7. UPDATE TRIGGERS
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_person_company_roles_updated_at BEFORE UPDATE ON person_company_roles 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_vehicles_new_updated_at BEFORE UPDATE ON vehicles_new 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 9. AUTOMATIC LEAD TO CUSTOMER CONVERSION TRIGGERS
-- Functie om person status bij te werken na betaalde factuur
CREATE OR REPLACE FUNCTION update_person_customer_status()
RETURNS TRIGGER AS $$
DECLARE
    target_person_id UUID;
    target_company_id UUID;
    first_paid_date DATE;
BEGIN
    -- Alleen uitvoeren als factuur status wijzigt naar 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        
        -- Bepaal wie de factuur ontving
        IF NEW.person_id IS NOT NULL THEN
            target_person_id := NEW.person_id;
        ELSIF NEW.customer_id IS NOT NULL THEN
            -- Backwards compatibility met oude customer_id
            target_person_id := NEW.customer_id;
        END IF;
        
        target_company_id := NEW.company_id;
        
        IF target_person_id IS NOT NULL THEN
            -- Check of dit de eerste betaalde factuur is
            SELECT MIN(i.paid_date) INTO first_paid_date
            FROM invoices i 
            WHERE (i.person_id = target_person_id OR i.customer_id = target_person_id)
              AND i.status = 'paid' 
              AND i.paid_date IS NOT NULL;
            
            -- Update person status
            UPDATE persons SET
                -- Particuliere klant conversion
                is_individual_customer = CASE 
                    WHEN target_company_id IS NULL THEN true 
                    ELSE is_individual_customer 
                END,
                is_individual_lead = CASE 
                    WHEN target_company_id IS NULL THEN false 
                    ELSE is_individual_lead 
                END,
                
                -- Zakelijke klant conversion (als factuur via bedrijf)
                is_business_customer = CASE 
                    WHEN target_company_id IS NOT NULL THEN true 
                    ELSE is_business_customer 
                END,
                is_business_lead = CASE 
                    WHEN target_company_id IS NOT NULL THEN false 
                    ELSE is_business_lead 
                END,
                
                -- Conversion tracking
                first_paid_invoice_date = CASE 
                    WHEN first_paid_invoice_date IS NULL THEN NEW.paid_date 
                    ELSE first_paid_invoice_date 
                END,
                lead_status = CASE 
                    WHEN lead_status IN ('new', 'contacted', 'qualified', 'proposal_sent') THEN 'closed_won'
                    ELSE lead_status 
                END,
                
                updated_at = CURRENT_TIMESTAMP
            WHERE id = target_person_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger op invoices tabel
CREATE TRIGGER trigger_update_person_customer_status
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_person_customer_status();

-- Functie voor handmatige lead naar klant conversie
CREATE OR REPLACE FUNCTION convert_lead_to_customer(
    p_person_id UUID,
    p_conversion_type VARCHAR(20) DEFAULT 'individual', -- 'individual' of 'business'
    p_company_id UUID DEFAULT NULL,
    p_conversion_reason TEXT DEFAULT 'Handmatige conversie'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Valideer input
    IF p_person_id IS NULL THEN
        RAISE EXCEPTION 'Person ID is required';
    END IF;
    
    IF p_conversion_type = 'business' AND p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required for business conversion';
    END IF;
    
    -- Update person status
    UPDATE persons SET
        -- Particuliere conversie
        is_individual_customer = CASE 
            WHEN p_conversion_type = 'individual' THEN true 
            ELSE is_individual_customer 
        END,
        is_individual_lead = CASE 
            WHEN p_conversion_type = 'individual' THEN false 
            ELSE is_individual_lead 
        END,
        
        -- Zakelijke conversie
        is_business_customer = CASE 
            WHEN p_conversion_type = 'business' THEN true 
            ELSE is_business_customer 
        END,
        is_business_lead = CASE 
            WHEN p_conversion_type = 'business' THEN false 
            ELSE is_business_lead 
        END,
        
        -- Conversion tracking (alleen als nog geen datum)
        first_paid_invoice_date = CASE 
            WHEN first_paid_invoice_date IS NULL THEN CURRENT_DATE 
            ELSE first_paid_invoice_date 
        END,
        lead_status = 'closed_won',
        notes = COALESCE(notes, '') || 
                CASE 
                    WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n'
                    ELSE ''
                END ||
                '[' || CURRENT_DATE || '] ' || p_conversion_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_person_id;
    
    -- Als zakelijke conversie, zorg voor company relationship
    IF p_conversion_type = 'business' AND p_company_id IS NOT NULL THEN
        INSERT INTO person_company_roles (
            person_id, 
            company_id, 
            role_type,
            is_primary_contact,
            notes
        ) VALUES (
            p_person_id,
            p_company_id,
            'contact',
            false,
            'Automatisch aangemaakt bij lead conversie'
        )
        ON CONFLICT (person_id, company_id, role_type) DO NOTHING;
    END IF;
    
    RETURN true;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fout bij lead conversie: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Functie voor bulk lead conversie
CREATE OR REPLACE FUNCTION bulk_convert_leads_to_customers(
    p_person_ids UUID[],
    p_conversion_type VARCHAR(20) DEFAULT 'individual',
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    person_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    person_id UUID;
BEGIN
    -- Loop door alle person IDs
    FOREACH person_id IN ARRAY p_person_ids
    LOOP
        BEGIN
            -- Probeer conversie
            PERFORM convert_lead_to_customer(person_id, p_conversion_type, p_company_id, 'Bulk conversie');
            
            -- Return success
            RETURN QUERY SELECT person_id, true, NULL::TEXT;
            
        EXCEPTION 
            WHEN OTHERS THEN
                -- Return error
                RETURN QUERY SELECT person_id, false, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. VIEWS VOOR BACKWARDS COMPATIBILITY
-- Zodat bestaande code blijft werken tijdens transitie

CREATE VIEW customers_view AS
SELECT 
    id,
    email,
    first_name,
    last_name,
    phone,
    address,
    city,
    postal_code,
    notes,
    created_at,
    updated_at
FROM persons 
WHERE is_individual_customer = true;

CREATE VIEW company_contacts_view AS
SELECT 
    pcr.id,
    pcr.company_id,
    p.id as person_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.mobile,
    pcr.job_title,
    pcr.department,
    pcr.is_primary_contact,
    pcr.is_billing_contact,
    pcr.is_technical_contact,
    pcr.notes,
    pcr.created_at
FROM person_company_roles pcr
JOIN persons p ON p.id = pcr.person_id
WHERE pcr.is_active = true;

COMMIT;

-- =====================================================
-- NOTES VOOR MIGRATIE:
-- 
-- 1. Data Migration Script nodig om:
--    - customers -> persons (is_individual_customer = true)
--    - website_leads -> persons (is_lead = true) 
--    - company_contacts -> persons + person_company_roles
--    - vehicles -> vehicles_new
--
-- 2. API Updates nodig voor:
--    - Unified person management
--    - Vehicle ownership assignment
--    - Company relationship management
--
-- 3. UI Updates nodig voor:
--    - Combined person/customer/contact interface
--    - Vehicle assignment to persons/companies
--    - Role management per company
--    - Lead management met automatic customer conversion
--
-- 4. BUSINESS LOGIC:
--    - Lead blijft lead tot eerste betaalde factuur
--    - Lead -> Customer conversion is automatisch via trigger
--    - Persoon kan tegelijk particuliere EN zakelijke klant/lead zijn
--    - Voertuigen kunnen eigendom zijn van personen OF bedrijven
--    - Contactpersonen bij bedrijven kunnen eigen voertuigen hebben
-- =====================================================