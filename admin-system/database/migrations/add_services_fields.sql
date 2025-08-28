-- Migrate services table to support full diensten.html content
-- Add missing fields for complete website integration

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS price_range_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_range_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS duration_text VARCHAR(200),
ADD COLUMN IF NOT EXISTS package_type VARCHAR(50), -- 'signature', 'individual', 'addon'
ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create projects table for projecten.html
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'premium', 'classic', 'daily', 'commercial'
    location VARCHAR(100),
    car_make VARCHAR(100),
    car_model VARCHAR(100),
    car_year INTEGER,
    service_type VARCHAR(255),
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    testimonial TEXT,
    customer_name VARCHAR(255),
    main_image_url VARCHAR(500),
    before_image_url VARCHAR(500),
    after_image_url VARCHAR(500),
    gallery_images JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create add-ons table for extra services
CREATE TABLE IF NOT EXISTS service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create testimonials table for separate management
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_title VARCHAR(255),
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_package_type ON services(package_type);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(active);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(active);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);