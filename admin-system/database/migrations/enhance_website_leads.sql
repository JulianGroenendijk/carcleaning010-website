-- Enhance website_leads table for better customer detection and data storage
-- Add customer_id reference and improve data structure

-- Add customer_id reference to link leads to existing customers
ALTER TABLE website_leads 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Improve status enum to include existing_customer status
-- Note: PostgreSQL doesn't allow adding to enum easily, so we use CHECK constraint instead
ALTER TABLE website_leads 
DROP CONSTRAINT IF EXISTS website_leads_status_check;

ALTER TABLE website_leads 
ADD CONSTRAINT website_leads_status_check 
CHECK (status IN ('new', 'contacted', 'converted', 'closed', 'existing_customer'));

-- Add additional fields for better data capture from both form types
ALTER TABLE website_leads
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS service_location VARCHAR(100), -- 'home', 'work', 'other'
ADD COLUMN IF NOT EXISTS preferred_date DATE,
ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(50), -- 'morning', 'afternoon', 'evening'
ADD COLUMN IF NOT EXISTS services_requested JSONB DEFAULT '[]'::jsonb; -- Array of requested services

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_website_leads_customer_id ON website_leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_email ON website_leads(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_website_leads_status ON website_leads(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_city ON website_leads(city);
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at ON website_leads(created_at);

-- Add index for phone number matching (remove spaces and dashes)
CREATE INDEX IF NOT EXISTS idx_website_leads_phone_clean 
ON website_leads(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''));

-- Update existing records to set proper status
UPDATE website_leads 
SET status = 'new' 
WHERE status IS NULL OR status = '';

-- Comment for tracking
COMMENT ON COLUMN website_leads.customer_id IS 'Reference to existing customer if lead matches existing customer data';
COMMENT ON COLUMN website_leads.services_requested IS 'Array of requested services from form checkboxes';
COMMENT ON COLUMN website_leads.service_location IS 'Where service should be performed: home, work, or other location';