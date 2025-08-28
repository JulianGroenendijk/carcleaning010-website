#!/usr/bin/env node

// CRM Upgrade Migration Script
// Adds Companies, Contact Persons, and enhanced vehicle management

const { Client } = require('pg');

const config = {
    host: 'localhost',
    port: 5432,
    database: 'carcleaning010_db', 
    user: 'postgres',
    password: 'IDPRO_S3cure!Db_2025'
};

async function runCRMUpgrade() {
    const client = new Client(config);
    
    try {
        console.log('🔗 Connecting to production database...');
        await client.connect();
        
        console.log('🏢 Starting CRM upgrade migration...');
        
        // 1. Create companies table
        console.log('📊 Creating companies table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_name VARCHAR(200) NOT NULL,
                vat_number VARCHAR(20),
                registration_number VARCHAR(30),
                industry VARCHAR(100),
                website VARCHAR(200),
                email VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                postal_code VARCHAR(10),
                city VARCHAR(100),
                country VARCHAR(50) DEFAULT 'Nederland',
                billing_address TEXT,
                billing_postal_code VARCHAR(10), 
                billing_city VARCHAR(100),
                notes TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Companies table created');

        // 2. Create contact_persons table
        console.log('📊 Creating contact_persons table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS contact_persons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                job_title VARCHAR(100),
                department VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                mobile VARCHAR(20),
                is_primary_contact BOOLEAN DEFAULT false,
                is_billing_contact BOOLEAN DEFAULT false,
                is_technical_contact BOOLEAN DEFAULT false,
                notes TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Contact persons table created');

        // 3. Add customer_type to customers table
        console.log('📊 Adding customer_type to customers table...');
        await client.query(`
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'private'
        `);
        await client.query(`
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL
        `);
        console.log('✅ Customer type and company reference added');

        // 4. Update vehicles table for better relationships
        console.log('📊 Updating vehicles table...');
        await client.query(`
            ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL
        `);
        await client.query(`
            ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
        `);
        await client.query(`
            ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS primary_driver VARCHAR(200)
        `);
        await client.query(`
            ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'car'
        `);
        console.log('✅ Vehicles table enhanced');

        // 5. Add vehicle_id to invoices if not exists
        console.log('📊 Adding vehicle reference to invoices...');
        await client.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL
        `);
        console.log('✅ Vehicle reference added to invoices');

        // 6. Add company references to quotes and invoices
        console.log('📊 Adding company references...');
        await client.query(`
            ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL
        `);
        await client.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL
        `);
        console.log('✅ Company references added');

        // 7. Create indexes for performance
        console.log('📊 Creating performance indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_companies_vat ON companies(vat_number) WHERE vat_number IS NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_persons_company ON contact_persons(company_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_persons_primary ON contact_persons(company_id, is_primary_contact) WHERE is_primary_contact = true`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id) WHERE company_id IS NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id) WHERE company_id IS NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active) WHERE is_active = true`);
        console.log('✅ Performance indexes created');

        // 8. Insert sample company data
        console.log('📊 Adding sample company data...');
        await client.query(`
            INSERT INTO companies (company_name, vat_number, email, phone, address, postal_code, city, industry)
            VALUES 
            ('AutoCare Business B.V.', 'NL123456789B01', 'contact@autocare.nl', '010-1234567', 'Bedrijfsweg 123', '3012AB', 'Rotterdam', 'Automotive Services'),
            ('Fleet Solutions Nederland', 'NL987654321B02', 'info@fleetsolutions.nl', '020-9876543', 'Industriestraat 45', '1000AA', 'Amsterdam', 'Fleet Management')
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Sample company data added');

        console.log('🎉 CRM upgrade completed successfully!');
        
        // Verify tables
        const tablesResult = await client.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t 
            WHERE table_name IN ('companies', 'contact_persons', 'customers', 'vehicles', 'quotes', 'invoices')
            ORDER BY table_name
        `);
        
        console.log('\\n📋 Database structure summary:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}: ${row.column_count} columns`);
        });
        
    } catch (error) {
        console.error('❌ CRM upgrade failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }
}

runCRMUpgrade();