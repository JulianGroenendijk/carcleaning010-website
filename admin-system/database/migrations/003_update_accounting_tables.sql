-- Update accounting tables to match API expectations
-- Migration 003: Update accounting tables

BEGIN;

-- Update suppliers table
ALTER TABLE suppliers 
  RENAME COLUMN btw_number TO vat_number;

ALTER TABLE suppliers 
  RENAME COLUMN status TO active;

-- Update the active column to be boolean instead of varchar
ALTER TABLE suppliers 
  ALTER COLUMN active TYPE BOOLEAN USING (active = 'active');

-- Set default value for active column
ALTER TABLE suppliers 
  ALTER COLUMN active SET DEFAULT true;

-- Add country column
ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nederland';

-- Update expenses table
ALTER TABLE expenses 
  RENAME COLUMN btw_amount TO vat_amount;

ALTER TABLE expenses 
  RENAME COLUMN expense_number TO receipt_number;

-- Remove total_amount column (calculated field)
ALTER TABLE expenses 
  DROP COLUMN IF EXISTS total_amount;

-- Add invoice_date column and rename expense_date for consistency
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Update status values to match API
UPDATE expenses SET status = 'pending' WHERE status IN ('pending', 'unpaid');
UPDATE expenses SET status = 'approved' WHERE status IN ('paid', 'approved');

-- Drop and recreate the receipt_number column without UNIQUE constraint
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_expense_number_key;

ALTER TABLE expenses 
  ALTER COLUMN receipt_number DROP NOT NULL;

-- Update invoice table to have consistent naming
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;

-- Copy data from created_at to invoice_date if empty
UPDATE invoices 
SET invoice_date = created_at::DATE 
WHERE invoice_date IS NULL;

-- Rename tax_amount to vat_amount for consistency
ALTER TABLE invoices 
  RENAME COLUMN tax_amount TO vat_amount;

-- Add subtotal_amount column if it doesn't exist (should be subtotal)
ALTER TABLE invoices 
  RENAME COLUMN subtotal TO subtotal_amount;

-- Update invoice_items table for consistency
ALTER TABLE invoice_items 
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- Add missing columns to invoice_items based on validation requirements
UPDATE invoice_items 
SET service_name = s.name 
FROM services s 
WHERE invoice_items.service_id = s.id AND invoice_items.service_name IS NULL;

-- Create invoice view for easier querying
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.*,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    COUNT(ii.id) AS item_count
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, c.first_name, c.last_name, c.email, c.phone;

COMMIT;