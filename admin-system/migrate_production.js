#!/usr/bin/env node

// Production Database Migration Script
// Voor Invoice Schema Updates

const { Client } = require('pg');

const config = {
    host: 'localhost',
    port: 5432,
    database: 'carcleaning010_db', 
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'IDPRO_S3cure!Db_2025'
};

async function runMigration() {
    const client = new Client(config);
    
    try {
        console.log('🔗 Connecting to production database...');
        await client.connect();
        
        console.log('📊 Running database schema migrations...');
        
        // === INVOICE MIGRATIONS ===
        console.log('📋 Running invoice migrations...');
        
        // Add missing columns to invoices
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT`);
        console.log('✅ Added description column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0`);
        console.log('✅ Added discount_percentage column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added discount_amount column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 21`);
        console.log('✅ Added tax_percentage column');

        // === SERVICES MIGRATIONS ===
        console.log('🔧 Running services migrations...');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS price_range_min DECIMAL(10,2)`);
        console.log('✅ Added price_range_min column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS price_range_max DECIMAL(10,2)`);
        console.log('✅ Added price_range_max column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb`);
        console.log('✅ Added features column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS icon VARCHAR(100)`);
        console.log('✅ Added icon column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
        console.log('✅ Added image_url column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_text VARCHAR(200)`);
        console.log('✅ Added duration_text column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS package_type VARCHAR(50)`);
        console.log('✅ Added package_type column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255)`);
        console.log('✅ Added subtitle column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`);
        console.log('✅ Added featured column');
        
        await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
        console.log('✅ Added sort_order column');
        
        // Rename subtotal to subtotal_amount if it exists
        const checkSubtotal = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='invoices' AND column_name='subtotal'
        `);
        
        if (checkSubtotal.rows.length > 0) {
            await client.query(`ALTER TABLE invoices RENAME COLUMN subtotal TO subtotal_amount`);
            console.log('✅ Renamed subtotal to subtotal_amount');
        } else {
            console.log('ℹ️  subtotal column already renamed or doesn\'t exist');
        }
        
        // Add service_name to invoice_items
        await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_name VARCHAR(200)`);
        console.log('✅ Added service_name column to invoice_items');
        
        // Add color column to appointments
        await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL`);
        console.log('✅ Added color column to appointments');
        
        // Add index for appointment colors
        await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_color ON appointments(color)`);
        console.log('✅ Added index for appointment colors');
        
        // === ADD INDICES FOR SERVICES ===
        console.log('📑 Adding indices for services...');
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)`);
        console.log('✅ Added index for services category');
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_active ON services(active)`);
        console.log('✅ Added index for services active');
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_package_type ON services(package_type)`);
        console.log('✅ Added index for services package_type');
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_featured ON services(featured)`);
        console.log('✅ Added index for services featured');
        
        console.log('🎉 Migration completed successfully!');
        
        // Verify schema
        const invoiceSchema = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name='invoices' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Current invoices table schema:');
        invoiceSchema.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        const servicesSchema = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name='services' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n🔧 Current services table schema:');
        servicesSchema.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }
}

runMigration();