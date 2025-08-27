-- Migration: Add color support for appointments
-- Date: 2025-08-27

-- Add color column to appointments table
ALTER TABLE appointments 
ADD COLUMN color VARCHAR(7) DEFAULT NULL;

-- Add index for performance
CREATE INDEX idx_appointments_color ON appointments(color);

-- Update comments
COMMENT ON COLUMN appointments.color IS 'Hex color code for appointment visualization (e.g., #ff0000)';